import { Repository } from 'typeorm';
import { CashSessionEntity } from '../../domain/entities/cash-session.entity';
import { CashMovementEntity } from '../../domain/entities/cash-movement.entity';
import { OpenCashSessionDto, CloseCashSessionDto, CreateCashMovementDto } from '../../application/dtos/cash.dto';
import { SaleEntity } from '../../domain/entities/sale.entity';
export declare class CashService {
    private readonly sessionRepo;
    private readonly movementRepo;
    private readonly saleRepo;
    private readonly logger;
    constructor(sessionRepo: Repository<CashSessionEntity>, movementRepo: Repository<CashMovementEntity>, saleRepo: Repository<SaleEntity>);
    openSession(dto: OpenCashSessionDto, cashierId: number): Promise<CashSessionEntity>;
    getActiveSession(cashierId: number): Promise<CashSessionEntity | null>;
    getSessionById(id: number): Promise<CashSessionEntity>;
    getSessionSummary(cashierId: number): Promise<any>;
    addMovement(dto: CreateCashMovementDto, cashierId: number): Promise<CashMovementEntity>;
    registerSaleMovement(cashierId: number, saleId: number, amount: number, paymentMethod: string, description: string): Promise<void>;
    closeSession(dto: CloseCashSessionDto, cashierId: number): Promise<CashSessionEntity>;
    getHistory(page?: number, limit?: number, cashierId?: number): Promise<any>;
}
