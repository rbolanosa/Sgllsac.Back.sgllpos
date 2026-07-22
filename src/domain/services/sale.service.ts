import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SaleEntity, SaleStatus, DocumentType } from '../../domain/entities/sale.entity';
import { SaleItemEntity } from '../../domain/entities/sale-item.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import {
  InventoryMovementEntity,
  MovementType,
  MovementReferenceType,
} from '../../domain/entities/inventory-movement.entity';
import { CreateSaleDto, VoidSaleDto } from '../../application/dtos/sale.dto';
import { CompanySettingsService } from './company-settings.service';

@Injectable()
export class SaleService {
  constructor(
    @InjectRepository(SaleEntity)
    private readonly saleRepo: Repository<SaleEntity>,
    @InjectRepository(SaleItemEntity)
    private readonly saleItemRepo: Repository<SaleItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly movementRepo: Repository<InventoryMovementEntity>,
    private readonly dataSource: DataSource,
    private readonly companySettings: CompanySettingsService,
  ) {}

  async findAll(filters: { page?: number; limit?: number; status?: SaleStatus; from?: string; to?: string; documentType?: string } = {}) {
    const { page = 1, limit = 30, status, from, to, documentType } = filters;
    const qb = this.saleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.customer', 'c')
      .leftJoinAndSelect('s.items', 'i');

    if (status)       qb.andWhere('s.status = :status', { status });
    if (documentType) qb.andWhere('s.documentType = :documentType', { documentType });
    if (from)         qb.andWhere('s.saleDate >= :from', { from });
    if (to)           qb.andWhere('s.saleDate <= :to', { to });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('s.saleDate', 'DESC')
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(id: number): Promise<SaleEntity> {
    const sale = await this.saleRepo.findOne({
      where: { id },
      relations: { customer: true, items: { product: true } },
    });
    if (!sale) throw new NotFoundException(`Sale #${id} not found`);
    return sale;
  }

  async create(dto: CreateSaleDto, cashierId?: number): Promise<SaleEntity> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Resolve customer (default CF)
      let customerId = dto.customerId ?? null;
      if (!customerId) {
        const cf = await manager.findOne(CustomerEntity, { where: { nit: 'CF' } });
        if (cf) customerId = cf.id;
      }

      // 2. Build items and validate stock
      let totalItemsSum = 0;
      const saleItems: Partial<SaleItemEntity>[] = [];

      for (const item of dto.items) {
        const product = await manager.findOne(ProductEntity, { where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Product #${item.productId} not found`);
        if (!product.isActive) throw new BadRequestException(`Product "${product.name}" is inactive`);
        if (product.stockQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}`,
          );
        }

        const disc = item.discount ?? 0;
        const lineTotal = Number(product.salePrice) * item.quantity - disc;
        totalItemsSum += lineTotal;

        saleItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: Number(product.salePrice),
          taxRate: Number(product.taxRate),
          discount: disc,
          subtotal: lineTotal,
        });

        // 3. Decrement stock
        product.stockQuantity = Number(product.stockQuantity) - item.quantity;
        await manager.save(product);

        // 4. Record movement
        await manager.save(
          manager.create(InventoryMovementEntity, {
            productId: product.id,
            movementType: MovementType.OUT,
            quantity: item.quantity,
            referenceType: MovementReferenceType.SALE,
            notes: 'Sale',
            performedBy: cashierId,
          }),
        );
      }

      const discountAmount = dto.discountAmount ?? 0;
      // Precios tienen IGV incluido:
      // totalAmount = suma directa de items - descuento adicional
      const totalAmount = totalItemsSum - discountAmount;
      // Extraemos el IGV del total (total * 18 / 118)
      const taxAmount = (totalAmount * 18) / 118;
      // La base imponible o subtotal es el total sin el IGV
      const subtotal = totalAmount - taxAmount;

      const changeGiven =
        dto.amountTendered != null ? Number(dto.amountTendered) - totalAmount : null;

      // 5. Determine document type:
      //    - Use dto.documentType if explicitly sent by frontend
      //    - Otherwise auto-detect: Factura if RUC (11 digits), Boleta otherwise
      let docType: DocumentType = dto.documentType ?? DocumentType.BOLETA;
      if (!dto.documentType && customerId) {
        const customer = await manager.findOne(CustomerEntity, { where: { id: customerId } });
        if (customer?.nit && customer.nit !== 'CF') {
          const cleanNit = customer.nit.replace(/\D/g, '');
          if (cleanNit.length === 11) docType = DocumentType.FACTURA;
        }
      }

      // 6. Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(manager, docType);

      // 7. Persist sale
      const sale = manager.create(SaleEntity, {
        invoiceNumber,
        documentType: docType,
        relatedDocumentId: null,
        creditNoteReason: null,
        customerId,
        cashierId: cashierId ?? null,
        saleDate: new Date(),
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        amountTendered: dto.amountTendered ?? null,
        changeGiven,
        status: SaleStatus.COMPLETED,
        notes: dto.notes ?? null,
      });
      const savedSale = await manager.save(sale);

      // 7. Persist items
      for (const item of saleItems) {
        item.saleId = savedSale.id;
      }
      await manager.save(SaleItemEntity, saleItems as SaleItemEntity[]);

      return manager.findOne(SaleEntity, {
        where: { id: savedSale.id },
        relations: { customer: true, items: { product: true } },
      });
    });
  }

  async createCreditNote(originalId: number, reason: string, description: string): Promise<SaleEntity> {
    return this.dataSource.transaction(async (manager) => {
      const original = await manager.findOne(SaleEntity, {
        where: { id: originalId },
        relations: { customer: true, items: { product: true } },
      });
      if (!original) throw new NotFoundException(`Sale #${originalId} not found`);
      if (original.status !== SaleStatus.COMPLETED) {
        throw new BadRequestException('Only completed sales can have a credit note issued');
      }
      if (!['factura', 'boleta'].includes(original.documentType)) {
        throw new BadRequestException('Credit notes can only be issued for invoices (factura) or receipts (boleta)');
      }

      // Generate NC invoice number (FC01-XXXXXXXX or BC01-XXXXXXXX)
      const serie = original.documentType === 'factura' ? 'FC01' : 'BC01';
      const ncCount = await manager.count(SaleEntity, { where: { documentType: DocumentType.NOTA_CREDITO as any } });
      const correlativo = String(ncCount + 1).padStart(8, '0');
      const ncNumber = `${serie}-${correlativo}`;

      // Mark original as refunded
      original.status = SaleStatus.REFUNDED;
      await manager.save(original);

      // Restore stock for each item
      for (const item of original.items) {
        if (!item.productId) continue;
        const product = await manager.findOne(ProductEntity, { where: { id: item.productId } });
        if (product) {
          product.stockQuantity = Number(product.stockQuantity) + Number(item.quantity);
          await manager.save(product);
          await manager.save(
            manager.create(InventoryMovementEntity, {
              productId: product.id,
              movementType: MovementType.IN,
              quantity: item.quantity,
              referenceType: MovementReferenceType.SALE,
              notes: `Credit note ${ncNumber} for ${original.invoiceNumber}: ${reason}`,
            }),
          );
        }
      }

      // Create the credit note record
      const nc = manager.create(SaleEntity, {
        invoiceNumber:     ncNumber,
        documentType:      DocumentType.NOTA_CREDITO,
        relatedDocumentId: original.id,
        creditNoteReason:  `${reason} | ${description}`,
        customerId:        original.customerId,
        cashierId:         null,
        saleDate:          new Date(),
        subtotal:          original.subtotal,
        taxAmount:         original.taxAmount,
        discountAmount:    original.discountAmount,
        totalAmount:       original.totalAmount,
        paymentMethod:     original.paymentMethod,
        amountTendered:    null,
        changeGiven:       null,
        status:            SaleStatus.COMPLETED,
        notes: `Credit note for ${original.invoiceNumber}: ${description}`,
      });
      return manager.save(nc);
    });
  }

  async voidSale(id: number, dto: VoidSaleDto, performedBy?: number): Promise<SaleEntity> {
    return this.dataSource.transaction(async (manager) => {
      const sale = await manager.findOne(SaleEntity, {
        where: { id },
        relations: { items: true },
      });
      if (!sale) throw new NotFoundException(`Sale #${id} not found`);
      if (sale.status !== SaleStatus.COMPLETED) {
        throw new BadRequestException('Only completed sales can be voided');
      }

      // Reverse stock
      for (const item of sale.items) {
        if (!item.productId) continue;
        const product = await manager.findOne(ProductEntity, { where: { id: item.productId } });
        if (product) {
          product.stockQuantity = Number(product.stockQuantity) + Number(item.quantity);
          await manager.save(product);
          await manager.save(
            manager.create(InventoryMovementEntity, {
              productId: product.id,
              movementType: MovementType.IN,
              quantity: item.quantity,
              referenceType: MovementReferenceType.SALE,
              notes: `Void sale #${sale.invoiceNumber}: ${dto.reason}`,
              performedBy,
            }),
          );
        }
      }

      sale.status = SaleStatus.VOIDED;
      sale.notes = `VOIDED: ${dto.reason}${sale.notes ? ` | ${sale.notes}` : ''}`;
      return manager.save(sale);
    });
  }

  async getSalesSummary(from: string, to: string) {
    const result = await this.saleRepo
      .createQueryBuilder('s')
      .select([
        'COUNT(s.id) AS totalSales',
        'COALESCE(SUM(s.totalAmount), 0) AS totalRevenue',
        'COALESCE(SUM(s.taxAmount), 0) AS totalTax',
        'COALESCE(AVG(s.totalAmount), 0) AS avgTicket',
      ])
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.saleDate BETWEEN :from AND :to', { from, to })
      .getRawOne();
    return {
      totalSales: Number(result?.totalSales ?? 0),
      totalRevenue: Number(result?.totalRevenue ?? 0),
      totalTax: Number(result?.totalTax ?? 0),
      avgTicket: Number(result?.avgTicket ?? 0),
    };
  }

  /**
   * Generates the next SUNAT-compliant invoice number.
   * Format: {series}-{8-digit sequence number}
   * Invoice (Factura): F001-00000001  |  Receipt (Boleta): B001-00000001
   */
  private async generateInvoiceNumber(manager: any, docType: DocumentType = DocumentType.BOLETA): Promise<string> {
    if (docType === DocumentType.FACTURA) return this.companySettings.nextInvoiceNumber('factura', manager);
    if (docType === DocumentType.NOTA_VENTA) return this.companySettings.nextInvoiceNumber('nota_venta', manager);
    return this.companySettings.nextInvoiceNumber('boleta', manager);
  }
}
