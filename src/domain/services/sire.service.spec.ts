import { invoiceKey } from './sire.service';

describe('invoiceKey', () => {
  it('iguala el número cargado con el de SUNAT aunque tenga ceros', () => {
    expect(invoiceKey('20415721910', 'F002-00014645')).toBe(invoiceKey('20415721910', 'F002', '14645'));
  });
  it('distingue proveedores', () => {
    expect(invoiceKey('20415721910', 'F002-1')).not.toBe(invoiceKey('20368719626', 'F002-1'));
  });
});
