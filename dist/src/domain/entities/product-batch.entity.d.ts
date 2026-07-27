import { ProductEntity } from './product.entity';
import { SupplierEntity } from './supplier.entity';
export declare class ProductBatchEntity {
    id: number;
    productId: number;
    product: ProductEntity;
    supplierId: number | null;
    supplier: SupplierEntity | null;
    documentRef: string | null;
    costPrice: number;
    initialQuantity: number;
    currentQuantity: number;
    expirationDate: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
