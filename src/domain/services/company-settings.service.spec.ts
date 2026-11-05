import { BadGatewayException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { CompanySettingsService } from './company-settings.service';

describe('CompanySettingsService.nextInvoiceNumber', () => {
  const setup = (settings: Record<string, unknown>, used: string[] = []) => {
    const row: Record<string, unknown> = { ...settings };
    const manager = {
      findOne: (
        _entity: unknown,
        options: { where: { invoiceNumber?: string } },
      ) => {
        const number = options.where.invoiceNumber;
        if (number === undefined) return Promise.resolve(row);
        return Promise.resolve(
          used.includes(number) ? { invoiceNumber: number } : null,
        );
      },
      query: (sql: string, [value]: [number]) => {
        const column = /SET (\w+) =/.exec(sql)?.[1] ?? '';
        const field = column.replace(/_(\w)/g, (_m, c: string) =>
          c.toUpperCase(),
        );
        row[field] = value;
        return Promise.resolve();
      },
    };
    const service = new CompanySettingsService(null as never, null as never);
    return {
      row,
      next: (type: 'boleta' | 'factura' | 'nota_venta') =>
        service.nextInvoiceNumber(type, manager),
    };
  };

  it('emite una secuencia continua desde el valor inicial', async () => {
    const { next } = setup({ serieBoleta: 'B001', correlativoBoleta: 1 });

    expect(await next('boleta')).toBe('B001-00000001');
    expect(await next('boleta')).toBe('B001-00000002');
    expect(await next('boleta')).toBe('B001-00000003');
  });

  it('mantiene independiente cada tipo de comprobante', async () => {
    const { next } = setup({
      serieFactura: 'F001',
      correlativoFactura: 7,
      serieNotaVenta: 'NV01',
      correlativoNotaVenta: 1,
    });

    expect(await next('factura')).toBe('F001-00000007');
    expect(await next('nota_venta')).toBe('NV01-00000001');
    expect(await next('factura')).toBe('F001-00000008');
  });

  it('continúa sin huecos un contador que ya guardaba el próximo número', async () => {
    const { next } = setup({ serieBoleta: 'B001', correlativoBoleta: 21 }, [
      'B001-00000020',
    ]);

    expect(await next('boleta')).toBe('B001-00000021');
  });

  it('nunca reutiliza un número ya emitido', async () => {
    const { next, row } = setup({ serieBoleta: 'B001', correlativoBoleta: 5 }, [
      'B001-00000005',
      'B001-00000006',
    ]);

    expect(await next('boleta')).toBe('B001-00000007');
    expect(row.correlativoBoleta).toBe(8);
  });
});

describe('CompanySettingsService.update', () => {
  const setup = () => {
    const settings = {
      id: 1,
      sunatApiKey: 'key',
      sunatApiSecret: 'secret',
      sunatApiUrl: 'http://apisunat.test',
    };
    const repo = {
      findOne: () => Promise.resolve(settings),
      update: jest.fn(() => Promise.resolve()),
    };
    const http = {
      get: () => of({ data: {} }),
      put: jest.fn(() => throwError(() => new Error('sin conexión'))),
    };
    const service = new CompanySettingsService(repo as never, null as never);
    Object.assign(service, { repo, httpService: http });
    return { service, repo, http };
  };

  it('avisa si APISUNAT no recibió las credenciales de guías', async () => {
    const { service, repo } = setup();

    await expect(
      service.update({ sunatClientId: 'id', sunatClientSecret: 'clave' }),
    ).rejects.toBeInstanceOf(BadGatewayException);
    expect(repo.update).toHaveBeenCalled();
  });

  it('no bloquea un guardado normal si APISUNAT falla', async () => {
    const { service } = setup();

    await expect(service.update({ direccion: 'Jr. Lima 1' })).resolves.toBeDefined();
  });
});

describe('CompanySettingsService.updateSunatCredentials', () => {
  const setup = (put: () => unknown) => {
    const settings = {
      id: 1,
      sunatApiKey: 'key',
      sunatApiSecret: 'secret',
      sunatApiUrl: 'http://apisunat.test/',
    };
    const repo = {
      findOne: () => Promise.resolve(settings),
      update: jest.fn(() => Promise.resolve()),
    };
    const http = {
      get: () => of({ data: { datos: { client_id: 'id', tiene_client_secret: true, entorno: 'production' } } }),
      put: jest.fn(put),
    };
    const service = new CompanySettingsService(repo as never, http as never);
    return { service, repo, http };
  };

  it('envía solo las credenciales, nunca el entorno, y devuelve lo guardado', async () => {
    const { service, http } = setup(() => of({ data: {} }));

    const result = await service.updateSunatCredentials({ sunatClientId: ' id ', sunatClientSecret: 'clave', claveSol: '' });

    expect(http.put).toHaveBeenCalledWith(
      'http://apisunat.test/empresa',
      { client_id: 'id', client_secret: 'clave' },
      expect.anything(),
    );
    expect(result.apisunat).toMatchObject({ clientId: 'id', tieneClientSecret: true, entorno: 'production' });
  });

  it('no guarda localmente si APISUNAT rechaza las credenciales', async () => {
    const { service, repo } = setup(() => throwError(() => new Error('sin conexión')));

    await expect(service.updateSunatCredentials({ sunatClientSecret: 'clave' })).rejects.toBeInstanceOf(BadGatewayException);
    expect(repo.update).not.toHaveBeenCalled();
  });
});
