import {
  Injectable, BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CashSessionEntity, CashSessionStatus } from '../../domain/entities/cash-session.entity';
import { CashMovementEntity, CashMovementType } from '../../domain/entities/cash-movement.entity';
import {
  OpenCashSessionDto, CloseCashSessionDto, CreateCashMovementDto,
} from '../../application/dtos/cash.dto';
import { SaleEntity, PaymentMethod } from '../../domain/entities/sale.entity';

@Injectable()
export class CashService {
  private readonly logger = new Logger(CashService.name);

  constructor(
    @InjectRepository(CashSessionEntity)
    private readonly sessionRepo: Repository<CashSessionEntity>,
    @InjectRepository(CashMovementEntity)
    private readonly movementRepo: Repository<CashMovementEntity>,
    @InjectRepository(SaleEntity)
    private readonly saleRepo: Repository<SaleEntity>,
  ) {}

  // ─── Open Session ────────────────────────────────────────────────────────────
  async openSession(dto: OpenCashSessionDto, cashierId: number): Promise<CashSessionEntity> {
    const existing = await this.sessionRepo.findOne({
      where: { cashierId, status: CashSessionStatus.OPEN },
    });
    if (existing) {
      throw new BadRequestException('Ya tienes una caja abierta. Ciérrala primero antes de abrir una nueva.');
    }

    const session = this.sessionRepo.create({
      cashierId,
      establishmentId: dto.establishmentId ?? null,
      status: CashSessionStatus.OPEN,
      openingAmount: dto.openingAmount,
      expectedAmount: dto.openingAmount,
      openedAt: new Date(),
    });
    const saved = await this.sessionRepo.save(session);

    // Register opening movement
    await this.movementRepo.save(
      this.movementRepo.create({
        sessionId: saved.id,
        type: CashMovementType.OPENING,
        amount: dto.openingAmount,
        description: dto.notes || 'Apertura de caja',
        createdBy: cashierId,
      }),
    );

    return this.getSessionById(saved.id);
  }

  // ─── Get Active Session ──────────────────────────────────────────────────────
  async getActiveSession(cashierId: number): Promise<CashSessionEntity | null> {
    return this.sessionRepo.findOne({
      where: { cashierId, status: CashSessionStatus.OPEN },
      relations: { cashier: true, establishment: true },
    });
  }

  // ─── Get Session By Id ───────────────────────────────────────────────────────
  async getSessionById(id: number): Promise<CashSessionEntity> {
    const session = await this.sessionRepo.findOne({
      where: { id },
      relations: { cashier: true, establishment: true, movements: true },
    });
    if (!session) throw new NotFoundException(`Sesión de caja #${id} no encontrada`);
    return session;
  }

