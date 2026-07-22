import { ProductUnit } from '../../domain/entities/product.entity';
export declare class CreateProductDto {
    barcode?: string;
    sku?: string;
    name: string;
    description?: string;
    categoryId?: number;
    supplierId?: number;
    unit: ProductUnit;
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
    unit?: ProductUnit;
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
}
