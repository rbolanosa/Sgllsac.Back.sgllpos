import { BadRequestException } from '@nestjs/common';
import {
  StockEntryService, similarity, matchKeyOf, normalizeText, keywords, invoiceSum, lineUnitCost, pickBaseLine,
} from './stock-entry.service';

const line = (over: any = {}) => ({
  code: 'F100219', description: 'POETT BEBE 12X880ML', quantity: 1, unitLabel: 'Caja', factor: 12,
  unitPrice: 39.36, action: 'existing', productId: 1, ...over,
});
const dto = (over: any = {}) => ({
  supplierRuc: '20415721910', supplierName: 'RACSER', invoiceNumber: 'F002-00009605',
  invoiceTotal: 39.36, lines: [line()], ...over,
});

describe('StockEntryService helpers', () => {
  it('normaliza tildes y símbolos', () => {
    expect(normalizeText('Café Altomayo  x12/7gr')).toBe('CAFE ALTOMAYO X12 7GR');
  });

  it('usa el código del proveedor como clave y si no hay, la descripción', () => {
    expect(matchKeyOf('f100219', 'x')).toBe('C:F100219');
    expect(matchKeyOf('', 'Azúcar rubia 5kg')).toBe('D:AZUCAR RUBIA 5KG');
  });

  it('reconoce abreviaturas y medidas de las distribuidoras', () => {
    expect(similarity('SEDAL SH CERAMIDAS 12X650ML', 'Shampoo Sedal Ceramidas 650 ml')).toBeGreaterThanOrEqual(0.8);
    expect(similarity('SEDAL SH CERAMIDAS 16X6X40ML', 'Shampoo Sedal Ceramidas sachet 40ml')).toBeGreaterThanOrEqual(0.7);
    expect(similarity('MERMELAD FRESA COMPASS 6X1KG', 'Mermelada Compass Fresa 1 kg')).toBeGreaterThanOrEqual(0.7);
    expect(similarity('DURAZNO ACONCAGUA A/F 822 GRS CAJA X12', 'Durazno Aconcagua 822g')).toBeGreaterThanOrEqual(0.7);
  });

  it('lee medidas con varios multiplicadores', () => {
    expect([...keywords('SEDAL SH CERAMIDAS 16X6X40ML').sizes]).toEqual(['40ML']);
    expect([...keywords('REXONA DEO V8 12X10X10G').sizes]).toEqual(['10G']);
    expect(similarity('SEDAL SH CERAMIDAS 16X6X40ML', 'Shampoo Sedal Ceramidas 650 ml')).toBeLessThan(0.55);
  });

  it('no confunde el mismo producto con otra medida', () => {
    expect(similarity('SEDAL SH CERAMIDAS 12X650ML', 'Shampoo Sedal Ceramidas 340ml')).toBeLessThan(0.55);
  });

  it('encuentra descripciones parecidas', () => {
    expect(similarity('POETT BEBE 12X880ML', 'Poett Bebé 880ml')).toBeGreaterThan(0.5);
    expect(similarity('POETT BEBE 12X880ML', 'Arroz Costeño 750g')).toBe(0);
  });
});

