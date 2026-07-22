import { PurchaseOrderEntity } from './purchase-order.entity';
import { ProductEntity } from './product.entity';
export declare class PurchaseOrderItemEntity {
    id: number;
    purchaseOrderId: number;
    purchaseOrder: PurchaseOrderEntity;
    productId: number | null;
    product: ProductEntity;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    subtotal: number;
    createdAt: Date;
}
