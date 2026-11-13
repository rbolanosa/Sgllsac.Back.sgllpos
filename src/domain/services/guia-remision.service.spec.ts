import { GuiaRemisionService } from './guia-remision.service';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

describe('GuiaRemisionService.resendSunat', () => {
  const setup = (apisunatId: number | null, overrides: Record<string, unknown> = {}) => {
    const entity = {
      id: 5,
      serie: 'T001',
      correlativo: '00000035',
      numeroCompleto: 'T001-00000035',
      apisunatId,
      itemsJson: '[]',
      fechaEmision: today(),
      fechaTraslado: today(),
      fechaEntregaTransportista: null as string | null,
      ...overrides,
    };
    const repo = {
      findOne: jest.fn(() => Promise.resolve({ ...entity })),
      update: jest.fn(() => Promise.resolve()),
    };
    const reply = () =>
      Promise.resolve({
        estado: 'exito',
        datos: { id: apisunatId ?? 99, numero_completo: 'T001-35', sunat: { estado: 'enviado' } },
      });
    const facturacion = {
      put: jest.fn(reply),
      post: jest.fn(() =>
        Promise.resolve({
          estado: 'exito',
          datos: { id: apisunatId ?? 99, numero_completo: 'T001-35', sunat: { estado: 'enviado' } },
        }),
      ),
    };
    const service = new GuiaRemisionService(repo as never, null as never, facturacion as never);
    return { service, repo, facturacion };
  };

  it('reenvía la misma guía sin generar un número nuevo', async () => {
    const { service, repo, facturacion } = setup(57);

    await service.resendSunat(5);

    expect(facturacion.post).toHaveBeenCalledTimes(1);
    expect(facturacion.post).toHaveBeenCalledWith('/guias-remision/57/enviar', {});
    expect(repo.update).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ numeroCompleto: 'T001-00000035', apisunatId: 57, sunatStatus: 'ENVIADO' }),
    );
  });

  it('emite la guía si todavía no existe en APISUNAT', async () => {
    const { service, facturacion } = setup(null);

    await service.resendSunat(5);

    expect(facturacion.post).toHaveBeenCalledWith('/guias-remision', expect.any(Object));
  });

  it('reenvía una guía antigua con la fecha de hoy y el mismo número', async () => {
    const { service, repo, facturacion } = setup(57, {
      fechaEmision: '2026-11-04',
      fechaTraslado: '2026-11-04',
      fechaEntregaTransportista: '2026-11-05',
    });

    await service.resendSunat(5);

    expect(facturacion.post).not.toHaveBeenCalled();
    expect(facturacion.put).toHaveBeenCalledWith(
      '/guias-remision/57',
      expect.objectContaining({
        serie: 'T001',
        fecha_emision: today(),
        fecha_traslado: today(),
        fecha_de_entrega_al_transportista: today(),
      }),
    );
    expect(repo.update).toHaveBeenCalledWith(5, expect.objectContaining({ fechaEmision: today() }));
  });
});

describe('GuiaRemisionService.findAll (sincronización)', () => {
  it('toma el estado solo del registro de APISUNAT enlazado', async () => {
    const guide = { id: 5, serie: 'T001', numeroCompleto: 'T001-00000035', apisunatId: 57, sunatStatus: 'RECHAZADO', sunatMessage: 'viejo' };
    const qb: any = {
      orderBy: () => qb, skip: () => qb, take: () => qb, andWhere: () => qb,
      getManyAndCount: () => Promise.resolve([[guide], 1]),
    };
    const repo = { createQueryBuilder: () => qb, update: jest.fn(() => Promise.resolve()) };
    const facturacion = {
      get: () => Promise.resolve({ datos: [
        { id: 5, numero_completo: 'T001-25', sunat: { estado: 'rechazado', descripcion: '401 antiguo' } },
        { id: 57, numero_completo: 'T001-35', sunat: { estado: 'aceptado', descripcion: 'aceptado' } },
      ] }),
    };
    const service = new GuiaRemisionService(repo as never, null as never, facturacion as never);

    const res: any = await service.findAll({ page: 1, limit: 20 } as never);

    expect(res.data[0].sunatStatus).toBe('ACEPTADO');
    expect(res.data[0].sunatMessage).toBe('aceptado');
  });
});
