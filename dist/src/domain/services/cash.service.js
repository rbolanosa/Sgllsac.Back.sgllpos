"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CashService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cash_session_entity_1 = require("../../domain/entities/cash-session.entity");
const cash_movement_entity_1 = require("../../domain/entities/cash-movement.entity");
const sale_entity_1 = require("../../domain/entities/sale.entity");
let CashService = CashService_1 = class CashService {
    constructor(sessionRepo, movementRepo, saleRepo) {
        this.sessionRepo = sessionRepo;
        this.movementRepo = movementRepo;
        this.saleRepo = saleRepo;
        this.logger = new common_1.Logger(CashService_1.name);
    }
    async openSession(dto, cashierId) {
        const existing = await this.sessionRepo.findOne({
            where: { cashierId, status: cash_session_entity_1.CashSessionStatus.OPEN },
        });
        if (existing) {
            throw new common_1.BadRequestException('Ya tienes una caja abierta. Ciérrala primero antes de abrir una nueva.');
        }
        const session = this.sessionRepo.create({
            cashierId,
            establishmentId: dto.establishmentId ?? null,
            status: cash_session_entity_1.CashSessionStatus.OPEN,
            openingAmount: dto.openingAmount,
            expectedAmount: dto.openingAmount,
            openedAt: new Date(),
        });
        const saved = await this.sessionRepo.save(session);
        await this.movementRepo.save(this.movementRepo.create({
            sessionId: saved.id,
            type: cash_movement_entity_1.CashMovementType.OPENING,
            amount: dto.openingAmount,
            description: dto.notes || 'Apertura de caja',
            createdBy: cashierId,
        }));
        return this.getSessionById(saved.id);
    }
    async getActiveSession(cashierId) {
        return this.sessionRepo.findOne({
            where: { cashierId, status: cash_session_entity_1.CashSessionStatus.OPEN },
            relations: { cashier: true, establishment: true },
        });
    }
    async getSessionById(id) {
        const session = await this.sessionRepo.findOne({
            where: { id },
            relations: { cashier: true, establishment: true, movements: true },
        });
        if (!session)
            throw new common_1.NotFoundException(`Sesión de caja #${id} no encontrada`);
        return session;
    }
    async getSessionSummary(cashierId) {
        const session = await this.getActiveSession(cashierId);
        if (!session)
            return null;
        const movements = await this.movementRepo.find({
            where: { sessionId: session.id },
            order: { createdAt: 'DESC' },
        });
        const totalCash = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.SALE_CASH)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalCard = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.SALE_CARD)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalTransfer = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.SALE_TRANSFER)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalYape = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.SALE_YAPE)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalMixed = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.SALE_MIXED)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalWithdrawals = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.WITHDRAWAL)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalDeposits = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.DEPOSIT)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalExpenses = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.EXPENSE)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalRefunds = movements.filter(m => m.type === cash_movement_entity_1.CashMovementType.REFUND)
            .reduce((s, m) => s + Number(m.amount), 0);
        const totalSales = totalCash + totalCard + totalTransfer + totalYape + totalMixed;
        const totalSaleCount = movements.filter(m => [cash_movement_entity_1.CashMovementType.SALE_CASH, cash_movement_entity_1.CashMovementType.SALE_CARD,
            cash_movement_entity_1.CashMovementType.SALE_TRANSFER, cash_movement_entity_1.CashMovementType.SALE_YAPE,
            cash_movement_entity_1.CashMovementType.SALE_MIXED].includes(m.type)).length;
        const expectedInDrawer = Number(session.openingAmount)
            + totalCash
            + totalDeposits
            - totalWithdrawals
            - totalExpenses
            - totalRefunds;
        await this.sessionRepo.update(session.id, { expectedAmount: expectedInDrawer });
        return {
            session: {
                id: session.id,
                openedAt: session.openedAt,
                cashier: session.cashier?.name,
                establishment: session.establishment?.nombre,
                openingAmount: Number(session.openingAmount),
            },
            totals: {
                totalSales: Number(totalSales.toFixed(2)),
                totalSaleCount,
                totalCash: Number(totalCash.toFixed(2)),
                totalCard: Number(totalCard.toFixed(2)),
                totalTransfer: Number(totalTransfer.toFixed(2)),
                totalYape: Number(totalYape.toFixed(2)),
                totalMixed: Number(totalMixed.toFixed(2)),
                totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
                totalDeposits: Number(totalDeposits.toFixed(2)),
                totalExpenses: Number(totalExpenses.toFixed(2)),
                totalRefunds: Number(totalRefunds.toFixed(2)),
                expectedInDrawer: Number(expectedInDrawer.toFixed(2)),
            },
            movements: movements.slice(0, 50),
        };
    }
    async addMovement(dto, cashierId) {
        const session = await this.getActiveSession(cashierId);
        if (!session)
            throw new common_1.BadRequestException('No hay caja abierta. Abre una caja primero.');
        const allowed = [cash_movement_entity_1.CashMovementType.WITHDRAWAL, cash_movement_entity_1.CashMovementType.DEPOSIT,
            cash_movement_entity_1.CashMovementType.EXPENSE, cash_movement_entity_1.CashMovementType.REFUND];
        if (!allowed.includes(dto.type)) {
            throw new common_1.BadRequestException('Tipo de movimiento no permitido manualmente.');
        }
        return this.movementRepo.save(this.movementRepo.create({
            sessionId: session.id,
            type: dto.type,
            amount: dto.amount,
            description: dto.description,
            createdBy: cashierId,
        }));
    }
    async registerSaleMovement(cashierId, saleId, amount, paymentMethod, description) {
        const session = await this.getActiveSession(cashierId);
        if (!session)
            return;
        const typeMap = {
            cash: cash_movement_entity_1.CashMovementType.SALE_CASH,
            card: cash_movement_entity_1.CashMovementType.SALE_CARD,
            transfer: cash_movement_entity_1.CashMovementType.SALE_TRANSFER,
            yape: cash_movement_entity_1.CashMovementType.SALE_YAPE,
            plin: cash_movement_entity_1.CashMovementType.SALE_YAPE,
            deposit: cash_movement_entity_1.CashMovementType.SALE_TRANSFER,
            mixed: cash_movement_entity_1.CashMovementType.SALE_MIXED,
        };
        const movType = typeMap[paymentMethod] ?? cash_movement_entity_1.CashMovementType.SALE_MIXED;
        await this.movementRepo.save(this.movementRepo.create({
            sessionId: session.id,
            type: movType,
            amount,
            description,
            referenceId: saleId,
            paymentMethod,
            createdBy: cashierId,
        }));
    }
    async closeSession(dto, cashierId) {
        const session = await this.getActiveSession(cashierId);
        if (!session)
            throw new common_1.BadRequestException('No hay caja abierta para cerrar.');
        const summary = await this.getSessionSummary(cashierId);
        const expected = summary?.totals?.expectedInDrawer ?? Number(session.openingAmount);
        const difference = Number(dto.closingAmount) - expected;
        await this.movementRepo.save(this.movementRepo.create({
            sessionId: session.id,
            type: cash_movement_entity_1.CashMovementType.CLOSING,
            amount: dto.closingAmount,
            description: dto.closingNotes || 'Cierre de caja',
            createdBy: cashierId,
        }));
        await this.sessionRepo.update(session.id, {
            status: cash_session_entity_1.CashSessionStatus.CLOSED,
            closingAmount: dto.closingAmount,
            expectedAmount: expected,
            difference,
            closingNotes: dto.closingNotes ?? null,
            closedAt: new Date(),
        });
        return this.getSessionById(session.id);
    }
    async getHistory(page = 1, limit = 20, cashierId) {
        const qb = this.sessionRepo.createQueryBuilder('s')
            .leftJoinAndSelect('s.cashier', 'u')
            .leftJoinAndSelect('s.establishment', 'e')
            .orderBy('s.id', 'DESC');
        if (cashierId)
            qb.andWhere('s.cashier_id = :cashierId', { cashierId });
        const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        return { data, total, page, limit };
    }
};
exports.CashService = CashService;
exports.CashService = CashService = CashService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cash_session_entity_1.CashSessionEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(cash_movement_entity_1.CashMovementEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(sale_entity_1.SaleEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], CashService);
//# sourceMappingURL=cash.service.js.map