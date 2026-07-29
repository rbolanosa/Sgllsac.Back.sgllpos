import { CashSessionEntity } from './cash-session.entity';
import { UserEntity } from './user.entity';
export declare enum CashMovementType {
    OPENING = "opening",
    SALE_CASH = "sale_cash",
    SALE_CARD = "sale_card",
    SALE_TRANSFER = "sale_transfer",
    SALE_YAPE = "sale_yape",
    SALE_PLIN = "sale_plin",
    SALE_MIXED = "sale_mixed",
    WITHDRAWAL = "withdrawal",
    DEPOSIT = "deposit",
    EXPENSE = "expense",
    REFUND = "refund",
    CLOSING = "closing"
}
export declare class CashMovementEntity {
    id: number;
    sessionId: number;
    session: CashSessionEntity;
    type: CashMovementType;
    amount: number;
    description: string | null;
    referenceId: number | null;
    paymentMethod: string | null;
    createdBy: number | null;
    creator: UserEntity;
    createdAt: Date;
}
