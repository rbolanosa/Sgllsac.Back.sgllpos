import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SaleEntity, SaleStatus, DocumentType } from '../../domain/entities/sale.entity';
import { SaleItemEntity } from '../../domain/entities/sale-item.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import { ProductBatchEntity } from '../../domain/entities/product-batch.entity';
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
import { CashService } from './cash.service';

@Injectable()
export class SaleService {
  private readonly logger = new Logger(SaleService.name);
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
    private readonly cashService: CashService,
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
        if (!product) throw new NotFoundException(`Producto #${item.productId} no encontrado`);
        if (!product.isActive) throw new BadRequestException(`El producto "${product.name}" está inactivo`);

        const sellUnit   = item.sellUnit ?? 'unit';
        const disc       = item.discount ?? 0;
        const stockUnits = Number(product.stockQuantity);
        const upb        = product.hasBoxPresentation && product.unitsPerBox ? Number(product.unitsPerBox) : null;

        // ── Calcular unidades totales y subtotal según modo ─────────────────
        let totalUnitsToDeduct = 0;
        let lineTotal          = 0;
        let displayQty         = 0;
        let displayPrice       = 0;

        if (sellUnit === 'box') {
          // ── Modo Caja ─────────────────────────────────────────────────────
          if (!upb) {
            throw new BadRequestException(
              `El producto "${product.name}" no tiene configuración de caja. ` +
              `Usa el modo de venta por unidad o configura el producto.`,
            );
          }
          const boxesToSell = Number(item.boxes ?? 0);
          if (boxesToSell <= 0) {
            throw new BadRequestException(`Debe indicar cuántas cajas vender de "${product.name}"`);
          }
          const unitsNeeded     = boxesToSell * upb;
          const availableBoxes  = Math.floor(stockUnits / upb);

          if (boxesToSell > availableBoxes) {
            throw new BadRequestException(
              `Stock insuficiente para "${product.name}" (modo caja). ` +
              `Disponibles: ${availableBoxes} caja(s) completa(s) (${stockUnits} und en total). ` +
              `Solicitadas: ${boxesToSell} caja(s).`,
            );
          }
          const boxPrice = (item.boxUnitPrice != null && Number(item.boxUnitPrice) > 0)
            ? Number(item.boxUnitPrice)
            : (product.boxSalePrice ? Number(product.boxSalePrice) : upb * Number(product.salePrice));

          totalUnitsToDeduct = unitsNeeded;
          lineTotal          = boxesToSell * boxPrice - disc;
          displayQty         = boxesToSell;
          displayPrice       = boxPrice;

        } else if (sellUnit === 'mixed') {
          // ── Modo Mixto: Cajas + Unidades sueltas ──────────────────────────
          if (!upb) {
            throw new BadRequestException(
              `El producto "${product.name}" no tiene configuración de caja. ` +
              `Usa el modo de venta por unidad.`,
            );
          }
          const boxesToSell  = Number(item.boxes ?? 0);
          const looseUnits   = Number(item.quantity ?? 0);

          if (boxesToSell <= 0 && looseUnits <= 0) {
            throw new BadRequestException(`Debe indicar cajas y/o unidades para "${product.name}"`);
          }

          const unitsFromBoxes  = boxesToSell * upb;
          const totalUnitsNeeded = unitsFromBoxes + looseUnits;

          // Validar cajas completas disponibles
          const availableBoxes = Math.floor(stockUnits / upb);
          if (boxesToSell > availableBoxes) {
            throw new BadRequestException(
              `Stock insuficiente de cajas para "${product.name}". ` +
              `Disponibles: ${availableBoxes} caja(s). Solicitadas: ${boxesToSell} caja(s).`,
            );
          }
          // Validar unidades totales disponibles
          if (totalUnitsNeeded > stockUnits) {
            const remainUnits = stockUnits - unitsFromBoxes;
            throw new BadRequestException(
              `Stock insuficiente de unidades para "${product.name}". ` +
              `Después de descontar ${boxesToSell} caja(s), quedan ${remainUnits} und disponibles. ` +
              `Solicitaste ${looseUnits} und sueltas.`,
            );
          }

          const boxPrice = (item.boxUnitPrice != null && Number(item.boxUnitPrice) > 0)
            ? Number(item.boxUnitPrice)
            : (product.boxSalePrice ? Number(product.boxSalePrice) : upb * Number(product.salePrice));
          const unitPrice = (item.unitPrice != null && Number(item.unitPrice) > 0)
            ? Number(item.unitPrice)
            : Number(product.salePrice);

          totalUnitsToDeduct = totalUnitsNeeded;
          lineTotal          = (boxesToSell * boxPrice) + (looseUnits * unitPrice) - disc;
          displayQty         = totalUnitsNeeded; // guardamos total en und para el registro
          displayPrice       = lineTotal / displayQty;

        } else {
          // ── Modo Unidad (por defecto) ─────────────────────────────────────
          const unitsToSell = Number(item.quantity ?? 0);
          if (unitsToSell <= 0) {
            throw new BadRequestException(`Debe indicar la cantidad de unidades para "${product.name}"`);
          }
          if (unitsToSell > stockUnits) {
            const stockMsg = upb
              ? `${Math.floor(stockUnits / upb)} caja(s) + ${stockUnits % upb} und sueltas (${stockUnits} und en total)`
              : `${stockUnits} unidades`;
            throw new BadRequestException(
              `Stock insuficiente para "${product.name}". ` +
              `Disponible: ${stockMsg}. Solicitado: ${unitsToSell} und.`,
            );
          }
          const unitPrice = (item.unitPrice != null && Number(item.unitPrice) > 0)
            ? Number(item.unitPrice)
            : Number(product.salePrice);

          totalUnitsToDeduct = unitsToSell;
          lineTotal          = unitPrice * unitsToSell - disc;
          displayQty         = unitsToSell;
          displayPrice       = unitPrice;
        }

