import { CashMovementType } from '../../domain/entities/cash-movement.entity';
export declare class OpenCashSessionDto {
    openingAmount: number;
    establishmentId?: number;
    notes?: string;
}
export declare class CloseCashSessionDto {
    closingAmount: number;
    closingNotes?: string;
}
export declare class CreateCashMovementDto {
    type: CashMovementType;
    amount: number;
    description?: string;
}
