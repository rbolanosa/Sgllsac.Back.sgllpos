import { SaleEntity } from './sale.entity';
import { ProductEntity } from './product.entity';
export declare class SaleItemEntity {
    id: number;
    saleId: number;
    sale: SaleEntity;
    productId: number | null;
    product: ProductEntity;
    productName: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    discount: number;
    subtotal: number;
    createdAt: Date;
}
