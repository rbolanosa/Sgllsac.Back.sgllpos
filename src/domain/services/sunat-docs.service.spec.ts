import { daysSince, VOID_MAX_DAYS } from './sunat-docs.service';

describe('comunicación de baja', () => {
  it('cuenta días calendario entre emisión y hoy', () => {
    expect(daysSince('2026-11-14', '2026-11-21')).toBe(7);
    expect(daysSince('2026-11-21', '2026-11-21')).toBe(0);
  });
  it('el plazo de SUNAT es 7 días', () => {
    expect(VOID_MAX_DAYS).toBe(7);
  });
});

describe('anular boletas y consultar en SUNAT', () => {
  const sale = (x: any = {}) => ({ id: 1, documentType: 'boleta', invoiceNumber: 'B001-00000073', status: 'completed', sunatStatus: 'ACEPTADO', saleDate: new Date(), totalAmount: 37, ...x });
  const make = (s: any, api: (m: string, url: string, body?: any) => any, last: any = null) => {
    const saleRepo = { findOne: async () => s, update: jest.fn(async () => undefined) };
    const voidRepo = {
      findOne: async ({ where }: any) => (where.id ? { id: 9, saleId: 1, status: 'PENDIENTE', apisunatId: 5, identifier: 'RC-1', reason: 'x' } : last),
      create: (v: any) => v, save: async (v: any) => ({ id: 9, ...v }), update: jest.fn(),
    };
    const fac = { once: jest.fn(api), post: jest.fn(api), get: jest.fn(async () => ({ datos: { estado_sunat: 'pendiente' } })) };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SunatDocsService } = require('./sunat-docs.service');
    return { svc: new SunatDocsService(saleRepo as any, voidRepo as any, {} as any, fac as any), fac, saleRepo };
  };

  it('una boleta aceptada se anula con resumen diario de su fecha', async () => {
    const { svc, fac } = make(sale(), async (_m: string, url: string) => (url.startsWith('/boletas')
      ? { datos: { datos: [{ id: 44, serie: 'B001', correlativo: 73 }] } }
      : { datos: { id_resumen: 5, identifier: 'RC-20261127-001' } }));
    expect((await svc.voidCheck(1)).allowed).toBe(true);
    await svc.requestVoid(1, 'Error en el cliente');
    const call = fac.once.mock.calls.find((c: any[]) => c[1] === '/resumenes');
    expect(call[2]).toEqual({ fecha_resumen: expect.any(String), anular: [{ id: 44, motivo: 'Error en el cliente' }] });
    expect(fac.post).not.toHaveBeenCalled();
    expect(fac.get).toHaveBeenCalledWith('/resumenes/5/estado');
  });

  it('no se anula una nota de venta ni una boleta sin aceptar', async () => {
    expect((await make(sale({ documentType: 'nota_venta' }), async () => ({})).svc.voidCheck(1)).allowed).toBe(false);
    expect((await make(sale({ sunatStatus: 'ENVIADO' }), async () => ({})).svc.voidCheck(1)).reason).toContain('boleta');
  });

  it('la consulta solo corrige cuando SUNAT confirma que está aceptado', async () => {
    const ok = make(sale({ documentType: 'nota_credito', invoiceNumber: 'FC01-2', sunatStatus: 'ENVIADO', relatedDocumentId: 7 }),
      async () => ({ datos: { encontrado: true, estado_cp_descripcion: 'ACEPTADO' } }));
    expect(await ok.svc.checkInSunat(1)).toMatchObject({ sunat: 'ACEPTADO', changed: true });
    expect(ok.fac.once.mock.calls[0].slice(0, 3)).toEqual(['post', '/consultar-cdr', { tipo_documento: '07', serie: 'FC01', correlativo: 2 }]);
    expect(ok.saleRepo.update).toHaveBeenCalledTimes(2);
    const nulled = make(sale({ sunatStatus: 'ENVIADO' }), async () => ({ datos: { encontrado: true, estado_cp_descripcion: 'ANULADO' } }));
    expect(await nulled.svc.checkInSunat(1)).toMatchObject({ sunat: 'ANULADO', changed: false });
    expect(nulled.saleRepo.update).not.toHaveBeenCalled();
    expect(nulled.fac.once.mock.calls[0][1]).toContain('/consultar-cpe?tipo_doc=03&serie=B001');
  });
});
