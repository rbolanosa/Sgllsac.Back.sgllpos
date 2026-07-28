import { UserEntity } from './user.entity';
import { EstablishmentEntity } from './establishment.entity';
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
    movements: any[];
    createdAt: Date;
    updatedAt: Date;
}
