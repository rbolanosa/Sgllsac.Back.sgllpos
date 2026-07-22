import { CategoryEntity } from './category.entity';
import { SupplierEntity } from './supplier.entity';
export declare enum ProductUnit {
    PIECE = "piece",
    KG = "kg",
    LITER = "liter",
    BOX = "box",
    DOZEN = "dozen",
    PACK = "pack"
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
    unit: ProductUnit;
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
