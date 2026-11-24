import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Acciones que se registran. Las rutas que no están aquí solo leen o son consultas auxiliares. */
export const AUDITED: Record<string, string> = {
  'POST auth/login': 'Inició sesión',
  'POST caja/abrir': 'Abrió caja', 'POST caja/movimiento': 'Registró movimiento de caja', 'POST caja/cerrar': 'Cerró caja',
  'POST categories': 'Creó categoría', 'PUT categories/:id': 'Editó categoría', 'DELETE categories/:id': 'Desactivó categoría',
  'POST customers': 'Creó cliente', 'PUT customers/:id': 'Editó cliente', 'DELETE customers/:id': 'Desactivó cliente',
  'POST products': 'Creó producto', 'PUT products/:id': 'Editó producto', 'DELETE products/:id': 'Desactivó producto',
  'POST products/excel/import': 'Importó productos desde Excel',
  'PATCH products/:id/stock/add': 'Aumentó stock', 'PATCH products/:id/stock/subtract': 'Redujo stock',
  'POST suppliers': 'Creó proveedor', 'PUT suppliers/:id': 'Editó proveedor', 'DELETE suppliers/:id': 'Desactivó proveedor',
  'POST purchase-orders': 'Creó orden de compra', 'PATCH purchase-orders/:id/receive': 'Recibió orden de compra',
  'PATCH purchase-orders/:id/cancel': 'Canceló orden de compra', 'POST stock-entries': 'Ingresó factura de compra',
  'POST quotes': 'Creó cotización', 'PUT quotes/:id': 'Editó cotización', 'PATCH quotes/:id/status': 'Cambió estado de cotización',
  'POST sales': 'Registró venta', 'PATCH sales/:id/void': 'Anuló venta', 'POST sales/credit-note': 'Emitió nota de crédito',
  'POST sales/:id/resend-sunat': 'Reenvió comprobante a SUNAT',
  'POST sunat-docs/sales/:id/void': 'Dio de baja factura en SUNAT', 'POST sunat-docs/sales/:id/debit-note': 'Emitió nota de débito',
  'POST guias-remision': 'Emitió guía de remisión', 'POST guias-remision/:id/resend-sunat': 'Reenvió guía a SUNAT',
  'POST receivables/:id/payments': 'Registró cobro',
  'POST users': 'Creó usuario', 'PUT users/:id': 'Editó usuario', 'DELETE users/:id': 'Desactivó usuario',
  'POST profiles': 'Creó perfil', 'PUT profiles/:id': 'Editó perfil', 'DELETE profiles/:id': 'Eliminó perfil',
  'GET backup': 'Descargó copia de seguridad',
};

/** Prefijos administrativos: cualquier cambio se registra aunque no tenga nombre propio */
const ADMIN_PREFIX: Record<string, string> = { 'company-settings': 'Cambió datos de la empresa', establishments: 'Cambió establecimientos', users: 'Cambió usuarios' };

export function actionOf(route: string): string | null {
  if (AUDITED[route]) return AUDITED[route];
  const [method, path = ''] = route.split(' ');
  return method === 'GET' ? null : ADMIN_PREFIX[path.split('/')[0]] ?? null;
}

const SECRET = /pass|clave|pin$|secret|apikey|api_key|token|certificad|credential/i;

/** Solo datos simples y sin secretos */
export function cleanDetail(body: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body ?? {})) {
    if (SECRET.test(k) || v === undefined) continue;
    if (Array.isArray(v)) out[k] = `${v.length} elementos`;
    else if (v === null || ['number', 'boolean'].includes(typeof v)) out[k] = v;
    else if (typeof v === 'string') out[k] = v.length > 150 ? `${v.slice(0, 150)}…` : v;
  }
  return out;
}

/** Tablas donde interesa el antes y el después (nombres fijos, nunca del usuario) */
const TRACKED: Record<string, { table: string; fields: string[] }> = {
  products: { table: 'products', fields: ['name', 'sale_price', 'cost_price', 'stock_quantity', 'min_stock_level', 'is_active'] },
  customers: { table: 'customers', fields: ['name', 'nit', 'phone', 'is_active'] },
  suppliers: { table: 'suppliers', fields: ['name', 'nit', 'is_active'] },
  users: { table: 'users', fields: ['name', 'email', 'role', 'is_active', 'establishment_id'] },
  sales: { table: 'sales', fields: ['invoice_number', 'total_amount', 'status', 'sunat_status'] },
  receivables: { table: 'receivables', fields: ['total', 'status'] },
  quotes: { table: 'quotes', fields: ['status', 'total'] },
};

