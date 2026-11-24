import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StockEntryEntity } from '../entities/stock-entry.entity';
import { FacturacionAdapter } from '../../infrastructure/adapters/facturacion.adapter';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** "F002-00014645" o ("F002", "14645") → "F002-14645" */
export const invoiceKey = (ruc: string, serie: string, num?: string | number) => {
  let s = serie; let n = num;
  if (n === undefined) { [s, n] = String(serie).split('-'); }
  return `${String(ruc).trim()}|${String(s || '').trim().toUpperCase()}-${/^\d+$/.test(String(n).trim()) ? Number(n) : String(n).trim().toUpperCase()}`;
};

/**
 * Registro de Compras de SUNAT (SIRE): lo que tus proveedores declararon a tu nombre,
 * cruzado con las facturas cargadas en "Ingreso por factura". Solo lee.
 */
@Injectable()
export class SireService {
  constructor(
    @InjectRepository(StockEntryEntity) private readonly entryRepo: Repository<StockEntryEntity>,
    private readonly facturacion: FacturacionAdapter,
  ) {}

  private checkPeriod(periodo: string) {
    if (!/^20\d{2}(0[1-9]|1[0-2])$/.test(periodo)) throw new BadRequestException('Periodo inválido (AAAAMM)');
  }

  /** Mensaje claro cuando SIRE no está activado en APISUNAT */
  private sireError(e: any) {
    const d = e?.response?.data;
    if (d?.codigo_error === 'sire_no_activado') {
      return { enabled: false, message: 'SIRE no está activado. Actívalo en el panel de APISUNAT con tu usuario SOL y las credenciales de la app SIRE.' };
    }
    throw new BadRequestException(d?.mensaje || d?.message || e?.message || 'No se pudo consultar SIRE');
  }

  /** Activa SIRE en APISUNAT con las credenciales de API SUNAT que la empresa ya tiene (las de las guías) */
  async activate() {
    try {
      const res: any = await this.facturacion.once('post', '/sire/activar', {});
      const d = res?.datos ?? res;
      return { enabled: true, message: d?.mensaje || 'SIRE activado' };
    } catch (e: any) {
      const d = e?.response?.data;
      const detail = [d?.mensaje || d?.message, d?.errores?.sunat_code ? `(código SUNAT ${d.errores.sunat_code})` : ''].filter(Boolean).join(' ');
      throw new BadRequestException(`SUNAT no aceptó la activación: ${detail || e?.message || 'error desconocido'}`);
    }
  }

  /** Pide a SUNAT la propuesta del periodo (SUNAT la prepara en unos minutos) */
  async request(periodo: string) {
    this.checkPeriod(periodo);
    try {
      const res: any = await this.facturacion.once('get', `/sire/rce/${periodo}/propuesta`);
      const d = res?.datos ?? res;
      return { enabled: true, ticket: d?.num_ticket ?? null, message: 'Pedido enviado a SUNAT. En unos minutos puedes comparar.' };
    } catch (e: any) {
      return this.sireError(e);
    }
  }

  async tickets(periodo: string) {
    this.checkPeriod(periodo);
    try {
      const res: any = await this.facturacion.once('get', `/sire/tickets?per_tributario=${periodo}`);
      const page = res?.datos ?? res;
      return { enabled: true, tickets: (page?.data ?? []).slice(0, 5) };
    } catch (e: any) {
      return this.sireError(e);
    }
  }

  async compare(periodo: string) {
    this.checkPeriod(periodo);
    const sunat: any[] = [];
    try {
      for (let page = 1; page <= 20; page++) {
        const res: any = await this.facturacion.once('get', `/sire/rce/${periodo}/comprobantes?page=${page}`);
        const pag = (res?.datos ?? res)?.comprobantes;
        sunat.push(...(pag?.data ?? []));
        if (!pag || page >= Number(pag.last_page || 1)) break;
      }
    } catch (e: any) {
      return this.sireError(e);
    }

    const year = Number(periodo.slice(0, 4));
    const month = Number(periodo.slice(4, 6));
    const from = `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}-01`;
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const local = await this.entryRepo.find({ where: { invoiceDate: Between(from, to) as any }, order: { invoiceDate: 'ASC' } });

    const localByKey = new Map(local.map((e) => [invoiceKey(e.supplierRuc, e.invoiceNumber), e]));
    const sunatKeys = new Set<string>();
    const missing: any[] = [];
    const matched: any[] = [];
    for (const c of sunat) {
      const key = invoiceKey(c.num_doc_proveedor, c.num_serie_cdp, c.num_cdp);
      sunatKeys.add(key);
      const row = {
        ruc: c.num_doc_proveedor, supplier: c.razon_social_proveedor, number: `${c.num_serie_cdp}-${/^\d+$/.test(String(c.num_cdp)) ? Number(c.num_cdp) : c.num_cdp}`,
        date: String(c.fec_emision || '').slice(0, 10), type: c.cod_tipo_cdp, total: round2(Number(c.mto_total || 0)),
      };
      const mine = localByKey.get(key);
      if (mine) matched.push({ ...row, loadedTotal: Number(mine.total), entryId: mine.id, diff: round2(row.total - Number(mine.total)) });
      // Notas y otros documentos no se cargan como factura de compra
      else if (String(c.cod_tipo_cdp) === '01') missing.push(row);
    }
    const onlyLocal = local
      .filter((e) => !sunatKeys.has(invoiceKey(e.supplierRuc, e.invoiceNumber)))
      .map((e) => ({ ruc: e.supplierRuc, supplier: e.supplierName, number: e.invoiceNumber, date: e.invoiceDate, total: Number(e.total), entryId: e.id }));

    return {
      enabled: true,
      periodo,
      sunatCount: sunat.length,
      totals: {
        sunat: round2(sunat.reduce((s, c) => s + Number(c.mto_total || 0), 0)),
        loaded: round2(local.reduce((s, e) => s + Number(e.total || 0), 0)),
      },
      matched, missing, onlyLocal,
    };
  }
}
