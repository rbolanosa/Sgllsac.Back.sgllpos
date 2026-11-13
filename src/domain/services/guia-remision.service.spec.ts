import { GuiaRemisionService } from './guia-remision.service';

describe('GuiaRemisionService.resendSunat', () => {
  const setup = (apisunatId: number | null) => {
    const entity = {
      id: 5,
      serie: 'T001',
      correlativo: '00000035',
      numeroCompleto: 'T001-00000035',
      apisunatId,
      itemsJson: '[]',
    };
    const repo = {
      findOne: jest.fn(() => Promise.resolve({ ...entity })),
      update: jest.fn(() => Promise.resolve()),
    };
    const facturacion = {
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
});
