import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { QuoteEntity, QuoteItem, QuoteStatus } from '../entities/quote.entity';
import { CompanySettingsEntity } from '../entities/company-settings.entity';
import { SaveQuoteDto } from '../../application/dtos/quote.dto';

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const limaYmd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const addDays = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const ymdOf = (v: string | Date) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
const dmy = (v: string | Date) => ymdOf(v).split('-').reverse().join('/');
const money = (n: number) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Calcula importes. Los precios incluyen IGV, igual que en el POS. */
export function computeQuote(
  items: { quantity: number; unitPrice: number }[],
  discount: number,
  igvRate: number,
) {
  const gross = round2(items.reduce((s, i) => s + round2(Number(i.quantity) * Number(i.unitPrice)), 0));
  const disc = round2(Number(discount || 0));
  if (disc > gross) throw new BadRequestException('El descuento no puede ser mayor que el total');
  const total = round2(gross - disc);
  const factor = 1 + (Number(igvRate) || 0) / 100;
  const taxable = round2(total / factor);
  return { gross, discount: disc, total, taxable, tax: round2(total - taxable) };
}

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);

  constructor(
    @InjectRepository(QuoteEntity) private readonly repo: Repository<QuoteEntity>,
    @InjectRepository(CompanySettingsEntity) private readonly companyRepo: Repository<CompanySettingsEntity>,
  ) {}

  private async igvRate(): Promise<number> {
    const company = await this.companyRepo.findOne({ where: {} }).catch(() => null);
    const rate = Number(company?.igvRate);
    return Number.isFinite(rate) && rate >= 0 ? rate : 18;
  }

  private toView(q: QuoteEntity) {
    let items: QuoteItem[] = [];
    try { items = JSON.parse(q.itemsJson || '[]'); } catch { items = []; }
    const today = limaYmd(new Date());
    const { itemsJson, ...rest } = q;
    return {
      ...rest,
      issueDate: ymdOf(q.issueDate),
      validUntil: ymdOf(q.validUntil),
      discount: Number(q.discount), taxable: Number(q.taxable), tax: Number(q.tax), total: Number(q.total),
      expired: q.status === 'PENDIENTE' && ymdOf(q.validUntil) < today,
      items,
    };
  }

  private buildItems(dto: SaveQuoteDto): QuoteItem[] {
    return dto.items.map((i) => {
      const quantity = Number(i.quantity);
      const unitPrice = Number(i.unitPrice);
      return {
        productId: i.productId ?? null,
        description: i.description.trim(),
        unit: (i.unit || 'UND').trim().toUpperCase().slice(0, 20),
        quantity,
        unitPrice,
        subtotal: round2(quantity * unitPrice),
      };
    });
  }

  private clean(v?: string | null) {
    const s = (v ?? '').trim();
    return s ? s : null;
  }

  async findAll(opts: { page: number; limit: number; search?: string; status?: string }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 20));
    const qb = this.repo.createQueryBuilder('q').orderBy('q.id', 'DESC').skip((page - 1) * limit).take(limit);
    const today = limaYmd(new Date());
    if (opts.status === 'VENCIDA') {
      qb.andWhere('q.status = :p AND q.validUntil < :today', { p: 'PENDIENTE', today });
    } else if (opts.status === 'PENDIENTE') {
      qb.andWhere('q.status = :p AND q.validUntil >= :today', { p: 'PENDIENTE', today });
    } else if (opts.status) {
      qb.andWhere('q.status = :st', { st: opts.status });
    }
    const term = (opts.search || '').trim();
    if (term) {
      qb.andWhere(new Brackets((w) => {
        w.where('q.customerName LIKE :t', { t: `%${term}%` })
          .orWhere('q.customerDoc LIKE :t')
          .orWhere('q.number LIKE :t');
      }));
    }
    const [rows, total] = await qb.getManyAndCount();
    return { data: rows.map((r) => this.toView(r)), total, page, limit };
  }

  async findOne(id: number) {
    const q = await this.repo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    return this.toView(q);
  }

  async create(dto: SaveQuoteDto, userId?: number) {
    const items = this.buildItems(dto);
    const amounts = computeQuote(items, dto.discount ?? 0, await this.igvRate());
    const issueDate = limaYmd(new Date());

    return this.repo.manager.transaction(async (em) => {
      const saved = await em.save(QuoteEntity, em.create(QuoteEntity, {
        customerId: dto.customerId ?? null,
        customerName: dto.customerName.trim(),
        customerDoc: this.clean(dto.customerDoc),
        customerPhone: this.clean(dto.customerPhone),
        customerAddress: this.clean(dto.customerAddress),
        issueDate,
        validUntil: addDays(issueDate, dto.validDays),
        status: 'PENDIENTE' as QuoteStatus,
        itemsJson: JSON.stringify(items),
        discount: amounts.discount, taxable: amounts.taxable, tax: amounts.tax, total: amounts.total,
        notes: this.clean(dto.notes),
        publicToken: randomBytes(16).toString('hex'),
        createdBy: userId ?? null,
      }));
      // Número correlativo a partir del id: único sin bloquear la tabla.
      saved.number = `COT-${saved.id}`;
      await em.update(QuoteEntity, saved.id, { number: saved.number });
      return this.toView(saved);
    });
  }

  async update(id: number, dto: SaveQuoteDto) {
    const q = await this.repo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    if (q.status !== 'PENDIENTE') throw new BadRequestException('Solo se puede editar una cotización pendiente');
    const items = this.buildItems(dto);
    const amounts = computeQuote(items, dto.discount ?? 0, await this.igvRate());
    Object.assign(q, {
      customerId: dto.customerId ?? null,
      customerName: dto.customerName.trim(),
      customerDoc: this.clean(dto.customerDoc),
      customerPhone: this.clean(dto.customerPhone),
      customerAddress: this.clean(dto.customerAddress),
      validUntil: addDays(ymdOf(q.issueDate), dto.validDays),
      itemsJson: JSON.stringify(items),
      discount: amounts.discount, taxable: amounts.taxable, tax: amounts.tax, total: amounts.total,
      notes: this.clean(dto.notes),
    });
    return this.toView(await this.repo.save(q));
  }

  async setStatus(id: number, status: QuoteStatus) {
    const q = await this.repo.findOne({ where: { id } });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    if (q.status === 'ANULADA') throw new BadRequestException('La cotización está anulada');
    q.status = status;
    return this.toView(await this.repo.save(q));
  }

  // ── PDF A4 ────────────────────────────────────────────────────────────────
  async generatePdfByToken(token: string): Promise<{ buffer: Buffer; fileName: string }> {
    if (!/^[a-f0-9]{32}$/.test(token || '')) throw new NotFoundException('Cotización no encontrada');
    const q = await this.repo.findOne({ where: { publicToken: token } });
    if (!q) throw new NotFoundException('Cotización no encontrada');
    const view = this.toView(q);
    const company: any = await this.companyRepo.findOne({ where: {} }).catch(() => null);

    let logo: Buffer | null = null;
    const logoUrl: string | null = company?.logoUrl || null;
    if (logoUrl) {
      try {
        if (logoUrl.startsWith('http')) {
          const axios = await import('axios');
          const r = await axios.default.get(logoUrl, { responseType: 'arraybuffer', timeout: 5000 });
          logo = Buffer.from(r.data);
        } else {
          const full = path.join(process.cwd(), logoUrl.replace(/^\//, ''));
          if (fs.existsSync(full)) logo = fs.readFileSync(full);
        }
      } catch { /* sin logo */ }
    }

    const igv = Number(company?.igvRate ?? 18);
    const gross = round2(view.items.reduce((s, i) => s + Number(i.subtotal), 0));
    const ink = '#1f2937', muted = '#6b7280', line = '#e5e7eb', brand = '#1d4ed8';

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const L = 40, R = doc.page.width - 40, W = R - L;

      // Encabezado: empresa a la izquierda, recuadro con el número a la derecha
      let x = L;
      if (logo) {
        try { doc.image(logo, L, 40, { fit: [70, 70] }); x = L + 82; } catch { /* logo inválido */ }
      }
      const name = (company?.nombreComercial || company?.razonSocial || '').toUpperCase();
      doc.fillColor(ink).font('Helvetica-Bold').fontSize(13).text(name, x, 44, { width: 280 });
      doc.font('Helvetica').fontSize(8.5).fillColor(muted);
      if (company?.razonSocial && company?.razonSocial.toUpperCase() !== name) doc.text(company.razonSocial, x, doc.y + 2, { width: 280 });
      if (company?.direccion) doc.text(company.direccion, x, doc.y + 2, { width: 280 });
      const contact = [company?.telefono && `Tel. ${company.telefono}`, company?.email].filter(Boolean).join('  ·  ');
      if (contact) doc.text(contact, x, doc.y + 2, { width: 280 });

      const bx = R - 170;
      doc.roundedRect(bx, 40, 170, 70, 6).lineWidth(1).strokeColor(brand).stroke();
      doc.fillColor(muted).font('Helvetica').fontSize(8.5).text(`RUC ${company?.ruc || ''}`, bx, 52, { width: 170, align: 'center' });
      doc.fillColor(brand).font('Helvetica-Bold').fontSize(12).text('COTIZACIÓN', bx, 67, { width: 170, align: 'center' });
      doc.fillColor(ink).fontSize(11).text(view.number || '', bx, 85, { width: 170, align: 'center' });

      // Datos del cliente y fechas
      let y = 130;
      doc.moveTo(L, y).lineTo(R, y).lineWidth(0.6).strokeColor(line).stroke();
      y += 10;
      const field = (label: string, value: string, fx: number, fy: number, w: number) => {
        doc.fillColor(muted).font('Helvetica').fontSize(7.5).text(label.toUpperCase(), fx, fy, { width: w });
        doc.fillColor(ink).font('Helvetica').fontSize(9.5).text(value || '—', fx, fy + 10, { width: w });
      };
      field('Cliente', view.customerName, L, y, 300);
      field('Fecha de emisión', dmy(view.issueDate), R - 200, y, 95);
      field('Válida hasta', dmy(view.validUntil), R - 100, y, 100);
      y += 32;
      field('RUC / DNI', view.customerDoc || '', L, y, 140);
      field('Teléfono', view.customerPhone || '', L + 150, y, 140);
      field('Moneda', 'Soles (PEN)', R - 200, y, 95);
      y += 32;
      if (view.customerAddress) { field('Dirección', view.customerAddress, L, y, W); y += 32; }

      // Tabla de productos
      y += 6;
      const cols = [
        { k: '#', w: 24, a: 'center' as const },
        { k: 'Descripción', w: W - 24 - 50 - 55 - 80 - 85, a: 'left' as const },
        { k: 'Unidad', w: 50, a: 'center' as const },
        { k: 'Cant.', w: 55, a: 'right' as const },
        { k: 'P. Unit.', w: 80, a: 'right' as const },
        { k: 'Importe', w: 85, a: 'right' as const },
      ];
      const header = () => {
        doc.rect(L, y, W, 20).fill('#f3f4f6');
        let cx = L;
        doc.fillColor(ink).font('Helvetica-Bold').fontSize(8.5);
        cols.forEach((c) => { doc.text(c.k, cx + 5, y + 6, { width: c.w - 10, align: c.a }); cx += c.w; });
        y += 20;
      };
      header();
      doc.font('Helvetica').fontSize(9);
      view.items.forEach((it, idx) => {
        const h = Math.max(18, doc.heightOfString(it.description, { width: cols[1].w - 10 }) + 8);
        if (y + h > doc.page.height - 190) { doc.addPage(); y = 40; header(); doc.font('Helvetica').fontSize(9); }
        const vals = [
          String(idx + 1), it.description, it.unit,
          Number(it.quantity).toLocaleString('es-PE', { maximumFractionDigits: 3 }),
          Number(it.unitPrice).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
          Number(it.subtotal).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ];
        let cx = L;
        doc.fillColor(ink);
        cols.forEach((c, i) => { doc.text(vals[i], cx + 5, y + 4, { width: c.w - 10, align: c.a }); cx += c.w; });
        y += h;
        doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).strokeColor(line).stroke();
      });

      // Totales
      y += 12;
      const tx = R - 220;
      const row = (label: string, value: string, bold = false) => {
        doc.fillColor(bold ? ink : muted).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9);
        doc.text(label, tx, y, { width: 120 });
        doc.fillColor(ink).text(value, tx + 120, y, { width: 100, align: 'right' });
        y += bold ? 18 : 14;
      };
      if (view.discount > 0) { row('Subtotal', money(gross)); row('Descuento', `- ${money(view.discount)}`); }
      row('Op. gravada', money(view.taxable));
      row(`IGV (${igv}%)`, money(view.tax));
      doc.moveTo(tx, y).lineTo(R, y).lineWidth(0.6).strokeColor(line).stroke();
      y += 6;
      row('TOTAL', money(view.total), true);

      // Observaciones y pie
      y += 10;
      if (view.notes) {
        doc.fillColor(muted).font('Helvetica-Bold').fontSize(8).text('OBSERVACIONES', L, y);
        doc.fillColor(ink).font('Helvetica').fontSize(9).text(view.notes, L, doc.y + 3, { width: W - 240 });
        y = doc.y + 10;
      }
      doc.fillColor(muted).font('Helvetica').fontSize(8)
        .text(`Precios incluyen IGV. Cotización válida hasta el ${dmy(view.validUntil)}; precios y stock sujetos a disponibilidad.`, L, Math.max(y, doc.y + 6), { width: W })
        .text('Este documento no es un comprobante de pago.', L, doc.y + 2, { width: W });

      doc.end();
    });

    return { buffer, fileName: `${view.number || 'cotizacion'}.pdf` };
  }
}
