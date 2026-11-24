import { Injectable, BadGatewayException, BadRequestException } from '@nestjs/common';
import { FacturacionAdapter } from '../../infrastructure/adapters/facturacion.adapter';

export interface RegisterDocument {
  type: string;
  serie: string;
  number: number;
  issueDate: string;
  dueDate: string | null;
  clientDocType: string;
  clientDoc: string;
  clientName: string;
  currency: string;
  status: string;
  message: string | null;
  affected: { type: string; serie: string; number: string; issueDate: string | null } | null;
  exportacion: number;
  gravada: number;
  exonerada: number;
  inafecta: number;
  igv: number;
  isc: number;
  baseIvap: number;
  ivap: number;
  icbper: number;
  total: number;
}

const SOURCES: [string, string][] = [
  ['01', '/facturas'], ['03', '/boletas'], ['07', '/notas-credito'], ['08', '/notas-debito'],
];
const PAGE = 100;

export function toRegisterDocument(type: string, d: any): RegisterDocument {
  const t = d.totales || {};
  const n = (v: any) => Number(v) || 0;
  return {
    type,
    serie: String(d.serie || ''),
    number: Number(d.correlativo),
    issueDate: String(d.fecha_emision || '').slice(0, 10),
    dueDate: d.fecha_vencimiento ?? null,
    clientDocType: String(d.cliente?.tipo_doc ?? ''),
    clientDoc: String(d.cliente?.num_doc ?? ''),
    clientName: String(d.cliente?.razon_social ?? ''),
    currency: d.tipo_moneda || 'PEN',
    status: String(d.sunat?.estado || 'pendiente').toLowerCase(),
    message: d.sunat?.descripcion ?? null,
    affected: d.doc_afectado?.serie
      ? { type: d.doc_afectado.tipo, serie: d.doc_afectado.serie, number: String(Number(d.doc_afectado.correlativo)), issueDate: null }
      : null,
    exportacion: n(t.exportacion), gravada: n(t.gravadas), exonerada: n(t.exoneradas), inafecta: n(t.inafectas),
    igv: n(t.igv), isc: n(t.isc), baseIvap: n(t.base_ivap), ivap: n(t.ivap), icbper: n(t.icbper), total: n(t.total),
  };
}

/** Comprobantes tal como se enviaron a SUNAT, con los montos del XML. Solo lee. */
@Injectable()
export class SalesRegisterService {
  constructor(private readonly facturacion: FacturacionAdapter) {}

  async list(from: string, to: string): Promise<{ documents: RegisterDocument[] }> {
    const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
    if (!valid(from) || !valid(to) || from > to) throw new BadRequestException('Rango de fechas inválido');
    try {
      const lists = await Promise.all(SOURCES.map(([type, path]) => this.fetchAll(type, path, from, to)));
      const documents = lists.flat();
      await this.fillAffectedDates(documents);
      return { documents };
    } catch (e: any) {
      const d = e?.response?.data;
      throw new BadGatewayException(`No se pudo leer lo enviado a SUNAT: ${d?.mensaje || d?.message || e?.message || 'sin respuesta'}`);
    }
  }

  /** Todo o nada: un registro incompleto daría totales falsos */
  private async fetchAll(type: string, path: string, from: string, to: string): Promise<RegisterDocument[]> {
    const byId = new Map<number, any>();
    let total = 0;
    for (let page = 1; page <= 200; page++) {
      const res: any = await this.facturacion.once(
        'get', `${path}?fecha_desde=${from}&fecha_hasta=${to}&por_pagina=${PAGE}&ordenar_por=correlativo&orden=asc&page=${page}`,
      );
      const body = res?.datos;
      if (!Array.isArray(body?.datos) || !body?.paginacion) throw new Error('respuesta inesperada de APISUNAT');
      body.datos.forEach((d: any) => byId.set(d.id, d));
      total = Number(body.paginacion.total);
      if (page >= Number(body.paginacion.ultima_pagina || 1)) break;
    }
    if (byId.size !== total) throw new Error('la lista cambió mientras se leía, inténtalo de nuevo');
    return [...byId.values()].map((d) => toRegisterDocument(type, d));
  }

  /** Fecha del comprobante que modifica cada nota: define si resta como base o como descuento */
  private async fillAffectedDates(documents: RegisterDocument[]) {
    const dates = new Map(documents.map((d) => [`${d.type}|${d.serie}|${d.number}`, d.issueDate]));
    for (const d of documents) {
      if (!d.affected) continue;
      const { type, serie, number } = d.affected;
      const key = `${type}|${serie}|${number}`;
      if (!dates.has(key) && ['01', '03'].includes(type)) {
        const path = type === '01' ? '/facturas' : '/boletas';
        const res: any = await this.facturacion.once('get', `${path}?serie=${serie}&correlativo=${number}&por_pagina=1`);
        const found = res?.datos?.datos?.[0];
        if (found) dates.set(key, String(found.fecha_emision).slice(0, 10));
      }
      d.affected.issueDate = dates.get(key) ?? null;
    }
  }
}
