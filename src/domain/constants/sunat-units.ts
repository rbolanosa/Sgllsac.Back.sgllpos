/**
 * Maps boxUnitName (as stored in product.boxUnitName) → SUNAT Catálogo 03 unit code.
 *
 * Catálogo Nº 3 – Unidades de Medida:
 *   BX  = Caja
 *   PK  = Paquete
 *   SA  = Saco
 *   BG  = Bolsa / Bag
 *   DZN = Docena
 *   NIU = Unidad (fallback)
 *
 * Used when a sale item is sold in "box" mode so that the correct SUNAT unit
 * is reported instead of the base product unit (NIU / KGM / etc.).
 */
export const BOX_UNIT_SUNAT: Record<string, string> = {
  Caja:    'BX',  // BX  – Caja
  Paquete: 'PK',  // PK  – Paquete
  Tira:    'PK',  // Blíster / Display → PK (más cercano en Catálogo 03)
  Saco:    'SA',  // SA  – Saco
  Fardo:   'BG',  // Fardo / Bolsa grande → BG (Bolsa/Sack)
  Palet:   'NIU', // Sin código exacto en Catálogo 03 → NIU (fallback)
  Docena:  'DZN', // DZN – Docena
};

/**
 * Returns the SUNAT Catálogo 03 unit code for a sale item.
 *
 * @param productBaseUnit  The product's own SUNAT unit (e.g. 'NIU', 'KGM')
 * @param boxUnitName      The presentation/empaque name (e.g. 'Saco', 'Caja')
 * @param productName      The sale item's productName (used to detect if sold in box mode)
 */
export function resolveSunatUnit(
  productBaseUnit: string | null | undefined,
  boxUnitName: string | null | undefined,
  productName: string | null | undefined,
): string {
  const base = productBaseUnit || 'NIU';
  if (!boxUnitName) return base;

  // The item name is set as "${product.name} (${boxUnitName})" when sold in box mode.
  // If the name contains the box unit label in parentheses, use the mapped SUNAT code.
  if (
    productName &&
    productName.includes(`(${boxUnitName})`) &&
    BOX_UNIT_SUNAT[boxUnitName]
  ) {
    return BOX_UNIT_SUNAT[boxUnitName];
  }

  return base;
}

/**
 * Human-readable unit label for the customer-facing PDF.
 * Returns the boxUnitName ('Caja', 'Saco', 'Paquete'…) when the item was sold
 * in box mode, or a short readable label from the product's SUNAT unit otherwise.
 *
 * @param productBaseUnit  The product's own SUNAT unit (e.g. 'NIU', 'KGM')
 * @param boxUnitName      The presentation/empaque name (e.g. 'Saco', 'Caja')
 * @param productName      The sale item's productName
 */
export function resolvePdfUnit(
  productBaseUnit: string | null | undefined,
  boxUnitName: string | null | undefined,
  productName: string | null | undefined,
): string {
  // If sold in box mode, show the box presentation name (e.g. 'Caja', 'Saco')
  if (
    boxUnitName &&
    productName &&
    productName.includes(`(${boxUnitName})`)
  ) {
    return boxUnitName; // already human-readable ('Caja', 'Saco', 'Paquete'…)
  }

  // Otherwise map the SUNAT base unit to a short readable label
  const READABLE: Record<string, string> = {
    NIU: 'Und',
    KGM: 'Kg',
    GRM: 'g',
    LTR: 'Litro',
    MLT: 'ml',
    MTR: 'm',
    CMT: 'cm',
    MTK: 'm²',
    MTQ: 'm³',
    TNE: 'Ton',
    GLL: 'Galón',
    BX:  'Caja',
    DZN: 'Docena',
    PK:  'Paquete',
    BG:  'Bolsa',
    BO:  'Botella',
    CJ:  'Caja',
    SA:  'Saco',
    SET: 'Set',
    ZZ:  'Servicio',
    HUR: 'Hora',
    DAY: 'Día',
    MON: 'Mes',
  };

  return READABLE[productBaseUnit || 'NIU'] ?? productBaseUnit ?? 'Und';
}

/**
 * Strips the trailing box-unit suffix from a product name.
 *
 * The sale item productName is stored as "${product.name} (${boxUnitName})"
 * (e.g. "LECHE ENTERA (Caja)") so that resolveSunatUnit can detect box mode.
 * Call this before using the name as a SUNAT/PDF description so the customer
 * only sees "LECHE ENTERA" — the unit is shown separately in its own column.
 *
 * @param productName  Raw stored name, e.g. "LECHE ENTERA (Caja)"
 * @param boxUnitName  The presentation name stored on the product, e.g. "Caja"
 */
export function stripBoxSuffix(
  productName: string | null | undefined,
  boxUnitName: string | null | undefined,
): string {
  if (!productName) return '';
  if (!boxUnitName) return productName;
  // Remove exactly " (${boxUnitName})" at the end of the string
  return productName
    .replace(new RegExp(`\\s*\\(${boxUnitName}\\)\\s*$`), '')
    .trim();
}
