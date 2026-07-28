import { CashService } from '../../domain/services/cash.service';
import { OpenCashSessionDto, CloseCashSessionDto, CreateCashMovementDto } from '../../application/dtos/cash.dto';
export declare class CashController {
    private readonly cashService;
    constructor(cashService: CashService);
    open(dto: OpenCashSessionDto, req: any): Promise<import("../../domain/entities/cash-session.entity").CashSessionEntity>;
    active(req: any): Promise<import("../../domain/entities/cash-session.entity").CashSessionEntity>;
    summary(req: any): Promise<any>;
    addMovement(dto: CreateCashMovementDto, req: any): Promise<import("../../domain/entities/cash-movement.entity").CashMovementEntity>;
    close(dto: CloseCashSessionDto, req: any): Promise<import("../../domain/entities/cash-session.entity").CashSessionEntity>;
    history(req: any, page: number, limit: number, cashierId?: string): Promise<any>;
    getOne(req: any, id: number): Promise<import("../../domain/entities/cash-session.entity").CashSessionEntity>;
}