export interface AuditEntry {
  userId: number | null; userName: string | null; route: string; target: string | null; ok: boolean; detail: any; ip: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private columns = new Map<string, string[]>();

  constructor(private readonly ds: DataSource) {}

  /** Estado actual del registro; nunca lanza error */
  async snapshot(route: string, id: string | undefined): Promise<Record<string, unknown> | null> {
    const t = TRACKED[route.split(' ')[1]?.split('/')[0] ?? ''] ?? (route.startsWith('POST sunat-docs/sales') ? TRACKED.sales : undefined);
    if (!t || !/^\d+$/.test(id ?? '')) return null;
    try {
      if (!this.columns.has(t.table)) {
        const cols = await this.ds.query('SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [t.table]);
        this.columns.set(t.table, t.fields.filter((f) => cols.some((x: any) => x.c === f)));
      }
      const fields = this.columns.get(t.table)!;
      if (!fields.length) return null;
      const [row] = await this.ds.query(`SELECT ${fields.map((f) => `\`${f}\``).join(',')} FROM \`${t.table}\` WHERE id = ?`, [id]);
      return row ?? null;
    } catch { return null; }
  }

  static diff(before: any, after: any): Record<string, [unknown, unknown]> {
    const out: Record<string, [unknown, unknown]> = {};
    for (const k of Object.keys(before ?? {})) {
      if (after && String(before[k]) !== String(after[k])) out[k] = [before[k], after[k]];
    }
    return out;
  }

  /** Nunca interrumpe la operación del usuario */
  async write(e: AuditEntry): Promise<void> {
    try {
      const detail = e.detail && Object.keys(e.detail).length ? JSON.stringify(e.detail).slice(0, 8000) : null;
      await this.ds.query(
        `INSERT INTO audit_log (created_at, user_id, user_name, route, action, target, ok, detail, ip)
         VALUES (UTC_TIMESTAMP(3), ?, COALESCE(?, (SELECT name FROM users WHERE id = ?)), ?, ?, ?, ?, ?, ?)`,
        [e.userId, e.userName, e.userId, e.route.slice(0, 120), actionOf(e.route) ?? e.route.slice(0, 120), e.target?.slice(0, 60) ?? null, e.ok ? 1 : 0, detail, e.ip?.slice(0, 64) ?? null],
      );
    } catch (err: any) {
      this.logger.warn(`No se registró "${e.route}" en el historial: ${err?.message}`);
    }
  }

  async list(f: { page?: number; limit?: number; userId?: number; from?: string; to?: string; q?: string }) {
    const limit = Math.min(Math.max(f.limit || 30, 1), 100);
    const page = Math.max(f.page || 1, 1);
    const where: string[] = []; const p: any[] = [];
    const utc = (ymd: string, add = 0) => {
      const d = new Date(`${ymd}T00:00:00-05:00`);
      if (isNaN(+d)) throw new BadRequestException('Fecha inválida');
      d.setUTCDate(d.getUTCDate() + add);
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };
    if (f.userId) { where.push('user_id = ?'); p.push(f.userId); }
    if (f.from) { where.push('created_at >= ?'); p.push(utc(f.from)); }
    if (f.to) { where.push('created_at < ?'); p.push(utc(f.to, 1)); }
    if (f.q?.trim()) { where.push('(action LIKE ? OR target LIKE ? OR detail LIKE ?)'); p.push(...Array(3).fill(`%${f.q.trim()}%`)); }
    const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [{ total }] = await this.ds.query(`SELECT COUNT(*) AS total FROM audit_log ${sql}`, p);
    const rows = await this.ds.query(
      `SELECT id, DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS createdAt, user_id AS userId, user_name AS userName, action, target, ok, detail, ip
       FROM audit_log ${sql} ORDER BY id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, p);
    return { total: Number(total), data: rows.map((r: any) => ({ ...r, ok: !!Number(r.ok), detail: r.detail ? this.parse(r.detail) : null })) };
  }

  async lastBackup(): Promise<string | null> {
    const [r] = await this.ds.query(`SELECT DATE_FORMAT(MAX(created_at), '%Y-%m-%dT%H:%i:%sZ') AS at FROM audit_log WHERE route = 'GET backup' AND ok = 1`);
    return r?.at ?? null;
  }

  private parse(s: string) { try { return JSON.parse(s); } catch { return { detalle: s }; } }
}
