import { SalesRegisterService } from './sales-register.service';

const doc = (id: number, extra: any = {}) => ({
  id, serie: 'F001', correlativo: id, fecha_emision: '2026-11-10 00:00:00',
  totales: { gravadas: 100, igv: 18, total: 118 }, sunat: { estado: 'aceptado' }, ...extra,
});
const page = (datos: any[], total = datos.length, last = 1) => ({ datos: { datos, paginacion: { total, ultima_pagina: last } } });
const make = (reply: (url: string) => any) => new SalesRegisterService({ once: async (_m: string, url: string) => reply(url) } as any);

describe('SalesRegisterService', () => {
  it('recorre todas las páginas con los montos enviados', async () => {
    const s = make((url) => (url.startsWith('/facturas')
      ? page([doc(url.endsWith('page=1') ? 1 : 2)], 2, 2) : page([])));
    const { documents } = await s.list('2026-11-01', '2026-11-30');
    expect(documents.map((d) => [d.number, d.gravada, d.igv, d.total])).toEqual([[1, 100, 18, 118], [2, 100, 18, 118]]);
  });

  it('busca la fecha del comprobante afectado aunque sea de otro mes', async () => {
    const s = make((url) => {
      if (url.startsWith('/notas-credito')) return page([doc(1, { serie: 'FC01', doc_afectado: { tipo: '01', serie: 'F001', correlativo: '00000007' } })]);
      if (url.includes('correlativo=7')) return page([doc(7, { fecha_emision: '2026-10-31 00:00:00' })]);
      return page([]);
    });
    const { documents } = await s.list('2026-11-01', '2026-11-30');
    expect(documents[0].affected).toEqual({ type: '01', serie: 'F001', number: '7', issueDate: '2026-10-31' });
  });

  it('no entrega un registro incompleto', async () => {
    await expect(make(() => page([doc(1)], 2)).list('2026-11-01', '2026-11-30')).rejects.toThrow('No se pudo leer');
    await expect(make(() => ({})).list('2026-11-01', '2026-11-30')).rejects.toThrow('No se pudo leer');
  });

  it('rechaza fechas inválidas', async () => {
    await expect(make(() => page([])).list('2026-11-30', '2026-11-01')).rejects.toThrow('Rango');
  });
});
