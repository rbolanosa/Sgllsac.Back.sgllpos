import { CategoryEntity } from './category.entity';
import { SupplierEntity } from './supplier.entity';
export declare enum ProductUnit {
    NIU = "NIU",
    KGM = "KGM",
    GRM = "GRM",
    LTR = "LTR",
    MLT = "MLT",
    MTR = "MTR",
    CMT = "CMT",
    MTK = "MTK",
    MTQ = "MTQ",
    TNE = "TNE",
    GLL = "GLL",
    BX = "BX",
    DZN = "DZN",
    PK = "PK",
    BG = "BG",
    BO = "BO",
    CJ = "CJ",
    SA = "SA",
    SET = "SET",
    ZZ = "ZZ",
    HUR = "HUR",
    DAY = "DAY",
    MON = "MON"
}
export declare enum TipAfeIgv {
    GRAVADO_ONEROSA = "10",
    GRAVADO_RETIRO_PREMIO = "11",
    GRAVADO_RETIRO_DONACION = "12",
    GRAVADO_RETIRO = "13",
    GRAVADO_RETIRO_PUBLICIDAD = "14",
    GRAVADO_BONIFICACIONES = "15",
    GRAVADO_RETIRO_TRABAJADOR = "16",
    GRAVADO_IVAP = "17",
    EXONERADO_ONEROSA = "20",
    EXONERADO_TRANSFERENCIA = "21",
    INAFECTO_ONEROSA = "30",
    INAFECTO_RETIRO_BONIF = "31",
    INAFECTO_RETIRO = "32",
    INAFECTO_RETIRO_MUESTRAS = "33",
    INAFECTO_RETIRO_CONVENIO = "34",
    INAFECTO_RETIRO_PREMIO = "35",
    INAFECTO_RETIRO_PUBLICIDAD = "36",
    EXPORTACION = "40"
}
export declare class ProductEntity {
    id: number;
    barcode: string | null;
    sku: string | null;
    name: string;
    description: string | null;
    categoryId: number | null;
    category: CategoryEntity;
    supplierId: number | null;
    supplier: SupplierEntity;
    unit: string;
    tipAfeIgv: string;
    costPrice: number;
    salePrice: number;
    taxRate: number;
    stockQuantity: number;
    minStockLevel: number;
    maxStockLevel: number | null;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