  // ─── Real-time Summary ───────────────────────────────────────────────────────
  async getSessionSummary(cashierId: number): Promise<any> {
    const session = await this.getActiveSession(cashierId);
    if (!session) return null;

    const movements = await this.movementRepo.find({
      where: { sessionId: session.id },
      order: { createdAt: 'DESC' },
    });

    // Totals per payment method from movements
    const totalCash       = movements.filter(m => m.type === CashMovementType.SALE_CASH)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalCard       = movements.filter(m => m.type === CashMovementType.SALE_CARD)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalTransfer   = movements.filter(m => m.type === CashMovementType.SALE_TRANSFER)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalYape       = movements.filter(m => m.type === CashMovementType.SALE_YAPE)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalMixed      = movements.filter(m => m.type === CashMovementType.SALE_MIXED)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalWithdrawals= movements.filter(m => m.type === CashMovementType.WITHDRAWAL)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalDeposits   = movements.filter(m => m.type === CashMovementType.DEPOSIT)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalExpenses   = movements.filter(m => m.type === CashMovementType.EXPENSE)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalRefunds    = movements.filter(m => m.type === CashMovementType.REFUND)
                                     .reduce((s, m) => s + Number(m.amount), 0);
    const totalSales      = totalCash + totalCard + totalTransfer + totalYape + totalMixed;
    const totalSaleCount  = movements.filter(m =>
      [CashMovementType.SALE_CASH, CashMovementType.SALE_CARD,
       CashMovementType.SALE_TRANSFER, CashMovementType.SALE_YAPE,
       CashMovementType.SALE_MIXED].includes(m.type)
    ).length;

    // Expected cash in drawer
    const expectedInDrawer =
      Number(session.openingAmount)
      + totalCash
      + totalDeposits
      - totalWithdrawals
      - totalExpenses
      - totalRefunds;

    // Update expectedAmount in session
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
        totalSales:       Number(totalSales.toFixed(2)),
        totalSaleCount,
        totalCash:        Number(totalCash.toFixed(2)),
        totalCard:        Number(totalCard.toFixed(2)),
        totalTransfer:    Number(totalTransfer.toFixed(2)),
        totalYape:        Number(totalYape.toFixed(2)),
        totalMixed:       Number(totalMixed.toFixed(2)),
        totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
        totalDeposits:    Number(totalDeposits.toFixed(2)),
        totalExpenses:    Number(totalExpenses.toFixed(2)),
        totalRefunds:     Number(totalRefunds.toFixed(2)),
        expectedInDrawer: Number(expectedInDrawer.toFixed(2)),
      },
      movements: movements.slice(0, 50), // latest 50
    };
  }

  // ─── Add Manual Movement ─────────────────────────────────────────────────────
  async addMovement(dto: CreateCashMovementDto, cashierId: number): Promise<CashMovementEntity> {
    const session = await this.getActiveSession(cashierId);
    if (!session) throw new BadRequestException('No hay caja abierta. Abre una caja primero.');

    const allowed = [CashMovementType.WITHDRAWAL, CashMovementType.DEPOSIT,
                     CashMovementType.EXPENSE,    CashMovementType.REFUND];
    if (!allowed.includes(dto.type)) {
      throw new BadRequestException('Tipo de movimiento no permitido manualmente.');
    }

    return this.movementRepo.save(
      this.movementRepo.create({
        sessionId: session.id,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        createdBy: cashierId,
      }),
    );
  }

  // ─── Register Sale Movement (called from SaleService) ───────────────────────
  async registerSaleMovement(
    cashierId: number,
    saleId: number,
    amount: number,
    paymentMethod: string,
    description: string,
  ): Promise<void> {
    const session = await this.getActiveSession(cashierId);
    if (!session) return; // Si no hay caja abierta, no registra (caja no obligatoria)

    const typeMap: Record<string, CashMovementType> = {
      cash:     CashMovementType.SALE_CASH,
      card:     CashMovementType.SALE_CARD,
      transfer: CashMovementType.SALE_TRANSFER,
      yape:     CashMovementType.SALE_YAPE,
      plin:     CashMovementType.SALE_YAPE,
      deposit:  CashMovementType.SALE_TRANSFER,
      mixed:    CashMovementType.SALE_MIXED,
    };
    const movType = typeMap[paymentMethod] ?? CashMovementType.SALE_MIXED;

    await this.movementRepo.save(
      this.movementRepo.create({
        sessionId: session.id,
        type: movType,
        amount,
        description,
        referenceId: saleId,
        paymentMethod,
        createdBy: cashierId,
      }),
    );
  }

  // ─── Close Session ───────────────────────────────────────────────────────────
  async closeSession(dto: CloseCashSessionDto, cashierId: number): Promise<CashSessionEntity> {
    const session = await this.getActiveSession(cashierId);
    if (!session) throw new BadRequestException('No hay caja abierta para cerrar.');

    // Get current summary to compute expected
    const summary = await this.getSessionSummary(cashierId);
    const expected = summary?.totals?.expectedInDrawer ?? Number(session.openingAmount);
    const difference = Number(dto.closingAmount) - expected;

    await this.movementRepo.save(
      this.movementRepo.create({
        sessionId: session.id,
        type: CashMovementType.CLOSING,
        amount: dto.closingAmount,
        description: dto.closingNotes || 'Cierre de caja',
        createdBy: cashierId,
      }),
    );

    await this.sessionRepo.update(session.id, {
      status: CashSessionStatus.CLOSED,
      closingAmount: dto.closingAmount,
      expectedAmount: expected,
      difference,
      closingNotes: dto.closingNotes ?? null,
      closedAt: new Date(),
    });

    return this.getSessionById(session.id);
  }

  // ─── History ─────────────────────────────────────────────────────────────────
  async getHistory(page = 1, limit = 20, cashierId?: number): Promise<any> {
    const qb = this.sessionRepo.createQueryBuilder('s')
      .leftJoinAndSelect('s.cashier', 'u')
      .leftJoinAndSelect('s.establishment', 'e')
      .orderBy('s.id', 'DESC');

    if (cashierId) qb.andWhere('s.cashier_id = :cashierId', { cashierId });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page, limit };
  }
}
