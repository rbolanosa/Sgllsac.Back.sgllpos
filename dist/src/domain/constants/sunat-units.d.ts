export declare const BOX_UNIT_SUNAT: Record<string, string>;
export declare function resolveSunatUnit(productBaseUnit: string | null | undefined, boxUnitName: string | null | undefined, productName: string | null | undefined): string;
export declare function resolvePdfUnit(productBaseUnit: string | null | undefined, boxUnitName: string | null | undefined, productName: string | null | undefined): string;
export declare function stripBoxSuffix(productName: string | null | undefined, boxUnitName: string | null | undefined): string;
