import { invoiceKey, affectedFromRaw, signedTotal } from './sire.service';

describe('invoiceKey', () => {
  it('iguala el número cargado con el de SUNAT aunque tenga ceros', () => {
    expect(invoiceKey('20415721910', 'F002-00014645')).toBe(invoiceKey('20415721910', 'F002', '14645'));
  });
  it('distingue proveedores', () => {
    expect(invoiceKey('20415721910', 'F002-1')).not.toBe(invoiceKey('20368719626', 'F002-1'));
  });
});

describe('notas y boletas de compra', () => {
  it('la nota de crédito resta aunque SUNAT la mande en positivo o negativo', () => {
    expect(signedTotal('07', 50)).toBe(-50);
    expect(signedTotal('07', -50)).toBe(-50);
    expect(signedTotal('08', 20)).toBe(20);
    expect(signedTotal('01', 100)).toBe(100);
  });
  it('lee la factura que modifica la nota, o no inventa nada', () => {
    const f = Array(40).fill('');
    f[0] = '10267075374'; f[27] = '05/11/2026'; f[28] = '01'; f[29] = 'F002'; f[31] = '00013542';
    expect(affectedFromRaw(f.join('|'))).toEqual({ type: '01', number: 'F002-13542', date: '2026-11-05' });
    expect(affectedFromRaw('')).toBeNull();
    expect(affectedFromRaw(Array(40).fill('x').join('|'))).toBeNull();
  });
});
