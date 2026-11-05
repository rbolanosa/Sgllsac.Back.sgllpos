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
