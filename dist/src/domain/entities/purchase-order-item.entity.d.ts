import { PurchaseOrderEntity } from './purchase-order.entity';
import { ProductEntity } from './product.entity';
export declare enum PurchaseUnit {
    UNIT = "unit",
    BOX = "box"
}
export declare class PurchaseOrderItemEntity {
    id: number;
    purchaseOrderId: number;
    purchaseOrder: PurchaseOrderEntity;
    productId: number | null;
    product: ProductEntity;
    purchaseUnit: PurchaseUnit;
    boxesOrdered: number | null;
    boxCost: number | null;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number;
    subtotal: number;
    createdAt: Date;
}
