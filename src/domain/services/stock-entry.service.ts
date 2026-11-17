import {
  Injectable, BadRequestException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { ProductPresentationEntity } from '../entities/product-presentation.entity';
import { ProductBatchEntity } from '../entities/product-batch.entity';
import { SupplierEntity } from '../entities/supplier.entity';
import { PurchaseOrderEntity, PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { PurchaseOrderItemEntity, PurchaseUnit } from '../entities/purchase-order-item.entity';
import {
  InventoryMovementEntity, MovementType, MovementReferenceType,
} from '../entities/inventory-movement.entity';
import { StockEntryEntity } from '../entities/stock-entry.entity';
import { SupplierProductMapEntity } from '../entities/supplier-product-map.entity';
import {
  PreviewStockEntryDto, ConfirmStockEntryDto, ConfirmLineDto,
} from '../../application/dtos/stock-entry.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Mayúsculas, sin tildes y solo letras/números separados por un espacio */
export const normalizeText = (s: string) =>
  String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

/** Clave para recordar una línea del proveedor: por código o, si no hay, por descripción */
export const matchKeyOf = (code: string | undefined, description: string) =>
  code?.trim() ? `C:${code.trim().toUpperCase()}` : `D:${normalizeText(description).slice(0, 240)}`;

/** Abreviaturas comunes en facturas de distribuidoras */
const ABBREVIATIONS: Record<string, string> = {
  SH: 'SHAMPOO', SHAMP: 'SHAMPOO', ACOND: 'ACONDICIONADOR', DEO: 'DESODORANTE', DES: 'DESODORANTE',
  MERMELAD: 'MERMELADA', MERM: 'MERMELADA', CHOC: 'CHOCOLATE', ACEIT: 'ACEITE', DET: 'DETERGENTE',
  LAVAV: 'LAVAVAJILLA', GALL: 'GALLETA', GALLET: 'GALLETA', LECH: 'LECHE', BEB: 'BEBIDA',
  GRS: 'G', GR: 'G', GRM: 'G', GRAMOS: 'G', KGS: 'KG', KILO: 'KG', LT: 'L', LTS: 'L', LTR: 'L', LITRO: 'L', CC: 'ML',
};

/** Palabras de empaque que no ayudan a identificar el producto */
const NOISE = new Set(['X', 'CAJA', 'CJA', 'CJ', 'PAQ', 'PAQUETE', 'TIRA', 'TIRAS', 'UND', 'UNID', 'UNIDAD', 'UNIDADES',
  'BOLSA', 'BOL', 'FCO', 'FRASCO', 'PIC', 'SCH', 'SACHET', 'DE', 'CON', 'Y', 'EN', 'LA', 'EL', 'BONIF', 'IMA', 'U', 'UN']);

/**
 * Palabras clave de una descripción: sin empaques ni multiplicadores.
 * "SEDAL SH CERAMIDAS 12X650ML" → SEDAL, SHAMPOO, CERAMIDAS y la medida 650ML.
 */
export function keywords(text: string): { words: Set<string>; sizes: Set<string> } {
  let t = normalizeText(text).replace(/(\d)\s+(ML|G|GR|GRS|KG|L|LT|LTS|CC)\b/g, '$1$2'); // "650 ML" → "650ML"
  // "12X650ML", "16X6X40ML" → "650ML", "40ML" (se repite para varios multiplicadores)
  for (let prev = ''; prev !== t;) { prev = t; t = t.replace(/(^|\s)\d+\s*X\s*(?=\d)/g, '$1'); }
  t = t.replace(/(^|\s)X\s*\d+(?=\s|$)/g, ' ');                   // "X12", "X 24" → fuera
  const words = new Set<string>();
  const sizes = new Set<string>();
  for (const raw of t.split(' ')) {
    if (!raw) continue;
    const m = raw.match(/^(\d+(?:\.\d+)?)(ML|G|GR|GRS|GRM|KG|KGS|L|LT|LTS|LTR|CC)$/);
    if (m) {
      const unit = ABBREVIATIONS[m[2]] ?? m[2];
      let n = Number(m[1]);
      let u = unit;
      if (u === 'KG') { n *= 1000; u = 'G'; }
      if (u === 'L') { n *= 1000; u = 'ML'; }
      sizes.add(`${n}${u}`);
      continue;
    }
    const w = ABBREVIATIONS[raw] ?? raw;
    if (w.length < 2 || NOISE.has(w) || /^\d+$/.test(w)) continue;
    words.add(w);
  }
  return { words, sizes };
}

/**
 * Parecido entre dos descripciones (0 a 1).
 * Cuenta palabras en común (también si una empieza con la otra: MERMELAD ~ MERMELADA)
 * y descarta si las medidas no coinciden (650ML no es 400ML).
 */
export function similarity(a: string, b: string): number {
  const ka = keywords(a);
  const kb = keywords(b);
  if (!ka.words.size || !kb.words.size) return 0;
  let common = 0;
  ka.words.forEach((w) => {
    if (kb.words.has(w)) { common++; return; }
    for (const v of kb.words) {
      if (w.length >= 4 && v.length >= 4 && (w.startsWith(v) || v.startsWith(w))) { common += 0.8; return; }
    }
  });
  let score = (2 * common) / (ka.words.size + kb.words.size);
  if (ka.sizes.size && kb.sizes.size) {
    const sizeMatch = [...ka.sizes].some((x) => kb.sizes.has(x));
    score = sizeMatch ? Math.min(1, score + 0.2) : score * 0.4;
  }
  return Math.round(score * 100) / 100;
}

const normalizeInvoice = (s: string) => {
  const [serie, num] = s.trim().toUpperCase().split('-');
  return `${serie}-${Number(num)}`;
};

const IGV = 1.18;

/** 1.18 si la factura muestra precios sin IGV; 1 si ya lo incluyen (lo común) */
const igvFactor = (dto: Pick<ConfirmStockEntryDto, 'pricesIncludeIgv'>) => (dto.pricesIncludeIgv === false ? IGV : 1);

/** Costo por unidad (con IGV) de una línea */
export const lineUnitCost = (l: Pick<ConfirmLineDto, 'unitPrice' | 'factor'>, igv = 1) =>
  round4((Number(l.unitPrice) * igv) / Number(l.factor));

/** Total a pagar según las líneas: (suma × IGV si hace falta) + otros cargos / descuentos */
export const invoiceSum = (dto: Pick<ConfirmStockEntryDto, 'lines' | 'pricesIncludeIgv' | 'otherAmount'>) =>
  round2(dto.lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitPrice), 0) * igvFactor(dto) + Number(dto.otherAmount || 0));

