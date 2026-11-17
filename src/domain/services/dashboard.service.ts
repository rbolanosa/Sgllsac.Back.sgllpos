import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleEntity, SaleStatus, DocumentType } from '../entities/sale.entity';
import { SaleItemEntity } from '../entities/sale-item.entity';
import { ProductEntity } from '../entities/product.entity';

export type DashboardPeriod = 'today' | '7d' | '30d' | 'month';

const TZ = 'America/Lima';
const DAY = 24 * 60 * 60 * 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Documentos que cuentan como venta (las notas de crédito/débito no) */
const SALE_DOCS = [DocumentType.BOLETA, DocumentType.FACTURA, DocumentType.NOTA_VENTA];

/** YYYY-MM-DD en hora de Lima */
export const limaDay = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Hora (0-23) en Lima */
const limaHour = (d: Date) =>
  Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(d));

/** Medianoche de Lima (UTC-5, sin horario de verano) del día YYYY-MM-DD */
const limaMidnight = (ymd: string) => new Date(`${ymd}T00:00:00-05:00`);

const addDays = (ymd: string, n: number) => limaDay(new Date(limaMidnight(ymd).getTime() + n * DAY + 12 * 60 * 60 * 1000));

/**
 * Rango del periodo y del periodo anterior de la misma duración, en días de Lima.
 * 'month' compara el mes en curso con los mismos días del mes anterior.
 */
export function periodRange(period: DashboardPeriod, now = new Date()) {
  const today = limaDay(now);
  let start: string;
  if (period === 'today') start = today;
  else if (period === '7d') start = addDays(today, -6);
  else if (period === '30d') start = addDays(today, -29);
  else start = `${today.slice(0, 8)}01`;

  const days = Math.round((limaMidnight(today).getTime() - limaMidnight(start).getTime()) / DAY) + 1;
  let prevStart: string;
  let prevEnd: string;
  if (period === 'month') {
    const [y, m] = today.split('-').map(Number);
    const pm = m === 1 ? 12 : m - 1;
    const py = m === 1 ? y - 1 : y;
    prevStart = `${py}-${String(pm).padStart(2, '0')}-01`;
    const lastPrev = new Date(Date.UTC(py, pm, 0)).getUTCDate();
    prevEnd = `${py}-${String(pm).padStart(2, '0')}-${String(Math.min(days, lastPrev)).padStart(2, '0')}`;
  } else {
    prevEnd = addDays(start, -1);
    prevStart = addDays(prevEnd, -(days - 1));
  }
  return { start, end: today, prevStart, prevEnd, days };
}

interface Totals { revenue: number; count: number; tax: number; avgTicket: number; net: number }

const totalsOf = (rows: { total: number; tax: number }[]): Totals => {
  const revenue = round2(rows.reduce((s, r) => s + r.total, 0));
  const tax = round2(rows.reduce((s, r) => s + r.tax, 0));
  return { revenue, count: rows.length, tax, avgTicket: rows.length ? round2(revenue / rows.length) : 0, net: round2(revenue - tax) };
};