describe('StockEntryService.validate', () => {
  const svc = new StockEntryService({} as any, {} as any, {} as any, {} as any, {} as any);
  const validate = (d: any) => (svc as any).validate(d);

  it('acepta cuando la suma cuadra con el total', () => {
    expect(validate(dto())).toBe(39.36);
  });

  it('rechaza si la suma no coincide con el total de la factura', () => {
    expect(() => validate(dto({ invoiceTotal: 100 }))).toThrow(BadRequestException);
  });

  it('permite la diferencia si el usuario la acepta', () => {
    expect(validate(dto({ invoiceTotal: 100, acceptTotalMismatch: true }))).toBe(39.36);
  });

  it('las líneas omitidas cuentan para el total pero debe quedar al menos una', () => {
    expect(() => validate(dto({ lines: [line({ action: 'skip' })] }))).toThrow(/omitidas/);
  });

  it('rechaza unidades por empaque con decimales', () => {
    expect(() => validate(dto({ lines: [line({ factor: 1.5 })], invoiceTotal: undefined }))).toThrow(/entero/);
  });

  it('rechaza un producto nuevo con precio de venta menor al costo por unidad', () => {
    const l = line({ action: 'new', productId: undefined, newProduct: { name: 'POETT BEBE', salePrice: 2 } });
    expect(() => validate(dto({ lines: [l] }))).toThrow(/menor que el costo/);
  });

  it('rechaza un nuevo precio de venta menor al costo en un producto existente', () => {
    expect(() => validate(dto({ lines: [line({ newSalePrice: 1 })] }))).toThrow(/nuevo precio de venta/);
    expect(validate(dto({ lines: [line({ newSalePrice: 4 })] }))).toBe(39.36);
  });

  it('acepta compra + bonificación del mismo producto nuevo (se unen al cargar)', () => {
    const buy = line({ action: 'new', productId: undefined, quantity: 2, factor: 18, unitPrice: 115.76, newProduct: { name: 'Nosotras 18x10', salePrice: 7 } });
    const bonus = line({ action: 'new', productId: undefined, quantity: 3, factor: 1, unitPrice: 0, newProduct: { name: 'NOSOTRAS 18X10', salePrice: 7 } });
    expect(() => validate(dto({ lines: [buy, bonus], invoiceTotal: undefined }))).not.toThrow();
  });

  it('rechaza un código de barras repetido entre productos nuevos distintos', () => {
    const a = line({ action: 'new', productId: undefined, unitPrice: 0, newProduct: { name: 'Poett', salePrice: 5, barcode: '775' } });
    const b = line({ action: 'new', productId: undefined, unitPrice: 0, newProduct: { name: 'Sapolio', salePrice: 5, barcode: '775' } });
    expect(() => validate(dto({ lines: [a, b], invoiceTotal: undefined }))).toThrow(/código de barras/);
  });

  it('el producto nuevo toma el empaque de la línea con precio, no la bonificación', () => {
    const base = pickBaseLine([{ factor: 1, unitPrice: 0 }, { factor: 18, unitPrice: 115.76 }, { factor: 6, unitPrice: 40 }]);
    expect(base.factor).toBe(18);
  });
});

describe('StockEntryService montos', () => {
  const svc = new StockEntryService({} as any, {} as any, {} as any, {} as any, {} as any);
  const validate = (d: any) => (svc as any).validate(d);

  it('costo por unidad: precio del empaque entre unidades', () => {
    expect(lineUnitCost({ unitPrice: 93.17, factor: 12 })).toBe(7.7642);
  });

  it('suma 18% de IGV al costo si la factura muestra precios sin IGV', () => {
    expect(lineUnitCost({ unitPrice: 100, factor: 10 }, 1.18)).toBe(11.8);
    expect(invoiceSum({ lines: [line({ unitPrice: 100, quantity: 1 })], pricesIncludeIgv: false } as any)).toBe(118);
    expect(validate(dto({ lines: [line({ unitPrice: 100, quantity: 1 })], pricesIncludeIgv: false, invoiceTotal: 118 }))).toBe(118);
  });

  it('considera descuentos u otros cargos al comparar con el total', () => {
    expect(validate(dto({ otherAmount: -4.36, invoiceTotal: 35 }))).toBe(35);
  });

  it('el precio de venta se compara con el costo con IGV', () => {
    const l = line({ action: 'new', productId: undefined, unitPrice: 30, factor: 12, newProduct: { name: 'X', salePrice: 2.6 } });
    expect(() => validate(dto({ lines: [l], invoiceTotal: undefined, pricesIncludeIgv: false }))).toThrow(/menor que el costo/);
  });
});

describe('medidas en kilos', () => {
  it('lee "X 10 K" como 10 kg y no lo confunde con 370 g', () => {
    expect([...keywords('AVENA GRANO DE ORO X 10 K').sizes]).toEqual(['10000G']);
    expect(similarity('AVENA GRANO DE ORO X 10 K', 'QUINUAVENA GRANO DE ORO 12 X 370 GR')).toBeLessThan(0.55);
  });

  it('sigue reconociendo el mismo producto con la misma medida', () => {
    expect(similarity('AVENA GRANO DE ORO X 10 K', 'AVENA GRANO DE ORO 10KG')).toBeGreaterThanOrEqual(0.55);
  });
});