type CatalogProduct = Pick<ProductEntity,
  'id' | 'name' | 'barcode' | 'sku' | 'stockQuantity' | 'costPrice' | 'salePrice' |
  'hasBoxPresentation' | 'unitsPerBox' | 'boxUnitName'>;

/**
 * Línea que define el producto nuevo cuando varias comparten nombre: la que trae precio
 * (no la bonificación) y, entre esas, la de empaque más grande para conservar la caja.
 */
export function pickBaseLine<T extends Pick<ConfirmLineDto, 'factor' | 'unitPrice'>>(lines: T[]): T {
  const priced = lines.filter((l) => Number(l.unitPrice) > 0);
  const pool = priced.length ? priced : lines;
  return pool.reduce((best, l) => (Number(l.factor) > Number(best.factor) ? l : best), pool[0]);
}

@Injectable()
export class StockEntryService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(SupplierEntity)
    private readonly supplierRepo: Repository<SupplierEntity>,
    @InjectRepository(StockEntryEntity)
    private readonly entryRepo: Repository<StockEntryEntity>,
    @InjectRepository(SupplierProductMapEntity)
    private readonly mapRepo: Repository<SupplierProductMapEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(page = 1, limit = 20) {
    const [data, total] = await this.entryRepo.findAndCount({
      order: { id: 'DESC' }, skip: (page - 1) * limit, take: limit,
    });
    return { data, total, page, limit };
  }

  /** Productos que ingresaron con una factura: cantidades, empaque, costo y si se crearon ahí */
  async findOne(id: number) {
    const entry = await this.entryRepo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException(`Factura cargada #${id} no encontrada`);
    if (!entry.purchaseOrderId) return { ...entry, items: [] };

    const rows: any[] = await this.dataSource.query(
      `SELECT i.id, i.product_id AS productId, p.name, p.barcode,
              i.quantity_received AS units, i.unit_cost AS unitCost, i.subtotal,
              p.stock_quantity AS currentStock, p.sale_price AS salePrice,
              m.notes AS note,
              -- Nuevo: este ingreso fue el primer movimiento de stock del producto
              NOT EXISTS (SELECT 1 FROM inventory_movements o
                           WHERE o.product_id = i.product_id AND o.id < m.id) AS isNew
         FROM purchase_order_items i
         LEFT JOIN products p ON p.id = i.product_id
         LEFT JOIN inventory_movements m ON m.id = (
              SELECT MIN(x.id) FROM inventory_movements x
               WHERE x.reference_type = 'purchase_order' AND x.reference_id = i.purchase_order_id
                 AND x.product_id = i.product_id)
        WHERE i.purchase_order_id = ?
        ORDER BY i.id`,
      [entry.purchaseOrderId],
    );

    const items = rows.map((r) => {
      // La nota guarda el empaque de la factura: "Factura F001-1 (2 CAJA x 12)"
      const pack = /\(([\d.]+)\s+(.*?)\s+x\s+([\d.]+)\)\s*$/.exec(r.note || '');
      return {
        id: r.id,
        productId: r.productId,
        name: r.name ?? '(producto eliminado)',
        barcode: r.barcode,
        packages: pack ? Number(pack[1]) : null,
        packageLabel: pack ? pack[2] : null,
        factor: pack ? Number(pack[3]) : null,
        units: Number(r.units),
        unitCost: Number(r.unitCost),
        subtotal: Number(r.subtotal),
        salePrice: r.salePrice != null ? Number(r.salePrice) : null,
        currentStock: r.currentStock != null ? Number(r.currentStock) : null,
        isNew: Number(r.isNew) === 1,
      };
    });
    return { ...entry, items };
  }

  private async findDuplicate(ruc?: string, invoice?: string) {
    if (!ruc || !invoice || !/^[A-Z0-9]{1,4}-\d+$/i.test(invoice.trim())) return null;
    return this.entryRepo.findOne({ where: { supplierRuc: ruc.trim(), invoiceNumber: normalizeInvoice(invoice) } });
  }

  /** Sugiere el producto del catálogo para cada línea y avisa si la factura ya se cargó. */
  async preview(dto: PreviewStockEntryDto) {
    const ruc = dto.supplierRuc?.trim();
    const [catalog, supplier, duplicate, maps]: [ProductEntity[], SupplierEntity | null, StockEntryEntity | null, SupplierProductMapEntity[]] = await Promise.all([
      this.productRepo.find({
        where: { isActive: true },
        select: {
          id: true, name: true, barcode: true, sku: true, stockQuantity: true, costPrice: true,
          salePrice: true, hasBoxPresentation: true, unitsPerBox: true, boxUnitName: true,
        },
      }),
      ruc ? this.supplierRepo.findOne({ where: { nit: ruc } }) : null,
      this.findDuplicate(ruc, dto.invoiceNumber),
      ruc ? this.mapRepo.find({ where: { supplierRuc: ruc } }) : [],
    ]);
    const byId = new Map(catalog.map((p) => [p.id, p]));
    const mapByKey = new Map(maps.map((m) => [m.matchKey, m]));

    const brief = (p: CatalogProduct) => ({
      id: p.id, name: p.name, barcode: p.barcode,
      stock: Number(p.stockQuantity), costPrice: Number(p.costPrice), salePrice: Number(p.salePrice),
      unitsPerBox: p.hasBoxPresentation ? Number(p.unitsPerBox) : null, boxUnitName: p.boxUnitName,
    });

    const lines = dto.lines.map((line) => {
      const code = line.code?.trim().toUpperCase();
      const saved = mapByKey.get(matchKeyOf(line.code, line.description));
      if (saved && byId.has(saved.productId)) {
        return { match: 'saved' as const, product: brief(byId.get(saved.productId)!), factor: Number(saved.factor), candidates: [] };
      }
      if (code) {
        const exact = catalog.find((p) => p.barcode?.toUpperCase() === code || p.sku?.toUpperCase() === code);
        if (exact) return { match: 'code' as const, product: brief(exact), factor: null, candidates: [] };
      }
      const ranked = catalog
        .map((p) => ({ p, score: similarity(line.description, p.name) }))
        .filter((r) => r.score >= 0.25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      const best = ranked[0];
      return {
        match: best && best.score >= 0.55 ? 'similar' as const : 'none' as const,
        product: best && best.score >= 0.55 ? brief(best.p) : null,
        factor: null,
        candidates: ranked.map((r) => ({ ...brief(r.p), score: round2(r.score) })),
      };
    });

    return {
      supplier: supplier ? { id: supplier.id, name: supplier.name, ruc: supplier.nit } : null,
      duplicate: duplicate
        ? { id: duplicate.id, invoiceNumber: duplicate.invoiceNumber, createdAt: duplicate.createdAt }
        : null,
      lines,
    };
  }

  private validate(dto: ConfirmStockEntryDto) {
    const active = dto.lines.filter((l) => l.action !== 'skip');
    if (!active.length) throw new BadRequestException('No hay productos para cargar: todas las líneas están omitidas');

    dto.lines.forEach((l, i) => {
      const n = i + 1;
      if (!Number.isInteger(Number(l.factor))) {
        throw new BadRequestException(`Línea ${n}: las unidades por empaque deben ser un número entero`);
      }
      if (l.action === 'existing' && l.newSalePrice) {
        const unitCost = lineUnitCost(l, igvFactor(dto));
        if (unitCost > 0 && Number(l.newSalePrice) < unitCost) {
          throw new BadRequestException(
            `Línea ${n} (${l.description}): el nuevo precio de venta S/ ${Number(l.newSalePrice).toFixed(2)} ` +
            `es menor que el costo por unidad S/ ${unitCost.toFixed(2)}`,
          );
        }
      }
      if (l.action === 'new' && l.newProduct) {
        const unitCost = lineUnitCost(l, igvFactor(dto));
        if (unitCost > 0 && Number(l.newProduct.salePrice) < unitCost) {
          throw new BadRequestException(
            `Línea ${n} (${l.description}): el precio de venta S/ ${Number(l.newProduct.salePrice).toFixed(2)} ` +
            `es menor que el costo por unidad S/ ${unitCost.toFixed(2)}`,
          );
        }
      }
    });

    // Varias líneas pueden ir al mismo producto (p. ej. compra + bonificación): cada una
    // convierte a unidades con su propio empaque. Los productos nuevos con el mismo nombre
    // se crean una sola vez. Un código de barras no puede repetirse entre nombres distintos.
    const codeOwner = new Map<string, string>();
    active.filter((l) => l.action === 'new' && l.newProduct?.barcode?.trim()).forEach((l) => {
      const code = l.newProduct!.barcode!.trim();
      const name = normalizeText(l.newProduct!.name);
      const prev = codeOwner.get(code);
      if (prev !== undefined && prev !== name) {
        throw new BadRequestException(`El código de barras "${code}" está en dos productos nuevos distintos`);
      }
      codeOwner.set(code, name);
    });

    // La suma de TODAS las líneas (más descuentos u otros cargos) debe cuadrar con el total impreso
    const sum = invoiceSum(dto);
    if (dto.invoiceTotal !== undefined && dto.invoiceTotal !== null && !dto.acceptTotalMismatch) {
      // Sin IGV, el redondeo del IGV por línea puede mover unos céntimos
      const tolerance = igvFactor(dto) > 1 ? 0.5 : 0.1;
      if (Math.abs(sum - Number(dto.invoiceTotal)) > tolerance) {
        throw new BadRequestException(
          `La suma de las líneas (S/ ${sum.toFixed(2)}) no coincide con el total de la factura ` +
          `(S/ ${Number(dto.invoiceTotal).toFixed(2)}). Puede faltar una línea o haber un precio mal leído.`,
        );
      }
    }
    return sum;
  }

  async confirm(dto: ConfirmStockEntryDto, userId?: number) {
    // Si la base rechaza la transacción por un choque con otra carga o venta simultánea,
    // se reintenta: la segunda vez ya ve la factura cargada y responde "ya se cargó".
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.confirmOnce(dto, userId);
      } catch (err: any) {
        const retryable = [1020, 1205, 1213].includes(err?.errno)
          || ['ER_CHECKREAD', 'ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(err?.code);
        if (!retryable || attempt >= 3) {
          if (retryable) throw new ConflictException('La base de datos está ocupada con otra operación. Intenta de nuevo en unos segundos');
          throw err;
        }
        await new Promise((r) => setTimeout(r, 150 * attempt));
      }
    }
  }

  private async confirmOnce(dto: ConfirmStockEntryDto, userId?: number) {
    const sum = this.validate(dto);
    const ruc = dto.supplierRuc.trim();
    const invoiceNumber = normalizeInvoice(dto.invoiceNumber);
    const igv = igvFactor(dto);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const dup = await manager.findOne(StockEntryEntity, { where: { supplierRuc: ruc, invoiceNumber } });
        if (dup) throw this.duplicateError(invoiceNumber, dup.createdAt);

        let supplier = await manager.findOne(SupplierEntity, { where: { nit: ruc } });
        if (!supplier) {
          supplier = await manager.save(manager.create(SupplierEntity, { name: dto.supplierName.trim(), nit: ruc, isActive: true }));
        }

        const active = dto.lines
          .map((line, i) => ({ line, n: i + 1 }))
          .filter(({ line }) => line.action !== 'skip');

        // ── Productos existentes: una sola consulta, con bloqueo hasta terminar ──
        const existingIds = [...new Set(active.filter(({ line }) => line.action === 'existing').map(({ line }) => Number(line.productId)))];
        const existing = existingIds.length
          ? await manager.createQueryBuilder(ProductEntity, 'p')
            .where('p.id IN (:...ids)', { ids: existingIds })
            .setLock('pessimistic_write')
            .getMany()
          : [];
        const byId = new Map(existing.map((p) => [p.id, p]));
        for (const { line, n } of active) {
          if (line.action !== 'existing') continue;
          const p = byId.get(Number(line.productId));
          if (!p || !p.isActive) throw new NotFoundException(`Línea ${n}: el producto elegido no existe o está inactivo`);
        }

        // ── Productos nuevos: validar nombres y códigos de una vez ──────────────
        const news = active.filter(({ line }) => line.action === 'new');
        if (news.length) {
          const names = [...new Set(news.map(({ line }) => line.newProduct!.name.trim().toUpperCase()))];
          const sameName = await manager.createQueryBuilder(ProductEntity, 'p')
            .where('UPPER(TRIM(p.name)) IN (:...names) AND p.isActive = 1', { names })
            .getOne();
          if (sameName) {
            throw new ConflictException(`Ya existe un producto llamado "${sameName.name}". Elígelo en vez de crear uno nuevo`);
          }
          const codes = news.map(({ line }) => line.newProduct!.barcode?.trim()).filter((c): c is string => !!c);
          if (codes.length) {
            const owner = await manager.createQueryBuilder(ProductEntity, 'p')
              .where('p.barcode IN (:...codes) OR p.boxBarcode IN (:...codes)', { codes })
              .getOne();
            const pres = await manager.createQueryBuilder(ProductPresentationEntity, 'pp')
              .where('pp.barcode IN (:...codes)', { codes })
              .getOne();
            if (owner || pres) {
              const code = owner ? (codes.find((c) => c === owner.barcode || c === owner.boxBarcode)) : pres!.barcode;
              throw new ConflictException(`El código de barras "${code}" ya pertenece a otro producto`);
            }
          }
          // Un solo producto por nombre; el stock de todas sus líneas se suma abajo
          const groups = new Map<string, ConfirmLineDto[]>();
          for (const { line } of news) {
            const key = normalizeText(line.newProduct!.name);
            groups.set(key, [...(groups.get(key) ?? []), line]);
          }
          for (const lines of groups.values()) {
            const base = pickBaseLine(lines);
            const barcode = lines.map((l) => l.newProduct!.barcode?.trim()).find((c) => !!c);
            const created = await manager.save(this.buildNewProduct(
              manager, { ...base, newProduct: { ...base.newProduct!, barcode } } as ConfirmLineDto, supplier.id,
            ));
            byId.set(created.id, created);
            lines.forEach((l) => { l.productId = created.id; });
          }
        }

        // ── Orden de compra recibida (historial en Compras) ─────────────────────
        const last = await manager.createQueryBuilder(PurchaseOrderEntity, 'po').orderBy('po.id', 'DESC').getOne();
        const po = await manager.save(manager.create(PurchaseOrderEntity, {
          orderNumber: `PO-${String((last?.id ?? 0) + 1).padStart(6, '0')}`,
          supplierId: supplier.id,
          orderedBy: userId ?? null,
          receivedBy: userId ?? null,
          orderDate: new Date(),
          receivedDate: new Date(),
          status: PurchaseOrderStatus.RECEIVED,
          notes: `Factura ${invoiceNumber} cargada desde texto`,
          totalAmount: 0,
        }));

        const items: Partial<PurchaseOrderItemEntity>[] = [];
        const batches: Partial<ProductBatchEntity>[] = [];
        const movements: Partial<InventoryMovementEntity>[] = [];
        const maps: Partial<SupplierProductMapEntity>[] = [];
        const touched: {
          productId: number; name: string; units: number; newStock: number; isNew: boolean;
          oldCost: number | null; newCost: number; salePrice: number;
        }[] = [];
        let totalAmount = 0;

        for (const { line } of active) {
          const product = byId.get(Number(line.productId))!;
          const isNew = line.action === 'new';
          const factor = Number(line.factor);
          const units = round4(Number(line.quantity) * factor);
          const unitCost = lineUnitCost(line, igv);
          const oldCost = isNew ? null : Number(product.costPrice);

          // Suma directa en la base: no pisa ventas registradas al mismo tiempo
          await manager.createQueryBuilder()
            .update(ProductEntity)
            .set({
              stockQuantity: () => `stock_quantity + ${units}`,
              // Las bonificaciones (precio 0) suman stock pero no cambian el costo
              ...(unitCost > 0 ? { costPrice: unitCost } : {}),
              ...(!isNew && line.newSalePrice ? { salePrice: Number(line.newSalePrice) } : {}),
              ...(!product.supplierId ? { supplierId: supplier.id } : {}),
            })
            .where('id = :id', { id: product.id })
            .execute();
          product.stockQuantity = round4(Number(product.stockQuantity) + units);
          if (unitCost > 0) product.costPrice = unitCost;
          if (!isNew && line.newSalePrice) product.salePrice = Number(line.newSalePrice);

          items.push({
            purchaseOrderId: po.id, productId: product.id, purchaseUnit: PurchaseUnit.UNIT,
            quantityOrdered: units, quantityReceived: units, unitCost, subtotal: round4(units * unitCost),
          });
          batches.push({
            productId: product.id, supplierId: supplier.id, documentRef: `Fact. ${invoiceNumber}`,
            costPrice: unitCost, initialQuantity: units, currentQuantity: units,
            expirationDate: line.expirationDate ? new Date(line.expirationDate) : null, isActive: true,
          });
          movements.push({
            productId: product.id, movementType: MovementType.IN, quantity: units,
            referenceType: MovementReferenceType.PURCHASE_ORDER, referenceId: po.id,
            notes: `Factura ${invoiceNumber} (${line.quantity} ${line.unitLabel || 'und'} x ${factor})`,
            performedBy: userId,
          });
          maps.push({ supplierRuc: ruc, matchKey: matchKeyOf(line.code, line.description), productId: product.id, factor });
          totalAmount += units * unitCost;
          touched.push({
            productId: product.id, name: product.name, units, newStock: Number(product.stockQuantity), isNew,
            oldCost, newCost: Number(product.costPrice), salePrice: Number(product.salePrice),
          });
        }

        // Inserciones en bloque: pocas consultas aunque la factura tenga muchas líneas
        await manager.createQueryBuilder().insert().into(PurchaseOrderItemEntity).values(items as any).updateEntity(false).execute();
        await manager.createQueryBuilder().insert().into(ProductBatchEntity).values(batches as any).updateEntity(false).execute();
        await manager.createQueryBuilder().insert().into(InventoryMovementEntity).values(movements as any).updateEntity(false).execute();
        // Recordar la elección para la próxima factura de este proveedor (la última línea gana)
        const uniqueMaps = [...new Map(maps.map((m) => [m.matchKey, m])).values()];
        await manager.createQueryBuilder()
          .insert()
          .into(SupplierProductMapEntity)
          .values(uniqueMaps as any)
          .orUpdate(['product_id', 'factor'], ['supplier_ruc', 'match_key'])
          .updateEntity(false)
          .execute();

        await manager.update(PurchaseOrderEntity, po.id, { totalAmount: round4(totalAmount) });

        const entry = await manager.save(manager.create(StockEntryEntity, {
          supplierId: supplier.id,
          supplierRuc: ruc,
          supplierName: supplier.name,
          invoiceNumber,
          invoiceDate: dto.invoiceDate ? dto.invoiceDate.slice(0, 10) : null,
          total: Number(dto.invoiceTotal ?? sum),
          purchaseOrderId: po.id,
          linesCount: active.length,
          newProducts: new Set(news.map(({ line }) => Number(line.productId))).size,
          createdBy: userId ?? null,
        }));

        return {
          entryId: entry.id, purchaseOrder: po.orderNumber, invoiceNumber,
          linesLoaded: active.length, newProducts: new Set(news.map(({ line }) => Number(line.productId))).size, products: touched,
        };
      });
    } catch (err: any) {
      // Dos cargas simultáneas de la misma factura: la segunda choca con el índice único
      if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
        if (String(err?.sqlMessage || err?.message).includes('UQ_stock_entries_invoice')) {
          throw this.duplicateError(invoiceNumber);
        }
        throw new ConflictException('Otra carga se registró al mismo tiempo. Revisa "Facturas cargadas" e intenta de nuevo');
      }
      throw err;
    }
  }

  private duplicateError(invoiceNumber: string, when?: Date) {
    const fecha = when ? ` el ${when.toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}` : '';
    return new ConflictException(`La factura ${invoiceNumber} de este proveedor ya se cargó${fecha}`);
  }

  private buildNewProduct(manager: EntityManager, line: ConfirmLineDto, supplierId: number): ProductEntity {
    const np = line.newProduct!;
    const factor = Number(line.factor);
    const label = (line.unitLabel || '').replace(/\s*x\s*\d+$/i, '').trim();
    const isPack = factor > 1;
    return manager.create(ProductEntity, {
      name: np.name.trim().toUpperCase(),
      barcode: np.barcode?.trim() || null,
      categoryId: np.categoryId ?? null,
      supplierId,
      salePrice: Number(np.salePrice),
      costPrice: 0,
      stockQuantity: 0,
      minStockLevel: Number(np.minStockLevel ?? 0),
      hasBoxPresentation: isPack,
      unitsPerBox: isPack ? factor : null,
      boxUnitName: isPack && label && !/^UNI/i.test(label)
        ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
        : 'Caja',
      boxSalePrice: isPack && np.boxSalePrice ? Number(np.boxSalePrice) : null,
      isActive: true,
    });
  }
}
