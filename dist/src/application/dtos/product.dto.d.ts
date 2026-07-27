export declare class CreateProductDto {
    barcode?: string;
    sku?: string;
    name: string;
    description?: string;
    categoryId?: number;
    supplierId?: number;
    unit?: string;
    tipAfeIgv?: string;
    costPrice: number;
    salePrice: number;
    taxRate?: number;
    stockQuantity?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    imageUrl?: string;
}
export declare class UpdateProductDto {
    barcode?: string;
    sku?: string;
    name?: string;
    description?: string;
    categoryId?: number;
    supplierId?: number;
    unit?: string;
    tipAfeIgv?: string;
    costPrice?: number;
    salePrice?: number;
    taxRate?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    imageUrl?: string;
    isActive?: boolean;
}
export declare class StockAdjustmentDto {
    quantity: number;
    notes: string;
    supplierId?: number;
    costPrice?: number;
    expirationDate?: string;
}
