import { PaymentMethod, DocumentType } from '../../domain/entities/sale.entity';
export declare class SaleItemInputDto {
    productId: number;
    quantity: number;
    discount?: number;
    unitPrice?: number;
}
export declare class PaymentItemInputDto {
    method: string;
    amount: number;
}
export declare class CreateSaleDto {
    customerId?: number;
    documentType?: DocumentType;
    paymentMethod: PaymentMethod;
    payments?: PaymentItemInputDto[];
    amountTendered?: number;
    discountAmount?: number;
    notes?: string;
    items: SaleItemInputDto[];
}
export declare class VoidSaleDto {
    reason: string;
}
