"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOX_UNIT_SUNAT = void 0;
exports.resolveSunatUnit = resolveSunatUnit;
exports.resolvePdfUnit = resolvePdfUnit;
exports.stripBoxSuffix = stripBoxSuffix;
exports.BOX_UNIT_SUNAT = {
    Caja: 'BX',
    Paquete: 'PK',
    Tira: 'PK',
    Saco: 'SA',
    Fardo: 'BG',
    Palet: 'NIU',
    Docena: 'DZN',
};
function resolveSunatUnit(productBaseUnit, boxUnitName, productName) {
    const base = productBaseUnit || 'NIU';
    if (!boxUnitName)
        return base;
    if (productName &&
        productName.includes(`(${boxUnitName})`) &&
        exports.BOX_UNIT_SUNAT[boxUnitName]) {
        return exports.BOX_UNIT_SUNAT[boxUnitName];
    }
    return base;
}
function resolvePdfUnit(productBaseUnit, boxUnitName, productName) {
    if (boxUnitName &&
        productName &&
        productName.includes(`(${boxUnitName})`)) {
        return boxUnitName;
    }
    const READABLE = {
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
        BX: 'Caja',
        DZN: 'Docena',
        PK: 'Paquete',
        BG: 'Bolsa',
        BO: 'Botella',
        CJ: 'Caja',
        SA: 'Saco',
        SET: 'Set',
        ZZ: 'Servicio',
        HUR: 'Hora',
        DAY: 'Día',
        MON: 'Mes',
    };
    return READABLE[productBaseUnit || 'NIU'] ?? productBaseUnit ?? 'Und';
}
function stripBoxSuffix(productName, boxUnitName) {
    if (!productName)
        return '';
    if (!boxUnitName)
        return productName;
    return productName
        .replace(new RegExp(`\\s*\\(${boxUnitName}\\)\\s*$`), '')
        .trim();
}
//# sourceMappingURL=sunat-units.js.map