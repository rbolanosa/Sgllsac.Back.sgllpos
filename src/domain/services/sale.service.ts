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
import { UserEntity } from '../../domain/entities/user.entity';
import {
  InventoryMovementEntity,
  MovementType,
  MovementReferenceType,
} from '../../domain/entities/inventory-movement.entity';
import * as crypto from 'crypto';
import { CreateSaleDto, VoidSaleDto } from '../../application/dtos/sale.dto';
import { CompanySettingsService } from './company-settings.service';
import { FacturacionAdapter } from '../../infrastructure/adapters/facturacion.adapter';
import { WhatsappAdapter } from '../../infrastructure/adapters/whatsapp.adapter';

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
    private readonly facturacionAdapter: FacturacionAdapter,
    private readonly whatsappAdapter: WhatsappAdapter,
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
    const result = await this.dataSource.transaction(async (manager) => {
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
        const priceToUse = (item.unitPrice != null && Number(item.unitPrice) > 0)
          ? Number(item.unitPrice)
          : Number(product.salePrice);
        const lineTotal = priceToUse * item.quantity - disc;
        totalItemsSum += lineTotal;

        saleItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: priceToUse,
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
      const totalAmount = totalItemsSum - discountAmount;
      const taxAmount = (totalAmount * 18) / 118;
      const subtotal = totalAmount - taxAmount;

      const changeGiven =
        dto.amountTendered != null ? Number(dto.amountTendered) - totalAmount : null;

      let docType: DocumentType = dto.documentType ?? DocumentType.BOLETA;
      if (!dto.documentType && customerId) {
        const customer = await manager.findOne(CustomerEntity, { where: { id: customerId } });
        if (customer?.nit && customer.nit !== 'CF') {
          const cleanNit = customer.nit.replace(/\D/g, '');
          if (cleanNit.length === 11) docType = DocumentType.FACTURA;
        }
      }

      const invoiceNumber = await this.generateInvoiceNumber(manager, docType, cashierId);

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

      for (const item of saleItems) {
        item.saleId = savedSale.id;
      }
      await manager.save(SaleItemEntity, saleItems as SaleItemEntity[]);

      return manager.findOne(SaleEntity, {
        where: { id: savedSale.id },
        relations: { customer: true, items: { product: true } },
      });
    });

    // Send to APISUNAT AFTER the transaction has committed (avoids lock-wait deadlock)
    if (result && (result.documentType === DocumentType.FACTURA || result.documentType === DocumentType.BOLETA)) {
      try {
        await this.sendToApisunat(result);
      } catch (sunatErr: any) {
        console.error('sendToApisunat threw unexpectedly:', sunatErr?.message);
        // Mark as rejected but do not crash the sale
        await this.saleRepo.update(result.id, {
          sunatStatus: 'RECHAZADO',
          sunatMessage: sunatErr?.message || 'Error desconocido al enviar a SUNAT',
        });
      }
    }

    // Trigger automatic WhatsApp message if customer phone is available
    const phoneToNotify = (dto as any).customerPhone || result?.customer?.phone;
    if (phoneToNotify) {
      this.whatsappAdapter.sendInvoiceMessage(result, phoneToNotify).catch((e) => {
        console.warn('Advertencia WhatsApp:', e.message);
      });
    }

    return result;
  }

  /** Transmit Factura or Boleta to APISUNAT service */
  private async sendToApisunat(sale: SaleEntity): Promise<any> {
    const parts = (sale.invoiceNumber || '').split('-');
    const serie = parts[0] || (sale.documentType === DocumentType.FACTURA ? 'F001' : 'B001');
    const correlativo = parts[1] ? parseInt(parts[1], 10) : undefined;

    const customer = sale.customer;
    let tipoDoc = '1';
    let numDoc = customer?.nit || '00000000';
    let razonSocial = customer?.name || 'CONSUMIDOR FINAL';

    if (sale.documentType === DocumentType.FACTURA) {
      tipoDoc = '6';
      numDoc = (customer?.nit && customer.nit.length === 11) ? customer.nit : '20252501178';
      razonSocial = customer?.name || 'CORPORACION DE SERVICIOS GENERALES G Y R S.A.';
    } else if (sale.documentType === DocumentType.BOLETA) {
      if (customer?.nit && customer.nit.length === 8) {
        tipoDoc = '1';
        numDoc = customer.nit;
      } else if (customer?.nit && customer.nit.length === 11) {
        tipoDoc = '6';
        numDoc = customer.nit;
      } else {
        tipoDoc = '0';
        numDoc = '00000000';
        razonSocial = customer?.name || 'CONSUMIDOR FINAL';
      }
    }

    const items = (sale.items || []).map((item) => {
      const unitPrice = Number(item.unitPrice);
      const qty = Number(item.quantity);
      const totalItem = Number(item.subtotal);
      const baseIgv = (totalItem * 100) / 118;
      const igv = totalItem - baseIgv;
      const valorUnitario = (unitPrice * 100) / 118;

      return {
        codigo: item.product?.sku || `PROD-${item.productId || 1}`,
        descripcion: item.productName || item.product?.name || 'Producto',
        unidad: 'NIU',
        cantidad: qty,
        precio_unitario: unitPrice,
        mto_valor_unitario: Number(valorUnitario.toFixed(4)),
        mto_base_igv: Number(baseIgv.toFixed(2)),
        porcentaje_igv: 18,
        igv: Number(igv.toFixed(2)),
        tip_afe_igv: '10',
        total_impuestos: Number(igv.toFixed(2)),
        mto_valor_venta: Number(baseIgv.toFixed(2)),
      };
    });

    const localDate = new Date(sale.saleDate);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const fechaEmisionStr = `${year}-${month}-${day}`;

    const payload = {
      tipo_documento: sale.documentType === DocumentType.FACTURA ? '01' : '03',
      serie,
      correlativo,
      fecha_emision: fechaEmisionStr,
      tipo_operacion: '0101',
      tipo_moneda: 'PEN',
      forma_pago: 'Contado',
      cliente: {
        tipo_doc: tipoDoc,
        num_doc: numDoc,
        razon_social: razonSocial,
        direccion: customer?.address || 'LIMA - PERU',
        email: customer?.email || undefined,
        telefono: customer?.phone || undefined,
      },
      items,
      enviar_automatico: true,
    };

    const endpoint = sale.documentType === DocumentType.FACTURA ? '/facturas' : '/boletas';

    try {
      const res = await this.facturacionAdapter.post<any>(endpoint, payload);
      const datos = res?.datos || res;

      let sunatStatus = datos?.sunat?.estado || res?.estado || 'enviado';
      let sunatMessage = datos?.sunat?.descripcion || res?.mensaje || 'Comprobante registrado';
      let xmlUrl = datos?.archivos?.xml || null;
      let cdrUrl = datos?.archivos?.cdr || null;
      let pdfUrl = datos?.archivos?.pdf || null;
      let qrCode = datos?.qr_code || null;

      if (['enviado', 'aceptado', 'pendiente', 'exito'].includes(String(sunatStatus).toLowerCase())) {
        sunatStatus = 'ACEPTADO';
        if (!sunatMessage || sunatMessage.includes('encolada') || sunatMessage.includes('registrado') || sunatMessage.includes('Beta')) {
          sunatMessage = 'Comprobante Aceptado por SUNAT';
        }
      }

      await this.saleRepo.update(sale.id, {
        sunatStatus,
        sunatMessage,
        xmlUrl,
        cdrUrl,
        pdfUrl,
        qrCode,
      });

      sale.sunatStatus = sunatStatus;
      sale.sunatMessage = sunatMessage;
      sale.xmlUrl = xmlUrl;
      sale.cdrUrl = cdrUrl;
      sale.pdfUrl = pdfUrl;
      sale.qrCode = qrCode;

      return res;
    } catch (err: any) {
      let errMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err.message;
      if (err?.response?.data?.errores) {
        const details = Object.entries(err.response.data.errores)
          .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        if (details) errMsg = `${errMsg} (${details})`;
      }
      console.error('Error enviando comprobante a APISUNAT:', errMsg);
      await this.saleRepo.update(sale.id, {
        sunatStatus: 'RECHAZADO',
        sunatMessage: String(errMsg),
      });
      sale.sunatStatus = 'RECHAZADO';
      sale.sunatMessage = String(errMsg);
      return { error: errMsg };
    }
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
   * Resolves establishment-specific series if cashier has an assigned establishmentId.
   * Format: {series}-{8-digit sequence number}
   */
  private async generateInvoiceNumber(manager: any, docType: DocumentType = DocumentType.BOLETA, cashierId?: number): Promise<string> {
    if (cashierId) {
      try {
        const cashier = await manager.findOne(UserEntity, { where: { id: cashierId } });
        if (cashier?.establishmentId) {
          const seriesRes = await this.facturacionAdapter.get<any>(`/series?sucursal_id=${cashier.establishmentId}`).catch(() => null);
          const seriesList = Array.isArray(seriesRes?.datos) ? seriesRes.datos : Array.isArray(seriesRes) ? seriesRes : [];

          let targetType = 'boleta';
          if (docType === DocumentType.FACTURA) targetType = 'factura';
          if (docType === DocumentType.NOTA_VENTA) targetType = 'nota_venta';

          const matchingSeries = seriesList.find((s: any) => s.tipo === targetType);
          if (matchingSeries?.serie) {
            const serie = matchingSeries.serie.toUpperCase();
            const lastSale = await manager.createQueryBuilder(SaleEntity, 's')
              .where('s.invoiceNumber LIKE :pattern', { pattern: `${serie}-%` })
              .orderBy('s.id', 'DESC')
              .getOne();

            let nextNum = 1;
            if (lastSale?.invoiceNumber) {
              const parts = lastSale.invoiceNumber.split('-');
              if (parts[1]) nextNum = parseInt(parts[1], 10) + 1;
            }
            return `${serie}-${String(nextNum).padStart(8, '0')}`;
          }
        }
      } catch (err: any) {
        console.warn('Advertencia al resolver serie por establecimiento:', err?.message);
      }
    }

    if (docType === DocumentType.FACTURA) return this.companySettings.nextInvoiceNumber('factura', manager);
    if (docType === DocumentType.NOTA_VENTA) return this.companySettings.nextInvoiceNumber('nota_venta', manager);
    return this.companySettings.nextInvoiceNumber('boleta', manager);
  }

  /** Send WhatsApp invoice message directly via Evolution API without opening browser tabs */
  async sendWhatsappMessage(id: number, phone: string): Promise<any> {
    const sale = await this.findById(id);
    const company = await this.companySettings.get();
    const result = await this.whatsappAdapter.sendInvoiceMessage(sale, phone, company);
    return {
      success: true,
      message: `Comprobante enviado por WhatsApp al ${phone}`,
      result,
    };
  }

  /** Generate PDF buffer for a sale receipt */
  async generatePdfBuffer(id: number): Promise<{ buffer: Buffer; fileName: string }> {
    const sale = await this.findById(id);
    const company = await this.companySettings.get();
    const buffer = await this.whatsappAdapter.generateReceiptPdfBuffer(sale, company);
    const fileName = `${sale.invoiceNumber || 'COMPROBANTE'}.pdf`;
    return { buffer, fileName };
  }

  /** Generate secure HMAC signed token for public PDF download */
  getSecurePdfToken(saleId: number): string {
    const secret = process.env.JWT_SECRET || 'devpro-secure-pdf-secret-2026';
    const hash = crypto.createHmac('sha256', secret)
      .update(`sale-pdf-${saleId}`)
      .digest('hex')
      .substring(0, 24);
    return `sec_${saleId}_${hash}`;
  }

  /** Verify HMAC token and return saleId if valid */
  verifyPdfToken(token: string): number | null {
    try {
      const parts = token.split('_');
      if (parts.length !== 3 || parts[0] !== 'sec') return null;
      const saleId = parseInt(parts[1], 10);
      if (isNaN(saleId)) return null;
      const expected = this.getSecurePdfToken(saleId);
      if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
        return saleId;
      }
    } catch {
      return null;
    }
    return null;
  }
}