        totalItemsSum += lineTotal;

        saleItems.push({
          productId: product.id,
          productName: product.name,
          quantity: displayQty,
          unitPrice: displayPrice,
          taxRate: Number(product.taxRate),
          discount: disc,
          subtotal: lineTotal,
        });

        // 3. Descontar stock en UNIDADES
        product.stockQuantity = stockUnits - totalUnitsToDeduct;
        await manager.save(product);

        // 3.1. FIFO Batch Deduction (Safely catch if no batches exist)
        try {
          let remainingToDeduct = totalUnitsToDeduct;
          const activeBatches = await manager.find(ProductBatchEntity, {
            where: { productId: product.id, isActive: true },
            order: { createdAt: 'ASC' },
          });

          for (const batch of activeBatches) {
            if (remainingToDeduct <= 0) break;
            const availableInBatch = Number(batch.currentQuantity);
            if (availableInBatch <= 0) continue;

            if (availableInBatch <= remainingToDeduct) {
              remainingToDeduct -= availableInBatch;
              batch.currentQuantity = 0;
              batch.isActive = false;
            } else {
              batch.currentQuantity = availableInBatch - remainingToDeduct;
              remainingToDeduct = 0;
            }
            await manager.save(batch);
          }
        } catch (batchErr) {
          console.warn('Advertencia al descontar de product_batches:', batchErr);
        }

