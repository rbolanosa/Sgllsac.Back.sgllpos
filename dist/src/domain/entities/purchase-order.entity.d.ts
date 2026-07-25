import { SupplierEntity } from './supplier.entity';
import { PurchaseOrderItemEntity } from './purchase-order-item.entity';
export declare enum PurchaseOrderStatus {
    PENDING = "pending",
    RECEIVED = "received",
    PARTIAL = "partial",
    CANCELLED = "cancelled"
}
export declare class PurchaseOrderEntity {
    id: number;
    orderNumber: string;
    supplierId: number | null;
    supplier: SupplierEntity;
    orderedBy: number | null;
    receivedBy: number | null;
    orderDate: Date;
    receivedDate: Date | null;
    status: PurchaseOrderStatus;
    totalAmount: number;
    notes: string | null;
    items: PurchaseOrderItemEntity[];
    createdAt: Date;
    updatedAt: Date;
}
