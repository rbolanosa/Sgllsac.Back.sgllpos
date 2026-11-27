import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { SaleEntity, SaleStatus, DocumentType } from '../entities/sale.entity';
import { SaleItemEntity } from '../entities/sale-item.entity';
import { ProductEntity } from '../entities/product.entity';
import { InventoryMovementEntity, MovementType, MovementReferenceType } from '../entities/inventory-movement.entity';
import { SunatVoidEntity } from '../entities/sunat-void.entity';
import { ReceivableEntity, ReceivableInstallmentEntity } from '../entities/receivable.entity';
import { FacturacionAdapter } from '../../infrastructure/adapters/facturacion.adapter';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const limaYmd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Catálogo 10 SUNAT: motivos de nota de débito que usa una tienda */
export const DEBIT_REASONS: Record<string, string> = {
  '01': 'Intereses por mora',
  '02': 'Aumento en el valor',
  '03': 'Penalidades / otros conceptos',
};

/** Días que SUNAT permite para la comunicación de baja de una factura */
export const VOID_MAX_DAYS = 7;

/** Código SUNAT de cada comprobante que se puede consultar */
export const CPE_CODES: Partial<Record<DocumentType, string>> = {
  [DocumentType.FACTURA]: '01', [DocumentType.BOLETA]: '03', [DocumentType.NOTA_CREDITO]: '07', [DocumentType.NOTA_DEBITO]: '08',
};

export function daysSince(issueYmd: string, todayYmd: string): number {
  return Math.round((+new Date(`${todayYmd}T12:00:00Z`) - +new Date(`${issueYmd}T12:00:00Z`)) / 86400000);
}

/**
 * Comprobantes que se suman a los que ya emite el sistema:
 * comunicación de baja (anular factura ante SUNAT) y notas de débito.
 * No modifica ventas, boletas, facturas ni notas de crédito existentes.
 */
@Injectable()
export class SunatDocsService {
  private readonly logger = new Logger(SunatDocsService.name);

  constructor(
    @InjectRepository(SaleEntity) private readonly saleRepo: Repository<SaleEntity>,
    @InjectRepository(SunatVoidEntity) private readonly voidRepo: Repository<SunatVoidEntity>,
    private readonly dataSource: DataSource,
    private readonly facturacion: FacturacionAdapter,
  ) {}

  private unwrap(res: any) {
    return res?.datos ?? res?.data ?? res;
  }

  private apiError(e: any, fallback: string) {
    const d = e?.response?.data;
    const errores = d?.errores ? Object.values(d.errores).flat().join(' ') : '';
    return [d?.mensaje || d?.message, errores].filter(Boolean).join(' — ') || e?.message || fallback;
  }

  // ── Comunicación de baja ──────────────────────────────────────────────────

  /** Revisa si una factura se puede dar de baja hoy (para mostrar u ocultar el botón) */
  async voidCheck(saleId: number) {
    const sale = await this.saleRepo.findOne({ where: { id: saleId } });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    const last = await this.voidRepo.findOne({ where: { saleId }, order: { id: 'DESC' } });
    const days = daysSince(limaYmd(new Date(sale.saleDate)), limaYmd(new Date()));
    let reason: string | null = null;
    const kind = sale.documentType === DocumentType.BOLETA ? 'la boleta' : 'la factura';
    if (sale.documentType !== DocumentType.FACTURA && sale.documentType !== DocumentType.BOLETA) reason = 'Solo las facturas y boletas se anulan ante SUNAT';
    else if (sale.status !== SaleStatus.COMPLETED) reason = 'La venta ya está anulada';
    else if (String(sale.sunatStatus || '').toUpperCase() !== 'ACEPTADO') reason = `SUNAT todavía no acepta ${kind}`;
    else if (days > VOID_MAX_DAYS) reason = `Pasaron ${days} días: SUNAT solo permite anular hasta ${VOID_MAX_DAYS} días después. Usa nota de crédito`;
    else if (last && last.status !== 'RECHAZADO') reason = `Ya se pidió la baja de ${kind}`;
    return { allowed: !reason, reason, daysLeft: Math.max(0, VOID_MAX_DAYS - days), last: last ? this.voidView(last) : null };
  }