const pct = (cur: number, prev: number) => (prev > 0 ? round2(((cur - prev) / prev) * 100) : null);

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(SaleEntity) private readonly saleRepo: Repository<SaleEntity>,
    @InjectRepository(SaleItemEntity) private readonly itemRepo: Repository<SaleItemEntity>,
    @InjectRepository(ProductEntity) private readonly productRepo: Repository<ProductEntity>,
  ) {}

  async get(period: DashboardPeriod = '7d') {
    const r = periodRange(period);
    const from = limaMidnight(r.prevStart);
    const to = new Date(limaMidnight(r.end).getTime() + DAY);

    const raw = await this.saleRepo.createQueryBuilder('s')
      .select(['s.id', 's.saleDate', 's.totalAmount', 's.taxAmount', 's.paymentMethod', 's.documentType'])
      .where('s.status = :st', { st: SaleStatus.COMPLETED })
      .andWhere('s.documentType IN (:...docs)', { docs: SALE_DOCS })
      .andWhere('s.saleDate >= :from AND s.saleDate < :to', { from, to })
      .getMany();

    const rows = raw.map((s) => {
      const d = new Date(s.saleDate);
      return {
        id: s.id, day: limaDay(d), hour: limaHour(d),
        total: Number(s.totalAmount), tax: Number(s.taxAmount),
        payment: s.paymentMethod, doc: s.documentType,
      };
    });
    const cur = rows.filter((x) => x.day >= r.start && x.day <= r.end);
    const prev = rows.filter((x) => x.day >= r.prevStart && x.day <= r.prevEnd);
    const curT = totalsOf(cur);
    const prevT = totalsOf(prev);

    // ── Serie diaria (o por hora si el periodo es hoy) con el periodo anterior alineado ──
    let series: { key: string; value: number; count: number; prev: number }[];
    if (period === 'today') {
      series = Array.from({ length: 24 }, (_, h) => ({
        key: String(h).padStart(2, '0'),
        value: round2(cur.filter((x) => x.hour === h).reduce((s, x) => s + x.total, 0)),
        count: cur.filter((x) => x.hour === h).length,
        prev: round2(prev.filter((x) => x.hour === h).reduce((s, x) => s + x.total, 0)),
      }));
    } else {
      series = Array.from({ length: r.days }, (_, i) => {
        const day = addDays(r.start, i);
        const pday = addDays(r.prevStart, i);
        const dayRows = cur.filter((x) => x.day === day);
        return {
          key: day,
          value: round2(dayRows.reduce((s, x) => s + x.total, 0)),
          count: dayRows.length,
          prev: pday <= r.prevEnd ? round2(prev.filter((x) => x.day === pday).reduce((s, x) => s + x.total, 0)) : 0,
        };
      });
    }

    // ── Horas pico del periodo ───────────────────────────────────────────────
    const hours = Array.from({ length: 24 }, (_, h) => {
      const hr = cur.filter((x) => x.hour === h);
      return { hour: h, count: hr.length, revenue: round2(hr.reduce((s, x) => s + x.total, 0)) };
    });

    const group = (key: 'payment' | 'doc') => {
      const m = new Map<string, { count: number; revenue: number }>();
      cur.forEach((x) => {
        const g = m.get(x[key]) ?? { count: 0, revenue: 0 };
        g.count++; g.revenue += x.total;
        m.set(x[key], g);
      });
      return [...m.entries()].map(([k, v]) => ({ key: k, count: v.count, revenue: round2(v.revenue) }))
        .sort((a, b) => b.revenue - a.revenue);
    };

    // ── Productos y utilidad estimada (costo actual del producto) ─────────────
    const curIds = cur.map((x) => x.id);
    const prevIds = prev.map((x) => x.id);
    const productAgg = async (ids: number[]) => ids.length
      ? this.itemRepo.createQueryBuilder('si')
        .leftJoin('si.product', 'p')
        .select('si.productId', 'productId')
        .addSelect('MAX(si.productName)', 'name')
        .addSelect('SUM(COALESCE(si.unitsDeducted, si.quantity))', 'units')
        .addSelect('SUM(si.subtotal)', 'revenue')
        .addSelect('SUM(COALESCE(si.unitsDeducted, si.quantity) * COALESCE(p.costPrice, 0))', 'cost')
        .addSelect('SUM(CASE WHEN COALESCE(p.costPrice, 0) > 0 THEN si.subtotal ELSE 0 END)', 'revenueWithCost')
        .where('si.saleId IN (:...ids)', { ids })
        .groupBy('si.productId')
        .getRawMany()
      : [];
    const [curProducts, prevProducts] = await Promise.all([productAgg(curIds), productAgg(prevIds)]);

    const profitOf = (list: any[]) => {
      const revenueWithCost = list.reduce((s, p) => s + Number(p.revenueWithCost || 0), 0);
      const cost = list.reduce((s, p) => s + Number(p.cost || 0), 0);
      const profit = round2(revenueWithCost - cost);
      return { profit, margin: revenueWithCost > 0 ? round2((profit / revenueWithCost) * 100) : null, coverage: revenueWithCost };
    };
    const curProfit = profitOf(curProducts);
    const prevProfit = profitOf(prevProducts);
    const itemsRevenue = curProducts.reduce((s, p) => s + Number(p.revenue || 0), 0);
    const unitsSold = round2(curProducts.reduce((s, p) => s + Number(p.units || 0), 0));

    const topProducts = curProducts
      .map((p) => ({
        productId: p.productId ? Number(p.productId) : null,
        name: p.name,
        units: round2(Number(p.units || 0)),
        revenue: round2(Number(p.revenue || 0)),
        share: itemsRevenue > 0 ? round2((Number(p.revenue || 0) / itemsRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // ── Comprobantes SUNAT de los últimos 30 días ────────────────────────────
    const sunatFrom = new Date(Date.now() - 30 * DAY);
    const sunatRaw = await this.saleRepo.createQueryBuilder('s')
      .select('UPPER(COALESCE(s.sunatStatus, \'\'))', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('s.documentType IN (:...docs)', { docs: [DocumentType.BOLETA, DocumentType.FACTURA, DocumentType.NOTA_CREDITO] })
      .andWhere('s.saleDate >= :f', { f: sunatFrom })
      .groupBy('status')
      .getRawMany();
    const sunat = { accepted: 0, pending: 0, rejected: 0 };
    sunatRaw.forEach((x) => {
      const st = String(x.status);
      const n = Number(x.count);
      if (st === 'ACEPTADO') sunat.accepted += n;
      else if (st.includes('RECHAZ') || st.includes('ERROR')) sunat.rejected += n;
      else sunat.pending += n;
    });

    // ── Inventario ────────────────────────────────────────────────────────────
    const inv = await this.productRepo.createQueryBuilder('p')
      .select('COUNT(*)', 'products')
      .addSelect('COALESCE(SUM(CASE WHEN p.stockQuantity > 0 THEN p.stockQuantity * p.costPrice ELSE 0 END), 0)', 'stockValue')
      .addSelect('SUM(CASE WHEN p.stockQuantity <= 0 THEN 1 ELSE 0 END)', 'outOfStock')
      .addSelect('SUM(CASE WHEN p.stockQuantity > 0 AND p.stockQuantity <= p.minStockLevel THEN 1 ELSE 0 END)', 'lowStock')
      .where('p.isActive = 1')
      .getRawOne();
    const lowStockList = await this.productRepo.createQueryBuilder('p')
      .select(['p.id', 'p.name', 'p.stockQuantity', 'p.minStockLevel'])
      .where('p.isActive = 1 AND p.stockQuantity <= p.minStockLevel')
      .orderBy('p.stockQuantity', 'ASC')
      .addOrderBy('p.name', 'ASC')
      .take(6)
      .getMany();

    return {
      period,
      range: r,
      generatedAt: new Date().toISOString(),
      kpis: {
        revenue: { value: curT.revenue, prev: prevT.revenue, change: pct(curT.revenue, prevT.revenue) },
        count: { value: curT.count, prev: prevT.count, change: pct(curT.count, prevT.count) },
        avgTicket: { value: curT.avgTicket, prev: prevT.avgTicket, change: pct(curT.avgTicket, prevT.avgTicket) },
        profit: {
          value: curProfit.profit, prev: prevProfit.profit, change: pct(curProfit.profit, prevProfit.profit),
          margin: curProfit.margin,
          // Parte de las ventas cuyo costo se conoce (si es baja, la utilidad es incompleta)
          coverage: itemsRevenue > 0 ? round2((curProfit.coverage / itemsRevenue) * 100) : null,
        },
        net: curT.net,
        tax: curT.tax,
        unitsSold,
      },
      series,
      hours,
      byPayment: group('payment'),
      byDocument: group('doc'),
      topProducts,
      sunat,
      inventory: {
        products: Number(inv?.products ?? 0),
        stockValue: round2(Number(inv?.stockValue ?? 0)),
        outOfStock: Number(inv?.outOfStock ?? 0),
        lowStock: Number(inv?.lowStock ?? 0),
        lowStockList: lowStockList.map((p) => ({
          id: p.id, name: p.name, stock: Number(p.stockQuantity), min: Number(p.minStockLevel),
        })),
      },
    };
  }
}