        // 4. Record movement
        await manager.save(
          manager.create(InventoryMovementEntity, {
            productId: product.id,
            movementType: MovementType.OUT,
            quantity: totalUnitsToDeduct,
            referenceType: MovementReferenceType.SALE,
            notes: `Venta ${sellUnit !== 'unit' ? `(modo: ${sellUnit})` : ''}`,
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

    // Register movement in active cash session (if cashier has one open)
    if (result && cashierId) {
      const description = `Venta ${result.invoiceNumber} — ${result.documentType.toUpperCase()}`;
      this.cashService.registerSaleMovement(
        cashierId,
        result.id,
        Number(result.totalAmount),
        result.paymentMethod,
        description,
      ).catch((e) => console.warn('Advertencia caja:', e.message));
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

      // Use product's SUNAT fields (Catalogo 3 unit, Catalogo 7 IGV type)
      const sunatUnit = item.product?.unit || 'NIU';
      const tipAfeIgv = item.product?.tipAfeIgv || '10';
      const taxRate = Number(item.product?.taxRate ?? 18);

      // IGV affectation group: 10-17=Gravado, 20-27=Exonerado, 30-37=Inafecto, 40=Export
      const tipCode = parseInt(tipAfeIgv, 10);
      const isGravado = tipCode >= 10 && tipCode <= 17;
      const taxFactor = isGravado ? (100 / (100 + taxRate)) : 1;

      const baseIgv = isGravado ? totalItem * taxFactor : totalItem;
      const igvAmount = isGravado ? totalItem - baseIgv : 0;
      const porcentajeIgv = isGravado ? taxRate : 0;
      const valorUnitario = isGravado ? unitPrice * taxFactor : unitPrice;

      return {
        codigo: item.product?.sku || item.product?.barcode || `PROD-${item.productId || 1}`,
        descripcion: item.productName || item.product?.name || 'Producto',
        unidad: sunatUnit,
        cantidad: qty,
        precio_unitario: Number(unitPrice.toFixed(4)),
        mto_valor_unitario: Number(valorUnitario.toFixed(4)),
        mto_base_igv: Number(baseIgv.toFixed(4)),
        porcentaje_igv: porcentajeIgv,
        igv: Number(igvAmount.toFixed(4)),
        tip_afe_igv: tipAfeIgv,
        total_impuestos: Number(igvAmount.toFixed(4)),
        mto_valor_venta: Number(baseIgv.toFixed(4)),
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
      // Do NOT send correlativo — let the SUNAT API auto-assign it to avoid duplicate errors
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

      // Sync invoiceNumber with the one assigned by SUNAT API if available
      const sunatSerie = datos?.serie || datos?.comprobante?.serie;
      const sunatCorr = datos?.correlativo || datos?.comprobante?.correlativo;
      if (sunatSerie && sunatCorr) {
        const assignedNumber = `${sunatSerie}-${String(sunatCorr).padStart(8, '0')}`;
        if (assignedNumber !== sale.invoiceNumber) {
          await this.saleRepo.update(sale.id, { invoiceNumber: assignedNumber });
          sale.invoiceNumber = assignedNumber;
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
    let originalDoc: SaleEntity | null = null;

    const ncRecord = await this.dataSource.transaction(async (manager) => {
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

      originalDoc = original;

      // Generate NC invoice number (FC01-XXXXXXXX or BC01-XXXXXXXX) independently per series using latest correlativo
      const serie = original.documentType === 'factura' ? 'FC01' : 'BC01';
      const lastDoc = await manager
        .createQueryBuilder(SaleEntity, 's')
        .where('s.documentType = :docType', { docType: DocumentType.NOTA_CREDITO })
        .andWhere('s.invoiceNumber LIKE :seriePattern', { seriePattern: `${serie}-%` })
        .orderBy('s.id', 'DESC')
        .getOne();

      let nextNum = 1;
      if (lastDoc && lastDoc.invoiceNumber) {
        const parts = lastDoc.invoiceNumber.split('-');
        if (parts[1]) {
          const parsed = parseInt(parts[1], 10);
          if (!isNaN(parsed)) nextNum = parsed + 1;
        }
      }
      const correlativo = String(nextNum).padStart(8, '0');
      const ncNumber = `${serie}-${correlativo}`;

      // Do not mark original as refunded yet until Credit Note is accepted by SUNAT
      // (Original remains COMPLETED until SUNAT accepts the credit note)

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
      const savedNc = await manager.save(nc);

      // Save sale items for the Credit Note
      const ncItems: SaleItemEntity[] = [];
      for (const item of original.items) {
        const ncItem = manager.create(SaleItemEntity, {
          saleId: savedNc.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          subtotal: item.subtotal,
        });
        ncItems.push(await manager.save(ncItem));
      }
      savedNc.items = ncItems;
      return savedNc;
    });

    // Transmit Credit Note to APISUNAT in background after transaction commits
    if (ncRecord && originalDoc) {
      try {
        await this.sendCreditNoteToApisunat(ncRecord, originalDoc, reason, description);
      } catch (err: any) {
        console.error('sendCreditNoteToApisunat threw unexpectedly:', err?.message);
        await this.saleRepo.update(ncRecord.id, {
          sunatStatus: 'RECHAZADO',
          sunatMessage: err?.message || 'Error al transmitir Nota de Crédito a SUNAT',
        });
      }
    }

    return ncRecord;
  }

  /** Transmit Credit Note (Tipo 07) to APISUNAT service */
  private async sendCreditNoteToApisunat(nc: SaleEntity, original: SaleEntity, reasonCode: string, description: string): Promise<any> {
    const parts = (nc.invoiceNumber || '').split('-');
    const serie = parts[0] || (original.documentType === DocumentType.FACTURA ? 'FC01' : 'BC01');
    const correlativo = parts[1] ? parseInt(parts[1], 10) : undefined;

    const origParts = (original.invoiceNumber || '').split('-');
    const docAfectadoSerie = origParts[0] || (original.documentType === DocumentType.FACTURA ? 'F001' : 'B001');
    const docAfectadoCorrelativo = origParts[1] ? String(parseInt(origParts[1], 10)) : '1';

    const customer = original.customer;
    let tipoDoc = '1';
    let numDoc = customer?.nit || '00000000';
    let razonSocial = customer?.name || 'CONSUMIDOR FINAL';

    if (original.documentType === DocumentType.FACTURA) {
      tipoDoc = '6';
      numDoc = (customer?.nit && customer.nit.length === 11) ? customer.nit : '20252501178';
      razonSocial = customer?.name || 'CORPORACION DE SERVICIOS GENERALES G Y R S.A.';
    } else {
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

    const items = (original.items || []).map((item) => {
      const unitPrice = Number(item.unitPrice || 0);
      const sunatUnit = item.product?.unit || 'NIU';
      const tipAfeIgv = item.product?.tipAfeIgv || '10';
      return {
        descripcion: item.productName || item.product?.name || 'Producto',
        unidad: sunatUnit,
        cantidad: Number(item.quantity || 0),
        precio_unitario: Number(unitPrice.toFixed(4)),
        tip_afe_igv: tipAfeIgv,
      };
    });

    const localDate = new Date(nc.saleDate);
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const fechaEmisionStr = `${year}-${month}-${day}`;

    const cleanCodMotivo = String(reasonCode || '01').split('-')[0].trim().padStart(2, '0');
    const rawReasonLabel = String(reasonCode).includes('-') ? String(reasonCode).split('-').slice(1).join('-').trim() : '';
    const cleanDesMotivo = description
      ? (rawReasonLabel ? `${rawReasonLabel.toUpperCase()} | ${description.toUpperCase()}` : description.toUpperCase())
      : (rawReasonLabel ? rawReasonLabel.toUpperCase() : 'ANULACIÓN DE LA OPERACIÓN');

    const ncSerie = original.documentType === DocumentType.FACTURA ? 'FC01' : 'BC01';

    const payload: any = {
      serie: ncSerie,
      fecha_emision: fechaEmisionStr,
      doc_afectado_tipo: original.documentType === DocumentType.FACTURA ? '01' : '03',
      doc_afectado_serie: docAfectadoSerie,
      doc_afectado_correlativo: docAfectadoCorrelativo,
      cod_motivo: cleanCodMotivo,
      des_motivo: cleanDesMotivo,
      cliente: {
        tipo_doc: tipoDoc,
        num_doc: numDoc,
        razon_social: razonSocial,
        direccion: customer?.address || 'LIMA - PERU',
      },
      items,
      enviar_automatico: true,
    };

    let res: any;
    try {
      try {
        res = await this.facturacionAdapter.post<any>('/notas-credito', payload);
      } catch (firstErr: any) {
        const msg = String(firstErr?.response?.data?.mensaje || firstErr?.response?.data?.message || '');
        if (msg.includes('Serie') || msg.includes('App\\Models\\Serie')) {
          this.logger.log(`Registrando automáticamente la serie ${payload.serie} en APISUNAT...`);
          try {
            let sucursalId = 2;
            try {
              const seriesList: any = await this.facturacionAdapter.get<any>('/series');
              const itemsList = seriesList?.datos || seriesList || [];
              if (Array.isArray(itemsList) && itemsList.length > 0) {
                sucursalId = itemsList[0]?.sucursal?.id || itemsList[0]?.sucursal_id || 2;
              }
            } catch (e) {}

            await this.facturacionAdapter.post('/series', {
              series: [
                {
                  tipo: 'nota_credito',
                  serie: payload.serie,
                  sucursal_id: sucursalId,
                },
              ],
            });
          } catch (regErr: any) {
            this.logger.warn(`No se pudo auto-registrar la serie ${payload.serie}: ${regErr?.message}`);
          }
          res = await this.facturacionAdapter.post<any>('/notas-credito', payload);
        } else {
          throw firstErr;
        }
      }

      const datos = res?.datos || res;

      let sunatStatus = datos?.sunat?.estado || res?.estado || 'enviado';
      let sunatMessage = datos?.sunat?.descripcion || res?.mensaje || 'Nota de Crédito registrada';
      let xmlUrl = datos?.archivos?.xml || null;
      let cdrUrl = datos?.archivos?.cdr || null;
      let pdfUrl = datos?.archivos?.pdf || null;
      let qrCode = datos?.qr_code || null;

      if (['enviado', 'aceptado', 'pendiente', 'exito'].includes(String(sunatStatus).toLowerCase())) {
        sunatStatus = 'ACEPTADO';
        if (!sunatMessage || sunatMessage.includes('encolada') || sunatMessage.includes('registrado') || sunatMessage.includes('Beta')) {
          sunatMessage = 'Nota de Crédito Aceptada por SUNAT';
        }
        // Mark original sale as REFUNDED only when Credit Note is ACCEPTED by SUNAT
        if (original?.id) {
          await this.saleRepo.update(original.id, { status: SaleStatus.REFUNDED });
        }
      } else {
        // If rejected, keep original sale as COMPLETED
        if (original?.id) {
          await this.saleRepo.update(original.id, { status: SaleStatus.COMPLETED });
        }
      }

      let newInvoiceNumber = nc.invoiceNumber;
      if (datos?.numero_completo) {
        const parts = datos.numero_completo.split('-');
        if (parts.length === 2) {
          newInvoiceNumber = `${parts[0]}-${String(parts[1]).padStart(8, '0')}`;
        } else {
          newInvoiceNumber = datos.numero_completo;
        }
      } else if (datos?.serie && datos?.correlativo) {
        newInvoiceNumber = `${datos.serie}-${String(datos.correlativo).padStart(8, '0')}`;
      }

      await this.saleRepo.update(nc.id, {
        invoiceNumber: newInvoiceNumber,
        sunatStatus,
        sunatMessage,
        xmlUrl,
        cdrUrl,
        pdfUrl,
        qrCode,
      });

      nc.invoiceNumber = newInvoiceNumber;
      nc.sunatStatus = sunatStatus;
      nc.sunatMessage = sunatMessage;
      nc.xmlUrl = xmlUrl;
      nc.cdrUrl = cdrUrl;
      nc.pdfUrl = pdfUrl;
      nc.qrCode = qrCode;

      return res;
    } catch (err: any) {
      let errMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err.message;
      if (err?.response?.data?.errores) {
        const details = Object.entries(err.response.data.errores)
          .map(([field, msgs]: [string, any]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ');
        if (details) errMsg = `${errMsg} (${details})`;
      }
      console.error('Error enviando Nota de Crédito a APISUNAT:', errMsg);

      // Revert original sale status back to COMPLETED on failure
      if (original?.id) {
        await this.saleRepo.update(original.id, { status: SaleStatus.COMPLETED });
      }

      await this.saleRepo.update(nc.id, {
        sunatStatus: 'RECHAZADO',
        sunatMessage: String(errMsg),
      });
      nc.sunatStatus = 'RECHAZADO';
      nc.sunatMessage = String(errMsg);
      return { error: errMsg };
    }
  }

  async resendSunat(saleId: number): Promise<any> {
    const sale = await this.saleRepo.findOne({
      where: { id: saleId },
      relations: { customer: true, items: { product: true } },
    });
    if (!sale) throw new NotFoundException(`Sale #${saleId} not found`);

    if (sale.documentType === DocumentType.NOTA_CREDITO) {
      const original = sale.relatedDocumentId
        ? await this.saleRepo.findOne({
            where: { id: sale.relatedDocumentId },
            relations: { customer: true, items: { product: true } },
          })
        : null;

      if (!original) {
        throw new BadRequestException('No se encontró el comprobante original de referencia');
      }

      const reason = sale.creditNoteReason || '01 - Anulación de la operación';
      return this.sendCreditNoteToApisunat(sale, original, reason, sale.notes || '');
    } else {
      return this.sendToApisunat(sale);
    }
  }

  async fixIncorrectRefundedStatuses(): Promise<void> {
    try {
      const rejectedNcs = await this.saleRepo.find({
        where: { documentType: DocumentType.NOTA_CREDITO, sunatStatus: 'RECHAZADO' },
      });
      for (const nc of rejectedNcs) {
        if (nc.relatedDocumentId) {
          const orig = await this.saleRepo.findOne({ where: { id: nc.relatedDocumentId } });
          if (orig && orig.status === SaleStatus.REFUNDED) {
            await this.saleRepo.update(orig.id, { status: SaleStatus.COMPLETED });
          }
        }
      }
    } catch {}
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
