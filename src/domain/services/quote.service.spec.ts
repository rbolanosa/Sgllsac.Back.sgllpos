import { BadRequestException } from '@nestjs/common';
import { computeQuote } from './quote.service';

describe('computeQuote', () => {
  it('desglosa el IGV de precios que ya lo incluyen', () => {
    const r = computeQuote([{ quantity: 2, unitPrice: 59 }], 0, 18);
    expect(r).toEqual({ gross: 118, discount: 0, total: 118, taxable: 100, tax: 18 });
  });

  it('aplica el descuento global antes de calcular el IGV', () => {
    const r = computeQuote([{ quantity: 1, unitPrice: 100 }, { quantity: 3, unitPrice: 6.5 }], 1.5, 18);
    expect(r.total).toBe(118);
    expect(r.taxable + r.tax).toBe(118);
  });

  it('redondea cantidades con decimales', () => {
    const r = computeQuote([{ quantity: 1.25, unitPrice: 4.333 }], 0, 18);
    expect(r.total).toBe(5.42);
  });

  it('rechaza un descuento mayor que el total', () => {
    expect(() => computeQuote([{ quantity: 1, unitPrice: 10 }], 11, 18)).toThrow(BadRequestException);
  });
});
