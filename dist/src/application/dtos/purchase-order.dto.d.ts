export declare class PurchaseOrderItemInputDto {
    productId: number;
    quantityOrdered: number;
    unitCost: number;
}
export declare class CreatePurchaseOrderDto {
    supplierId?: number;
    notes?: string;
    items: PurchaseOrderItemInputDto[];
}
export declare class ReceivePurchaseOrderItemDto {
    itemId: number;
    quantityReceived: number;
}
export declare class ReceivePurchaseOrderDto {
    items: ReceivePurchaseOrderItemDto[];
    notes?: string;
}
