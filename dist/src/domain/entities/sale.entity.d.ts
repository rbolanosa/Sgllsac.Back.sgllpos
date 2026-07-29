import { CustomerEntity } from './customer.entity';
import { SaleItemEntity } from './sale-item.entity';
import { UserEntity } from './user.entity';
export declare enum PaymentMethod {
    CASH = "cash",
    CARD = "card",
    TRANSFER = "transfer",
    MIXED = "mixed",
    YAPE = "yape",
    PLIN = "plin",
    DEPOSIT = "deposit"
}
export declare enum SaleStatus {
    COMPLETED = "completed",
    VOIDED = "voided",
    REFUNDED = "refunded"
}
export declare enum DocumentType {
    FACTURA = "factura",
    BOLETA = "boleta",
    NOTA_VENTA = "nota_venta",
    NOTA_CREDITO = "nota_credito",
    NOTA_DEBITO = "nota_debito"
}
export declare class SaleEntity {
    id: number;
    invoiceNumber: string;
    documentType: DocumentType;
    relatedDocumentId: number | null;
    creditNoteReason: string | null;
    customerId: number | null;
    customer: CustomerEntity;
    cashierId: number | null;
    cashier: UserEntity;
    saleDate: Date;
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    amountTendered: number | null;
    changeGiven: number | null;
    status: SaleStatus;
    notes: string | null;
    dteNumber: string | null;
    sunatStatus: string | null;
    sunatMessage: string | null;
    xmlUrl: string | null;
    cdrUrl: string | null;
    pdfUrl: string | null;
    qrCode: string | null;
    items: SaleItemEntity[];
    createdAt: Date;
    updatedAt: Date;
}