  private voidView(v: SunatVoidEntity) {
    return { id: v.id, status: v.status, reason: v.reason, identifier: v.identifier, message: v.message, createdAt: v.createdAt };
  }

  async requestVoid(saleId: number, reason: string, userId?: number) {
    const check = await this.voidCheck(saleId);
    if (!check.allowed) throw new BadRequestException(check.reason);
    const sale = (await this.saleRepo.findOne({ where: { id: saleId } }))!;
    const [serie, corr] = sale.invoiceNumber.split('-');
    const today = limaYmd(new Date());

    let res: any;
    try {
      if (sale.documentType === DocumentType.BOLETA) {
        // Las boletas se anulan con un resumen diario (RC) de la fecha en que se emitieron
        const found: any = await this.facturacion.once('get', `/boletas?serie=${encodeURIComponent(serie)}&correlativo=${Number(corr)}&por_pagina=5`);
        const boleta = (this.unwrap(found)?.datos ?? []).find((b: any) => b.serie === serie && Number(b.correlativo) === Number(corr));
        if (!boleta?.id) throw new BadRequestException('No se encontró la boleta en APISUNAT');
        res = await this.facturacion.once('post', '/resumenes', {
          fecha_resumen: limaYmd(new Date(sale.saleDate)),
          anular: [{ id: boleta.id, motivo: reason.trim().slice(0, 255) }],
        });
      } else {
        res = await this.facturacion.post<any>('/anulaciones', {
          fecha_generacion: limaYmd(new Date(sale.saleDate)),
          fecha_comunicacion: today,
          detalles: [{ tipo_documento: '01', serie, correlativo: String(Number(corr)), motivo: reason.trim().slice(0, 255) }],
        });
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(`SUNAT/APISUNAT no aceptó la baja: ${this.apiError(e, 'error al enviar')}`);
    }
    const d = this.unwrap(res);
    const v = await this.voidRepo.save(this.voidRepo.create({
      saleId, apisunatId: d?.id_anulacion ?? d?.id_resumen ?? null, identifier: d?.identifier ?? null,
      reason: reason.trim().slice(0, 255), status: 'PENDIENTE',
      message: 'Baja enviada a SUNAT. Se confirma en unos minutos.', createdBy: userId ?? null,
    }));
    // SUNAT suele responder en segundos: se consulta de una vez
    await this.refreshVoid(v.id).catch(() => null);
    return this.voidView((await this.voidRepo.findOne({ where: { id: v.id } }))!);
  }

  /** Consulta el estado de la baja; si SUNAT la aceptó, anula la venta y devuelve el stock */
  async refreshVoid(voidId: number) {
    const v = await this.voidRepo.findOne({ where: { id: voidId } });
    if (!v) throw new NotFoundException('Comunicación de baja no encontrada');
    if (v.status !== 'PENDIENTE' || !v.apisunatId) return this.voidView(v);

    // RC = resumen diario (boletas); RA = comunicación de baja (facturas)
    const path = String(v.identifier || '').startsWith('RC-') ? 'resumenes' : 'anulaciones';
    const res: any = await this.facturacion.get(`/${path}/${v.apisunatId}/estado`);
    const d = this.unwrap(res);
    const estado = String(d?.estado_sunat || '').toLowerCase();
    if (estado === 'aceptado') {
      await this.applyAcceptedVoid(v, d?.descripcion_sunat);
    } else if (estado === 'rechazado') {
      await this.voidRepo.update(v.id, { status: 'RECHAZADO', message: d?.descripcion_sunat || 'SUNAT rechazó la baja' });
    }
    return this.voidView((await this.voidRepo.findOne({ where: { id: v.id } }))!);
  }

  /** Revisa las bajas pendientes (se llama al abrir Comprobantes) */
  async refreshPendingVoids() {
    const pending = await this.voidRepo.find({ where: { status: 'PENDIENTE' }, take: 10, order: { id: 'ASC' } });
    for (const v of pending) {
      try { await this.refreshVoid(v.id); } catch (e: any) { this.logger.warn(`Baja #${v.id}: ${e?.message}`); }
    }
    return { checked: pending.length };
  }

  private async applyAcceptedVoid(v: SunatVoidEntity, description?: string) {
    await this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(SaleEntity, { where: { id: v.saleId }, relations: { items: true }, lock: { mode: 'pessimistic_write' } });
      if (sale && sale.status === SaleStatus.COMPLETED) {
        for (const item of sale.items) {
          if (!item.productId) continue;
          const units = Number(item.unitsDeducted ?? item.quantity);
          await manager.createQueryBuilder().update(ProductEntity)
            .set({ stockQuantity: () => `stock_quantity + ${units}` })
            .where('id = :id', { id: item.productId }).execute();
          await manager.save(manager.create(InventoryMovementEntity, {
            productId: item.productId, movementType: MovementType.IN, quantity: units,
            referenceType: MovementReferenceType.SALE,
            notes: `Baja SUNAT ${v.identifier ?? ''} de ${sale.invoiceNumber}: ${v.reason}`,
          }));
        }
        await manager.update(SaleEntity, sale.id, {
          status: SaleStatus.VOIDED,
          sunatStatus: 'ANULADO',
          sunatMessage: `Comunicación de baja aceptada${v.identifier ? ` (${v.identifier})` : ''}`,
          notes: `VOIDED (baja SUNAT): ${v.reason}${sale.notes ? ` | ${sale.notes}` : ''}`,
        });
        await manager.update(ReceivableEntity, { saleId: sale.id }, { status: 'ANULADA' });
      }
      await manager.update(SunatVoidEntity, v.id, { status: 'ACEPTADO', message: description || 'Baja aceptada por SUNAT' });
    });
  }

  async listVoids(saleIds: number[]) {
    if (!saleIds.length) return [];
    const rows = await this.voidRepo.find({ where: { saleId: In(saleIds) }, order: { id: 'DESC' } });
    const latest = new Map<number, SunatVoidEntity>();
    rows.forEach((r) => { if (!latest.has(r.saleId)) latest.set(r.saleId, r); });
    return [...latest.values()].map((v) => ({ saleId: v.saleId, ...this.voidView(v) }));
  }

  // ── Estado real en SUNAT ──────────────────────────────────────────────────

  /**
   * Pregunta a SUNAT (Consulta Integrada) por el comprobante. Solo corrige el estado si SUNAT
   * confirma que está aceptado; si dice anulado o inexistente, solo informa: no toca stock ni ventas.
   */
  async checkInSunat(saleId: number) {
    const sale = await this.saleRepo.findOne({ where: { id: saleId } });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    const code = CPE_CODES[sale.documentType];
    if (!code) throw new BadRequestException('Las notas de venta no se envían a SUNAT');
    const [serie, corr] = (sale.dteNumber || sale.invoiceNumber).split('-');
    if (!/^[A-Z0-9]{4}$/.test(serie || '') || !/^\d+$/.test(corr || '')) throw new BadRequestException('El comprobante todavía no tiene número de SUNAT');
    const [y, m, d] = limaYmd(new Date(sale.saleDate)).split('-');
    const params = new URLSearchParams({
      tipo_doc: code, serie, correlativo: String(Number(corr)), fecha_emision: `${d}/${m}/${y}`,
      monto: round2(Number(sale.totalAmount)).toFixed(2),
    });
    let r: any;
    try {
      r = this.unwrap(await this.facturacion.once('get', `/consultar-cpe?${params}`));
    } catch (e: any) {
      const msg = this.apiError(e, 'sin respuesta');
      if (/client_id|client_secret|credenciales|autoriz/i.test(msg)) {
        throw new BadRequestException(`SUNAT no autorizó la consulta con las credenciales de API SUNAT de tu empresa (${msg}). En Clave SOL → Empresas → Credenciales de API SUNAT, revisa que tu aplicación tenga permiso para consultar comprobantes.`);
      }
      throw new BadRequestException(`SUNAT no respondió la consulta: ${msg}`);
    }
    if (!r?.encontrado) return { sunat: 'NO EXISTE', changed: false, message: r?.mensaje || 'SUNAT no tiene registrado este comprobante' };
    const estado = String(r.estado_cp_descripcion || '').toUpperCase();
    const local = String(sale.sunatStatus || '').toUpperCase();
    let changed = false;
    if (estado === 'ACEPTADO' && local !== 'ACEPTADO' && local !== 'ANULADO') {
      await this.saleRepo.update(sale.id, { sunatStatus: 'ACEPTADO', sunatMessage: 'Aceptado: confirmado en la consulta a SUNAT' });
      // Igual que al emitirla: aceptada la nota de crédito, el original queda anulado con NC
      if (sale.documentType === DocumentType.NOTA_CREDITO && sale.relatedDocumentId) {
        await this.saleRepo.update({ id: sale.relatedDocumentId, status: SaleStatus.COMPLETED }, { status: SaleStatus.REFUNDED });
      }
      changed = true;
    }
    const message = estado === 'ACEPTADO' ? (changed ? 'SUNAT lo tiene aceptado. Se actualizó el estado.' : 'SUNAT lo tiene aceptado.')
      : estado === 'ANULADO' ? 'SUNAT lo tiene anulado. Revisa la venta: el sistema no la anula solo.'
      : `Estado en SUNAT: ${estado || 'desconocido'}`;
    return { sunat: estado, changed, message };
  }

  // ── Alertas ───────────────────────────────────────────────────────────────

  /** Rechazados y sin respuesta de los últimos 60 días. Antes consulta las notas que siguen esperando. */
  async alerts() {
    await Promise.race([
      this.refreshPendingNotes().catch((e) => this.logger.warn(`Notas pendientes: ${e?.message}`)),
      new Promise((r) => setTimeout(r, 8000)),
    ]);
    const now = Date.now();
    const since = new Date(now - 60 * 86400000);
    const sales = await this.saleRepo.createQueryBuilder('s')
      .where('s.documentType <> :nv', { nv: DocumentType.NOTA_VENTA })
      .andWhere('s.saleDate >= :since', { since })
      .andWhere('s.status <> :voided', { voided: SaleStatus.VOIDED })
      .andWhere("COALESCE(UPPER(s.sunatStatus), '') NOT IN ('ACEPTADO', 'ANULADO')")
      .orderBy('s.saleDate', 'DESC').take(100).getMany();
    const guias: any[] = await this.dataSource.query(
      `SELECT id, COALESCE(numero_completo, serie) AS number, sunat_status AS status, sunat_message AS message, created_at AS date
       FROM guias_remision WHERE created_at >= ? AND UPPER(sunat_status) <> 'ACEPTADO' ORDER BY id DESC LIMIT 50`, [since],
    ).catch(() => []);
    const rejected = (st: any) => /RECHAZADO|ERROR/.test(String(st || '').toUpperCase());
    const items = [
      ...sales.map((s) => ({ id: s.id, kind: 'sale', number: s.invoiceNumber, total: round2(Number(s.totalAmount)), date: s.saleDate, rejected: rejected(s.sunatStatus), message: s.sunatMessage })),
      ...guias.map((g) => ({ id: g.id, kind: 'guia', number: g.number, total: null, date: g.date, rejected: rejected(g.status), message: g.message })),
    ]
      // Lo recién enviado suele confirmarse en minutos
      .filter((x) => x.rejected || now - +new Date(x.date) > 3600_000);
    return { items };
  }

  /** Las notas no se sincronizaban después de enviarlas. Solo se confirma si coinciden número y comprobante afectado. */
  private async refreshPendingNotes() {
    const waiting = await this.saleRepo.find({
      where: { documentType: In([DocumentType.NOTA_CREDITO, DocumentType.NOTA_DEBITO]), sunatStatus: In(['ENVIADO', 'PENDIENTE', 'enviado', 'pendiente']) },
      take: 10, order: { id: 'DESC' },
    });
    for (const note of waiting) {
      if (!note.relatedDocumentId) continue;
      const original = await this.saleRepo.findOne({ where: { id: note.relatedDocumentId } });
      if (!original) continue;
      const credit = note.documentType === DocumentType.NOTA_CREDITO;
      const [serie, corr] = (note.dteNumber || note.invoiceNumber).split('-');
      const [aSerie, aCorr] = original.invoiceNumber.split('-');
      const res: any = await this.facturacion.once('get', `${credit ? '/notas-credito' : '/notas-debito'}?serie=${encodeURIComponent(serie)}&por_pagina=100`);
      const found = (res?.datos?.datos ?? []).find((d: any) => d.serie === serie && Number(d.correlativo) === Number(corr)
        && d.doc_afectado?.serie === aSerie && Number(d.doc_afectado?.correlativo) === Number(aCorr));
      const estado = String(found?.sunat?.estado || '').toLowerCase();
      if (estado !== 'aceptado' && estado !== 'rechazado') continue;
      await this.saleRepo.update(note.id, {
        sunatStatus: estado.toUpperCase(),
        sunatMessage: found.sunat?.descripcion || (estado === 'aceptado' ? 'Nota aceptada por SUNAT' : 'SUNAT rechazó la nota'),
        ...(found.archivos?.xml ? { xmlUrl: found.archivos.xml } : {}),
        ...(found.archivos?.cdr ? { cdrUrl: found.archivos.cdr } : {}),
      });
      // Igual que al emitirla: aceptada la nota de crédito, el original queda anulado con NC
      if (credit && estado === 'aceptado' && original.status === SaleStatus.COMPLETED) {
        await this.saleRepo.update(original.id, { status: SaleStatus.REFUNDED });
      }
    }
  }

  // ── Nota de débito ────────────────────────────────────────────────────────

  async createDebitNote(originalId: number, dto: { reasonCode: string; description: string; amount: number }) {
    const reasonCode = String(dto.reasonCode);
    if (!DEBIT_REASONS[reasonCode]) throw new BadRequestException('Motivo de nota de débito no válido');
    const amount = round2(Number(dto.amount));
    if (!(amount > 0)) throw new BadRequestException('El monto debe ser mayor a cero');
    const concept = (dto.description || DEBIT_REASONS[reasonCode]).trim().slice(0, 250);

    const original = await this.saleRepo.findOne({ where: { id: originalId }, relations: { customer: true } });
    if (!original) throw new NotFoundException('Venta no encontrada');
    if (original.documentType !== DocumentType.FACTURA) throw new BadRequestException('La nota de débito se emite sobre facturas');
    if (original.status !== SaleStatus.COMPLETED) throw new BadRequestException('La factura está anulada');
    if (String(original.sunatStatus || '').toUpperCase() !== 'ACEPTADO') throw new BadRequestException('SUNAT todavía no acepta la factura');

    const customer = original.customer;
    if (!customer?.nit || customer.nit.replace(/\D/g, '').length !== 11) throw new BadRequestException('La factura no tiene un cliente con RUC');
    const [docSerie, docCorr] = original.invoiceNumber.split('-');
    const today = limaYmd(new Date());
    const tax = round2(amount - amount / 1.18);

    // Se guarda primero (como las notas de crédito) y luego se envía a SUNAT
    const nd = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.save(manager.create(SaleEntity, {
        invoiceNumber: `FD01-T${Date.now().toString(36).toUpperCase()}`,
        documentType: DocumentType.NOTA_DEBITO,
        relatedDocumentId: original.id,
        creditNoteReason: `${reasonCode}|${concept}`,
        customerId: original.customerId,
        cashierId: null,
        saleDate: new Date(),
        subtotal: round2(amount - tax),
        taxAmount: tax,
        discountAmount: 0,
        totalAmount: amount,
        paymentMethod: original.paymentMethod,
        amountTendered: null,
        changeGiven: null,
        status: SaleStatus.COMPLETED,
        notes: `Nota de débito de ${original.invoiceNumber}: ${concept}`,
        sunatStatus: 'PENDIENTE',
      }));
      await manager.save(manager.create(SaleItemEntity, {
        saleId: saved.id, productId: null, productName: concept, quantity: 1, unitPrice: amount,
        taxRate: 18, discount: 0, subtotal: amount, sunatUnit: 'ZZ',
      }));
      return saved;
    });

    const payload = {
      serie: 'FD01',
      fecha_emision: today,
      tipo_moneda: 'PEN',
      doc_afectado_tipo: '01',
      doc_afectado_serie: docSerie,
      doc_afectado_correlativo: String(Number(docCorr)),
      cod_motivo: reasonCode,
      des_motivo: concept.toUpperCase(),
      cliente: {
        tipo_doc: '6', num_doc: customer.nit.replace(/\D/g, ''), razon_social: customer.name,
        direccion: customer.address || 'LIMA - PERU',
      },
      items: [{ descripcion: concept, unidad: 'ZZ', cantidad: 1, precio_unitario: amount, tip_afe_igv: '10' }],
      enviar_automatico: true,
    };

    try {
      const res: any = await this.facturacion.post<any>('/notas-debito', payload);
      const d = this.unwrap(res);
      const estado = String(d?.sunat?.estado || '').toLowerCase();
      const number = d?.numero_completo || (d?.serie && d?.correlativo ? `${d.serie}-${d.correlativo}` : null);
      await this.saleRepo.update(nd.id, {
        ...(number ? { invoiceNumber: number } : {}),
        sunatStatus: estado === 'aceptado' ? 'ACEPTADO' : estado === 'rechazado' ? 'RECHAZADO' : 'ENVIADO',
        sunatMessage: d?.sunat?.descripcion || res?.mensaje || 'Nota de débito enviada',
        xmlUrl: d?.archivos?.xml || null,
        cdrUrl: d?.archivos?.cdr || null,
        pdfUrl: d?.archivos?.pdf || null,
      });
    } catch (e: any) {
      const msg = this.apiError(e, 'Error al enviar la nota de débito');
      await this.saleRepo.update(nd.id, { sunatStatus: 'RECHAZADO', sunatMessage: msg });
      this.logger.warn(`ND de ${original.invoiceNumber}: ${msg}`);
    }

    // Si la factura es al crédito y sigue debiendo, el cargo se suma a lo que debe
    const receivable = await this.dataSource.getRepository(ReceivableEntity).findOne({ where: { saleId: original.id } });
    const fresh = (await this.saleRepo.findOne({ where: { id: nd.id } }))!;
    if (receivable && receivable.status !== 'ANULADA' && String(fresh.sunatStatus) !== 'RECHAZADO') {
      await this.dataSource.transaction(async (manager) => {
        const last = await manager.findOne(ReceivableInstallmentEntity, {
          where: { receivableId: receivable.id }, order: { number: 'DESC' },
        });
        await manager.save(manager.create(ReceivableInstallmentEntity, {
          receivableId: receivable.id, number: (last?.number ?? 0) + 1,
          dueDate: last ? last.dueDate : today, amount, paidAmount: 0,
          note: `Nota de débito ${fresh.invoiceNumber}`,
        }));
        await manager.update(ReceivableEntity, receivable.id, {
          total: round2(Number(receivable.total) + amount), status: 'PENDIENTE',
        });
      });
    }
    return fresh;
  }
}
