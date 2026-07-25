import { ProductEntity } from './product.entity';
export declare enum MovementType {
    IN = "in",
    OUT = "out",
    ADJUSTMENT = "adjustment",
    LOSS = "loss"
}
export declare enum MovementReferenceType {
    SALE = "sale",
    PURCHASE_ORDER = "purchase_order",
    MANUAL = "manual",
    INITIAL = "initial"
}
export declare class InventoryMovementEntity {
    id: number;
    productId: number;
    product: ProductEntity;
    movementType: MovementType;
    quantity: number;
    referenceType: MovementReferenceType;
    referenceId: number | null;
    notes: string | null;
    performedBy: number | null;
    createdAt: Date;
}
