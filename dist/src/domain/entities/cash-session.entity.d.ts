import { UserEntity } from './user.entity';
import { EstablishmentEntity } from './establishment.entity';
import type { CashMovementEntity } from './cash-movement.entity';
export declare enum CashSessionStatus {
    OPEN = "open",
    CLOSED = "closed"
}
export declare class CashSessionEntity {
    id: number;
    cashierId: number;
    cashier: UserEntity;
    establishmentId: number | null;
    establishment: EstablishmentEntity;
    status: CashSessionStatus;
    openingAmount: number;
    expectedAmount: number;
    closingAmount: number | null;
    difference: number | null;
    closingNotes: string | null;
    openedAt: Date;
    closedAt: Date | null;
    movements: CashMovementEntity[];
    createdAt: Date;
    updatedAt: Date;
}
