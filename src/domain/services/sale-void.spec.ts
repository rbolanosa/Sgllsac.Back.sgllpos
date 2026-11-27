import { sunatVoidBlock } from './sale.service';

describe('anular solo en el sistema', () => {
  it('no se permite si SUNAT aceptó o todavía puede aceptar', () => {
    expect(sunatVoidBlock({ documentType: 'boleta', sunatStatus: 'ACEPTADO' } as any)).toContain('ante SUNAT');
    expect(sunatVoidBlock({ documentType: 'factura', sunatStatus: 'ENVIADO' } as any)).toContain('consulta su estado');
  });
  it('sí en notas de venta y en comprobantes rechazados', () => {
    expect(sunatVoidBlock({ documentType: 'nota_venta', sunatStatus: null } as any)).toBeNull();
    expect(sunatVoidBlock({ documentType: 'boleta', sunatStatus: 'RECHAZADO' } as any)).toBeNull();
  });
});
