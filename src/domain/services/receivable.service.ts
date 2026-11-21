import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Brackets } from 'typeorm';
import {
  ReceivableEntity, ReceivableInstallmentEntity, ReceivablePaymentEntity,
} from '../entities/receivable.entity';
import { SaleEntity, SaleStatus } from '../entities/sale.entity';
import { CustomerEntity } from '../entities/customer.entity';
import { CashMovementEntity, CashMovementType } from '../entities/cash-movement.entity';
import { CashService } from './cash.service';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const limaYmd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** DATE de MySQL llega como Date a medianoche local o como texto: siempre "YYYY-MM-DD" */
export const ymdOf = (v: any) => (v instanceof Date
  ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  : String(v).slice(0, 10));

export const PAYMENT_METHODS = ['cash', 'yape', 'plin', 'card', 'transfer'] as const;

/**
 * Reparte un abono entre las cuotas, de la más antigua a la más nueva.
 * Devuelve cuánto se aplica a cada cuota (mismo orden).
 */
export function allocatePayment(installments: { amount: number; paidAmount: number }[], amount: number): number[] {
  let rest = round2(amount);
  return installments.map((i) => {
    const pending = round2(Number(i.amount) - Number(i.paidAmount));
    const applied = Math.max(0, Math.min(pending, rest));
    rest = round2(rest - applied);
    return applied;
  });
}

@Injectable()
export class ReceivableService {
  constructor(
    @InjectRepository(ReceivableEntity) private readonly repo: Repository<ReceivableEntity>,
    @InjectRepository(ReceivableInstallmentEntity) private readonly installmentRepo: Repository<ReceivableInstallmentEntity>,
    private readonly dataSource: DataSource,
    private readonly cashService: CashService,
  ) {}

  /** Estado real: si la venta se anuló (o tiene nota de crédito), la deuda ya no corre */
  private effectiveStatus(r: ReceivableEntity, saleStatus: string | null, overdue: number) {
    if (r.status === 'ANULADA' || (saleStatus && saleStatus !== SaleStatus.COMPLETED)) return 'ANULADA';
    if (r.status === 'PAGADA') return 'PAGADA';
    return overdue > 0 ? 'VENCIDA' : 'PENDIENTE';
  }

