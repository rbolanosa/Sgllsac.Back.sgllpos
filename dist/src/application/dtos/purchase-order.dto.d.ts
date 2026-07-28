export declare class PurchaseOrderItemInputDto {
    productId: number;
    purchaseUnit?: 'unit' | 'box';
    quantityOrdered?: number;
    unitCost?: number;
    boxesOrdered?: number;
    boxCost?: number;
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