  async findAll(opts: { page: number; limit: number; status?: string; search?: string }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 20));
    const today = limaYmd(new Date());

    const qb = this.repo.createQueryBuilder('r')
      .innerJoin(SaleEntity, 's', 's.id = r.saleId')
      .innerJoin(CustomerEntity, 'c', 'c.id = r.customerId')
      .select([
        'r.id AS id', 'r.saleId AS saleId', 'r.documentNumber AS documentNumber', 'r.total AS total', 'r.paid AS paid',
        'r.status AS status', 'r.createdAt AS createdAt', 's.status AS saleStatus', 's.documentType AS documentType',
        'c.id AS customerId', 'c.name AS customerName', 'c.nit AS customerDoc', 'c.phone AS customerPhone',
      ])
      .addSelect(`(SELECT MIN(i.due_date) FROM receivable_installments i
        WHERE i.receivable_id = r.id AND i.amount > i.paid_amount)`, 'nextDue')
      .addSelect(`(SELECT COALESCE(SUM(i.amount - i.paid_amount), 0) FROM receivable_installments i
        WHERE i.receivable_id = r.id AND i.amount > i.paid_amount AND i.due_date < :today)`, 'overdue')
      .setParameter('today', today)
      .orderBy('r.id', 'DESC');

    const term = (opts.search || '').trim();
    if (term) {
      qb.andWhere(new Brackets((w) => {
        w.where('c.name LIKE :t', { t: `%${term}%` }).orWhere('c.nit LIKE :t').orWhere('r.documentNumber LIKE :t');
      }));
    }
    const open = `r.status = 'PENDIENTE' AND s.status = '${SaleStatus.COMPLETED}'`;
    const hasOverdue = `EXISTS (SELECT 1 FROM receivable_installments i
      WHERE i.receivable_id = r.id AND i.amount > i.paid_amount AND i.due_date < :today)`;
    if (opts.status === 'PENDIENTE') qb.andWhere(`${open} AND NOT ${hasOverdue}`);
    else if (opts.status === 'VENCIDA') qb.andWhere(`${open} AND ${hasOverdue}`);
    else if (opts.status === 'ABIERTA') qb.andWhere(open);
    else if (opts.status === 'PAGADA') qb.andWhere(`r.status = 'PAGADA'`);
    else if (opts.status === 'ANULADA') qb.andWhere(`(r.status = 'ANULADA' OR s.status <> '${SaleStatus.COMPLETED}')`);

    const total = await qb.clone().getCount();
    const rows = await qb.offset((page - 1) * limit).limit(limit).getRawMany();
    return {
      data: rows.map((r) => {
        const totalAmt = Number(r.total);
        const paid = Number(r.paid);
        const overdue = round2(Number(r.overdue || 0));
        const status = this.effectiveStatus(r as any, r.saleStatus, overdue);
        return {
          id: r.id, saleId: r.saleId, documentNumber: r.documentNumber, documentType: r.documentType,
          customer: { id: r.customerId, name: r.customerName, doc: r.customerDoc, phone: r.customerPhone },
          total: totalAmt, paid, balance: status === 'ANULADA' ? 0 : round2(totalAmt - paid),
          overdue: status === 'ANULADA' ? 0 : overdue,
          nextDue: r.nextDue ? ymdOf(r.nextDue) : null,
          status, createdAt: r.createdAt,
        };
      }),
      total, page, limit,
    };
  }

  async summary() {
    const today = limaYmd(new Date());
    const soon = new Date(`${today}T12:00:00Z`);
    soon.setUTCDate(soon.getUTCDate() + 7);
    const row = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(i.amount - i.paid_amount), 0) AS balance,
         COALESCE(SUM(CASE WHEN i.due_date < ? THEN i.amount - i.paid_amount ELSE 0 END), 0) AS overdue,
         COALESCE(SUM(CASE WHEN i.due_date >= ? AND i.due_date <= ? THEN i.amount - i.paid_amount ELSE 0 END), 0) AS dueSoon,
         COUNT(DISTINCT r.customer_id) AS customers
       FROM receivable_installments i
       JOIN receivables r ON r.id = i.receivable_id
       JOIN sales s ON s.id = r.sale_id
       WHERE r.status = 'PENDIENTE' AND s.status = ? AND i.amount > i.paid_amount`,
      [today, today, soon.toISOString().slice(0, 10), SaleStatus.COMPLETED],
    );
    const r = row?.[0] ?? {};
    return {
      balance: round2(Number(r.balance || 0)),
      overdue: round2(Number(r.overdue || 0)),
      dueSoon: round2(Number(r.dueSoon || 0)),
      customers: Number(r.customers || 0),
    };
  }

  async findOne(id: number) {
    const r = await this.repo.findOne({ where: { id }, relations: { installments: true, payments: true } });
    if (!r) throw new NotFoundException('Cuenta por cobrar no encontrada');
    const sale = await this.dataSource.getRepository(SaleEntity).findOne({ where: { id: r.saleId } });
    const customer = await this.dataSource.getRepository(CustomerEntity).findOne({ where: { id: r.customerId } });
    const today = limaYmd(new Date());
    const installments = [...r.installments].sort((a, b) => a.number - b.number).map((i) => {
      const pending = round2(Number(i.amount) - Number(i.paidAmount));
      const due = ymdOf(i.dueDate);
      return {
        id: i.id, number: i.number, dueDate: due, amount: Number(i.amount), paidAmount: Number(i.paidAmount),
        pending, note: i.note, status: pending <= 0 ? 'PAGADA' : due < today ? 'VENCIDA' : 'PENDIENTE',
      };
    });
    const overdue = round2(installments.filter((i) => i.status === 'VENCIDA').reduce((s, i) => s + i.pending, 0));
    const status = this.effectiveStatus(r, sale?.status ?? null, overdue);
    return {
      id: r.id, saleId: r.saleId, documentNumber: r.documentNumber, documentType: sale?.documentType,
      sunatStatus: sale?.sunatStatus ?? null, saleDate: sale?.saleDate,
      customer: customer ? { id: customer.id, name: customer.name, doc: customer.nit, phone: customer.phone } : null,
      total: Number(r.total), paid: Number(r.paid), balance: status === 'ANULADA' ? 0 : round2(Number(r.total) - Number(r.paid)),
      overdue, status, installments,
      payments: [...r.payments].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).map((p) => ({
        id: p.id, amount: Number(p.amount), method: p.method, note: p.note, createdAt: p.createdAt,
      })),
    };
  }

  /** Registra un abono: se aplica a las cuotas más antiguas y, si es efectivo, entra a la caja abierta */
  async addPayment(id: number, dto: { amount: number; method: string; note?: string }, userId?: number) {
    const amount = round2(Number(dto.amount));
    if (!(amount > 0)) throw new BadRequestException('El abono debe ser mayor a cero');

    const result = await this.dataSource.transaction(async (manager) => {
      const r = await manager.findOne(ReceivableEntity, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!r) throw new NotFoundException('Cuenta por cobrar no encontrada');
      const sale = await manager.findOne(SaleEntity, { where: { id: r.saleId } });
      if (r.status !== 'PENDIENTE' || sale?.status !== SaleStatus.COMPLETED) {
        throw new BadRequestException(r.status === 'PAGADA' ? 'Esta cuenta ya está pagada' : 'La venta está anulada');
      }
      const balance = round2(Number(r.total) - Number(r.paid));
      if (amount > balance + 0.001) {
        throw new BadRequestException(`El abono supera la deuda (S/ ${balance.toFixed(2)})`);
      }

      const installments = await manager.find(ReceivableInstallmentEntity, {
        where: { receivableId: r.id }, order: { dueDate: 'ASC', number: 'ASC' },
      });
      const applied = allocatePayment(installments.map((i) => ({ amount: Number(i.amount), paidAmount: Number(i.paidAmount) })), amount);
      for (let k = 0; k < installments.length; k++) {
        if (applied[k] > 0) {
          await manager.update(ReceivableInstallmentEntity, installments[k].id, {
            paidAmount: round2(Number(installments[k].paidAmount) + applied[k]),
          });
        }
      }

      const paid = round2(Number(r.paid) + amount);
      await manager.update(ReceivableEntity, r.id, { paid, status: paid >= Number(r.total) - 0.001 ? 'PAGADA' : 'PENDIENTE' });
      const payment = await manager.save(manager.create(ReceivablePaymentEntity, {
        receivableId: r.id, amount, method: dto.method, note: dto.note?.trim() || null, createdBy: userId ?? null,
      }));
      const customer = await manager.findOne(CustomerEntity, { where: { id: r.customerId } });
      return { r, payment, customerName: customer?.name ?? '' };
    });

    // El efectivo cobrado entra a la caja abierta del usuario (si tiene una)
    let cashRegistered = false;
    if (dto.method === 'cash' && userId) {
      const session = await this.cashService.getActiveSession(userId).catch(() => null);
      if (session) {
        const [serie, corr] = result.r.documentNumber.split('-');
        const shortNum = corr && /^\d+$/.test(corr) ? `${serie}-${parseInt(corr, 10)}` : result.r.documentNumber;
        await this.dataSource.getRepository(CashMovementEntity).save({
          sessionId: session.id,
          type: CashMovementType.DEPOSIT,
          amount,
          description: `Cobro de ${shortNum}${result.customerName ? ` (${result.customerName})` : ''}`,
          referenceId: result.r.saleId,
          paymentMethod: 'cash',
          createdBy: userId,
        });
        cashRegistered = true;
      }
    }
    return { ...(await this.findOne(id)), cashRegistered };
  }
}
