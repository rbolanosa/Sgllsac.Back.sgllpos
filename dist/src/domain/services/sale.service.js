"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SaleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sale_entity_1 = require("../../domain/entities/sale.entity");
const sale_item_entity_1 = require("../../domain/entities/sale-item.entity");
const product_entity_1 = require("../../domain/entities/product.entity");
const product_batch_entity_1 = require("../../domain/entities/product-batch.entity");
const customer_entity_1 = require("../../domain/entities/customer.entity");
const user_entity_1 = require("../../domain/entities/user.entity");
const establishment_series_entity_1 = require("../../domain/entities/establishment-series.entity");
const inventory_movement_entity_1 = require("../../domain/entities/inventory-movement.entity");
const crypto = __importStar(require("crypto"));
const company_settings_service_1 = require("./company-settings.service");
const facturacion_adapter_1 = require("../../infrastructure/adapters/facturacion.adapter");
const whatsapp_adapter_1 = require("../../infrastructure/adapters/whatsapp.adapter");
const cash_service_1 = require("./cash.service");
let SaleService = SaleService_1 = class SaleService {
    constructor(saleRepo, saleItemRepo, productRepo, customerRepo, movementRepo, dataSource, companySettings, facturacionAdapter, whatsappAdapter, cashService) {
        this.saleRepo = saleRepo;
        this.saleItemRepo = saleItemRepo;
        this.productRepo = productRepo;
        this.customerRepo = customerRepo;
        this.movementRepo = movementRepo;
        this.dataSource = dataSource;
        this.companySettings = companySettings;
        this.facturacionAdapter = facturacionAdapter;
        this.whatsappAdapter = whatsappAdapter;
        this.cashService = cashService;
        this.logger = new common_1.Logger(SaleService_1.name);
    }
    async findAll(filters = {}) {
        const { page = 1, limit = 30, status, from, to, documentType } = filters;
        const qb = this.saleRepo
            .createQueryBuilder('s')
            .leftJoinAndSelect('s.customer', 'c')
            .leftJoinAndSelect('s.items', 'i');
        if (status)
            qb.andWhere('s.status = :status', { status });
        if (documentType)
            qb.andWhere('s.documentType = :documentType', { documentType });
        if (from)
            qb.andWhere('s.saleDate >= :from', { from });
        if (to)
            qb.andWhere('s.saleDate <= :to', { to });
        const [data, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .orderBy('s.saleDate', 'DESC')
            .getManyAndCount();
        return { data, total, page, limit };
    }
    async findById(id) {
        const sale = await this.saleRepo.findOne({
            where: { id },
            relations: { customer: true, items: { product: true } },
        });
        if (!sale)
            throw new common_1.NotFoundException(`Sale #${id} not found`);
        return sale;
    }
    async create(dto, cashierId) {
        const result = await this.dataSource.transaction(async (manager) => {
            let customerId = dto.customerId ?? null;
            if (!customerId) {
                const cf = await manager.findOne(customer_entity_1.CustomerEntity, { where: { nit: 'CF' } });
                if (cf)
                    customerId = cf.id;
            }
            let totalItemsSum = 0;
            const saleItems = [];
            for (const item of dto.items) {
                const product = await manager.findOne(product_entity_1.ProductEntity, { where: { id: item.productId } });
                if (!product)
                    throw new common_1.NotFoundException(`Producto #${item.productId} no encontrado`);
                if (!product.isActive)
                    throw new common_1.BadRequestException(`El producto "${product.name}" está inactivo`);
                const sellUnit = item.sellUnit ?? 'unit';
                const disc = item.discount ?? 0;
                const stockUnits = Number(product.stockQuantity);
                const upb = product.hasBoxPresentation && product.unitsPerBox ? Number(product.unitsPerBox) : null;
                let totalUnitsToDeduct = 0;
                let lineTotal = 0;
                let displayQty = 0;
                let displayPrice = 0;
                if (sellUnit === 'box') {
                    if (!upb) {
                        throw new common_1.BadRequestException(`El producto "${product.name}" no tiene configuración de caja. ` +
                            `Usa el modo de venta por unidad o configura el producto.`);
                    }
                    const boxesToSell = Number(item.boxes ?? 0);
                    if (boxesToSell <= 0) {
                        throw new common_1.BadRequestException(`Debe indicar cuántas cajas vender de "${product.name}"`);
                    }
                    const unitsNeeded = boxesToSell * upb;
                    const availableBoxes = Math.floor(stockUnits / upb);
                    if (boxesToSell > availableBoxes) {
                        throw new common_1.BadRequestException(`Stock insuficiente para "${product.name}" (modo caja). ` +
                            `Disponibles: ${availableBoxes} caja(s) completa(s) (${stockUnits} und en total). ` +
                            `Solicitadas: ${boxesToSell} caja(s).`);
                    }
                    const boxPrice = (item.boxUnitPrice != null && Number(item.boxUnitPrice) > 0)
                        ? Number(item.boxUnitPrice)
                        : (product.boxSalePrice ? Number(product.boxSalePrice) : upb * Number(product.salePrice));
                    totalUnitsToDeduct = unitsNeeded;
                    lineTotal = boxesToSell * boxPrice - disc;
                    displayQty = boxesToSell;
                    displayPrice = boxPrice;
                }
                else if (sellUnit === 'mixed') {
                    if (!upb) {
                        throw new common_1.BadRequestException(`El producto "${product.name}" no tiene configuración de caja. ` +
                            `Usa el modo de venta por unidad.`);
                    }
                    const boxesToSell = Number(item.boxes ?? 0);
                    const looseUnits = Number(item.quantity ?? 0);
                    if (boxesToSell <= 0 && looseUnits <= 0) {
                        throw new common_1.BadRequestException(`Debe indicar cajas y/o unidades para "${product.name}"`);
                    }
                    const unitsFromBoxes = boxesToSell * upb;
                    const totalUnitsNeeded = unitsFromBoxes + looseUnits;
                    const availableBoxes = Math.floor(stockUnits / upb);
                    if (boxesToSell > availableBoxes) {
                        throw new common_1.BadRequestException(`Stock insuficiente de cajas para "${product.name}". ` +
                            `Disponibles: ${availableBoxes} caja(s). Solicitadas: ${boxesToSell} caja(s).`);
                    }
                    if (totalUnitsNeeded > stockUnits) {
                        const remainUnits = stockUnits - unitsFromBoxes;
                        throw new common_1.BadRequestException(`Stock insuficiente de unidades para "${product.name}". ` +
                            `Después de descontar ${boxesToSell} caja(s), quedan ${remainUnits} und disponibles. ` +
                            `Solicitaste ${looseUnits} und sueltas.`);
                    }
                    const boxPrice = (item.boxUnitPrice != null && Number(item.boxUnitPrice) > 0)
                        ? Number(item.boxUnitPrice)
                        : (product.boxSalePrice ? Number(product.boxSalePrice) : upb * Number(product.salePrice));
                    const unitPrice = (item.unitPrice != null && Number(item.unitPrice) > 0)
                        ? Number(item.unitPrice)
                        : Number(product.salePrice);
                    totalUnitsToDeduct = totalUnitsNeeded;
                    lineTotal = (boxesToSell * boxPrice) + (looseUnits * unitPrice) - disc;
                    displayQty = totalUnitsNeeded;
                    displayPrice = lineTotal / displayQty;
                }
                else {
                    const unitsToSell = Number(item.quantity ?? 0);
                    if (unitsToSell <= 0) {
                        throw new common_1.BadRequestException(`Debe indicar la cantidad de unidades para "${product.name}"`);
                    }
                    if (unitsToSell > stockUnits) {
                        const stockMsg = upb
                            ? `${Math.floor(stockUnits / upb)} caja(s) + ${stockUnits % upb} und sueltas (${stockUnits} und en total)`
                            : `${stockUnits} unidades`;
                        throw new common_1.BadRequestException(`Stock insuficiente para "${product.name}". ` +
                            `Disponible: ${stockMsg}. Solicitado: ${unitsToSell} und.`);
                    }
                    const unitPrice = (item.unitPrice != null && Number(item.unitPrice) > 0)
                        ? Number(item.unitPrice)
                        : Number(product.salePrice);
                    totalUnitsToDeduct = unitsToSell;
                    lineTotal = unitPrice * unitsToSell - disc;
                    displayQty = unitsToSell;
                    displayPrice = unitPrice;
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
                product.stockQuantity = stockUnits - totalUnitsToDeduct;
                await manager.save(product);
                try {
                    let remainingToDeduct = totalUnitsToDeduct;
                    const activeBatches = await manager.find(product_batch_entity_1.ProductBatchEntity, {
                        where: { productId: product.id, isActive: true },
                        order: { createdAt: 'ASC' },
                    });
                    for (const batch of activeBatches) {
                        if (remainingToDeduct <= 0)
                            break;
                        const availableInBatch = Number(batch.currentQuantity);
                        if (availableInBatch <= 0)
                            continue;
                        if (availableInBatch <= remainingToDeduct) {
                            remainingToDeduct -= availableInBatch;
                            batch.currentQuantity = 0;
                            batch.isActive = false;
                        }
                        else {
                            batch.currentQuantity = availableInBatch - remainingToDeduct;
                            remainingToDeduct = 0;
                        }
                        await manager.save(batch);
                    }
                }
                catch (batchErr) {
                    console.warn('Advertencia al descontar de product_batches:', batchErr);
                }
                await manager.save(manager.create(inventory_movement_entity_1.InventoryMovementEntity, {
                    productId: product.id,
                    movementType: inventory_movement_entity_1.MovementType.OUT,
                    quantity: totalUnitsToDeduct,
                    referenceType: inventory_movement_entity_1.MovementReferenceType.SALE,
                    notes: `Venta ${sellUnit !== 'unit' ? `(modo: ${sellUnit})` : ''}`,
                    performedBy: cashierId,
                }));
            }
            const discountAmount = dto.discountAmount ?? 0;
            const totalAmount = totalItemsSum - discountAmount;
            const taxAmount = (totalAmount * 18) / 118;
            const subtotal = totalAmount - taxAmount;
            const changeGiven = dto.amountTendered != null ? Number(dto.amountTendered) - totalAmount : null;
            let docType = dto.documentType ?? sale_entity_1.DocumentType.BOLETA;
            if (!dto.documentType && customerId) {
                const customer = await manager.findOne(customer_entity_1.CustomerEntity, { where: { id: customerId } });
                if (customer?.nit && customer.nit !== 'CF') {
                    const cleanNit = customer.nit.replace(/\D/g, '');
                    if (cleanNit.length === 11)
                        docType = sale_entity_1.DocumentType.FACTURA;
                }
            }
            const invoiceNumber = await this.generateInvoiceNumber(manager, docType, cashierId);
            const sale = manager.create(sale_entity_1.SaleEntity, {
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
                status: sale_entity_1.SaleStatus.COMPLETED,
                notes: dto.notes ?? null,
            });
            const savedSale = await manager.save(sale);
            for (const item of saleItems) {
                item.saleId = savedSale.id;
            }
            await manager.save(sale_item_entity_1.SaleItemEntity, saleItems);
            return manager.findOne(sale_entity_1.SaleEntity, {
                where: { id: savedSale.id },
                relations: { customer: true, items: { product: true } },
            });
        });
        if (result && (result.documentType === sale_entity_1.DocumentType.FACTURA || result.documentType === sale_entity_1.DocumentType.BOLETA)) {
            try {
                await this.sendToApisunat(result);
            }
            catch (sunatErr) {
                console.error('sendToApisunat threw unexpectedly:', sunatErr?.message);
                await this.saleRepo.update(result.id, {
                    sunatStatus: 'RECHAZADO',
                    sunatMessage: sunatErr?.message || 'Error desconocido al enviar a SUNAT',
                });
            }
        }
        const phoneToNotify = dto.customerPhone || result?.customer?.phone;
        if (phoneToNotify) {
            this.whatsappAdapter.sendInvoiceMessage(result, phoneToNotify).catch((e) => {
                console.warn('Advertencia WhatsApp:', e.message);
            });
        }
        if (result && cashierId) {
            const description = `Venta ${result.invoiceNumber} — ${result.documentType.toUpperCase()}`;
            this.cashService.registerSaleMovement(cashierId, result.id, Number(result.totalAmount), result.paymentMethod, description).catch((e) => console.warn('Advertencia caja:', e.message));
        }
        return result;
    }
    async sendToApisunat(sale) {
        const parts = (sale.invoiceNumber || '').split('-');
        const serie = parts[0] || (sale.documentType === sale_entity_1.DocumentType.FACTURA ? 'F001' : 'B001');
        const correlativo = parts[1] ? parseInt(parts[1], 10) : undefined;
        const customer = sale.customer;
        let tipoDoc = '1';
        let numDoc = customer?.nit || '00000000';
        let razonSocial = customer?.name || 'CONSUMIDOR FINAL';
        if (sale.documentType === sale_entity_1.DocumentType.FACTURA) {
            tipoDoc = '6';
            numDoc = (customer?.nit && customer.nit.length === 11) ? customer.nit : '20252501178';
            razonSocial = customer?.name || 'CORPORACION DE SERVICIOS GENERALES G Y R S.A.';
        }
        else if (sale.documentType === sale_entity_1.DocumentType.BOLETA) {
            if (customer?.nit && customer.nit.length === 8) {
                tipoDoc = '1';
                numDoc = customer.nit;
            }
            else if (customer?.nit && customer.nit.length === 11) {
                tipoDoc = '6';
                numDoc = customer.nit;
            }
            else {
                tipoDoc = '0';
                numDoc = '00000000';
                razonSocial = customer?.name || 'CONSUMIDOR FINAL';
            }
        }
        const items = (sale.items || []).map((item) => {
            const unitPrice = Number(item.unitPrice);
            const qty = Number(item.quantity);
            const totalItem = Number(item.subtotal);
            const sunatUnit = item.product?.unit || 'NIU';
            const tipAfeIgv = item.product?.tipAfeIgv || '10';
            const taxRate = Number(item.product?.taxRate ?? 18);
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
            tipo_documento: sale.documentType === sale_entity_1.DocumentType.FACTURA ? '01' : '03',
            serie,
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
        const endpoint = sale.documentType === sale_entity_1.DocumentType.FACTURA ? '/facturas' : '/boletas';
        try {
            const res = await this.facturacionAdapter.post(endpoint, payload);
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
        }
        catch (err) {
            let errMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err.message;
            if (err?.response?.data?.errores) {
                const details = Object.entries(err.response.data.errores)
                    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                    .join(' | ');
                if (details)
                    errMsg = `${errMsg} (${details})`;
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
    async createCreditNote(originalId, reason, description) {
        let originalDoc = null;
        const ncRecord = await this.dataSource.transaction(async (manager) => {
            const original = await manager.findOne(sale_entity_1.SaleEntity, {
                where: { id: originalId },
                relations: { customer: true, items: { product: true } },
            });
            if (!original)
                throw new common_1.NotFoundException(`Sale #${originalId} not found`);
            if (original.status !== sale_entity_1.SaleStatus.COMPLETED) {
                throw new common_1.BadRequestException('Only completed sales can have a credit note issued');
            }
            if (!['factura', 'boleta'].includes(original.documentType)) {
                throw new common_1.BadRequestException('Credit notes can only be issued for invoices (factura) or receipts (boleta)');
            }
            originalDoc = original;
            const serie = original.documentType === 'factura' ? 'FC01' : 'BC01';
            const lastDoc = await manager
                .createQueryBuilder(sale_entity_1.SaleEntity, 's')
                .where('s.documentType = :docType', { docType: sale_entity_1.DocumentType.NOTA_CREDITO })
                .andWhere('s.invoiceNumber LIKE :seriePattern', { seriePattern: `${serie}-%` })
                .orderBy('s.id', 'DESC')
                .getOne();
            let nextNum = 1;
            if (lastDoc && lastDoc.invoiceNumber) {
                const parts = lastDoc.invoiceNumber.split('-');
                if (parts[1]) {
                    const parsed = parseInt(parts[1], 10);
                    if (!isNaN(parsed))
                        nextNum = parsed + 1;
                }
            }
            const correlativo = String(nextNum).padStart(8, '0');
            const ncNumber = `${serie}-${correlativo}`;
            for (const item of original.items) {
                if (!item.productId)
                    continue;
                const product = await manager.findOne(product_entity_1.ProductEntity, { where: { id: item.productId } });
                if (product) {
                    product.stockQuantity = Number(product.stockQuantity) + Number(item.quantity);
                    await manager.save(product);
                    await manager.save(manager.create(inventory_movement_entity_1.InventoryMovementEntity, {
                        productId: product.id,
                        movementType: inventory_movement_entity_1.MovementType.IN,
                        quantity: item.quantity,
                        referenceType: inventory_movement_entity_1.MovementReferenceType.SALE,
                        notes: `Credit note ${ncNumber} for ${original.invoiceNumber}: ${reason}`,
                    }));
                }
            }
            const nc = manager.create(sale_entity_1.SaleEntity, {
                invoiceNumber: ncNumber,
                documentType: sale_entity_1.DocumentType.NOTA_CREDITO,
                relatedDocumentId: original.id,
                creditNoteReason: `${reason} | ${description}`,
                customerId: original.customerId,
                cashierId: null,
                saleDate: new Date(),
                subtotal: original.subtotal,
                taxAmount: original.taxAmount,
                discountAmount: original.discountAmount,
                totalAmount: original.totalAmount,
                paymentMethod: original.paymentMethod,
                amountTendered: null,
                changeGiven: null,
                status: sale_entity_1.SaleStatus.COMPLETED,
                notes: `Credit note for ${original.invoiceNumber}: ${description}`,
            });
            const savedNc = await manager.save(nc);
            const ncItems = [];
            for (const item of original.items) {
                const ncItem = manager.create(sale_item_entity_1.SaleItemEntity, {
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
        if (ncRecord && originalDoc) {
            try {
                await this.sendCreditNoteToApisunat(ncRecord, originalDoc, reason, description);
            }
            catch (err) {
                console.error('sendCreditNoteToApisunat threw unexpectedly:', err?.message);
                await this.saleRepo.update(ncRecord.id, {
                    sunatStatus: 'RECHAZADO',
                    sunatMessage: err?.message || 'Error al transmitir Nota de Crédito a SUNAT',
                });
            }
        }
        return ncRecord;
    }
    async sendCreditNoteToApisunat(nc, original, reasonCode, description) {
        const parts = (nc.invoiceNumber || '').split('-');
        const serie = parts[0] || (original.documentType === sale_entity_1.DocumentType.FACTURA ? 'FC01' : 'BC01');
        const correlativo = parts[1] ? parseInt(parts[1], 10) : undefined;
        const origParts = (original.invoiceNumber || '').split('-');
        const docAfectadoSerie = origParts[0] || (original.documentType === sale_entity_1.DocumentType.FACTURA ? 'F001' : 'B001');
        const docAfectadoCorrelativo = origParts[1] ? String(parseInt(origParts[1], 10)) : '1';
        const customer = original.customer;
        let tipoDoc = '1';
        let numDoc = customer?.nit || '00000000';
        let razonSocial = customer?.name || 'CONSUMIDOR FINAL';
        if (original.documentType === sale_entity_1.DocumentType.FACTURA) {
            tipoDoc = '6';
            numDoc = (customer?.nit && customer.nit.length === 11) ? customer.nit : '20252501178';
            razonSocial = customer?.name || 'CORPORACION DE SERVICIOS GENERALES G Y R S.A.';
        }
        else {
            if (customer?.nit && customer.nit.length === 8) {
                tipoDoc = '1';
                numDoc = customer.nit;
            }
            else if (customer?.nit && customer.nit.length === 11) {
                tipoDoc = '6';
                numDoc = customer.nit;
            }
            else {
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
        const ncSerie = original.documentType === sale_entity_1.DocumentType.FACTURA ? 'FC01' : 'BC01';
        const payload = {
            serie: ncSerie,
            fecha_emision: fechaEmisionStr,
            doc_afectado_tipo: original.documentType === sale_entity_1.DocumentType.FACTURA ? '01' : '03',
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
        let res;
        try {
            try {
                res = await this.facturacionAdapter.post('/notas-credito', payload);
            }
            catch (firstErr) {
                const msg = String(firstErr?.response?.data?.mensaje || firstErr?.response?.data?.message || '');
                if (msg.includes('Serie') || msg.includes('App\\Models\\Serie')) {
                    this.logger.log(`Registrando automáticamente la serie ${payload.serie} en APISUNAT...`);
                    try {
                        let sucursalId = 2;
                        try {
                            const seriesList = await this.facturacionAdapter.get('/series');
                            const itemsList = seriesList?.datos || seriesList || [];
                            if (Array.isArray(itemsList) && itemsList.length > 0) {
                                sucursalId = itemsList[0]?.sucursal?.id || itemsList[0]?.sucursal_id || 2;
                            }
                        }
                        catch (e) { }
                        await this.facturacionAdapter.post('/series', {
                            series: [
                                {
                                    tipo: 'nota_credito',
                                    serie: payload.serie,
                                    sucursal_id: sucursalId,
                                },
                            ],
                        });
                    }
                    catch (regErr) {
                        this.logger.warn(`No se pudo auto-registrar la serie ${payload.serie}: ${regErr?.message}`);
                    }
                    res = await this.facturacionAdapter.post('/notas-credito', payload);
                }
                else {
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
                if (original?.id) {
                    await this.saleRepo.update(original.id, { status: sale_entity_1.SaleStatus.REFUNDED });
                }
            }
            else {
                if (original?.id) {
                    await this.saleRepo.update(original.id, { status: sale_entity_1.SaleStatus.COMPLETED });
                }
            }
            let newInvoiceNumber = nc.invoiceNumber;
            if (datos?.numero_completo) {
                const parts = datos.numero_completo.split('-');
                if (parts.length === 2) {
                    newInvoiceNumber = `${parts[0]}-${String(parts[1]).padStart(8, '0')}`;
                }
                else {
                    newInvoiceNumber = datos.numero_completo;
                }
            }
            else if (datos?.serie && datos?.correlativo) {
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
        }
        catch (err) {
            let errMsg = err?.response?.data?.mensaje || err?.response?.data?.message || err.message;
            if (err?.response?.data?.errores) {
                const details = Object.entries(err.response.data.errores)
                    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                    .join(' | ');
                if (details)
                    errMsg = `${errMsg} (${details})`;
            }
            console.error('Error enviando Nota de Crédito a APISUNAT:', errMsg);
            if (original?.id) {
                await this.saleRepo.update(original.id, { status: sale_entity_1.SaleStatus.COMPLETED });
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
    async resendSunat(saleId) {
        const sale = await this.saleRepo.findOne({
            where: { id: saleId },
            relations: { customer: true, items: { product: true } },
        });
        if (!sale)
            throw new common_1.NotFoundException(`Sale #${saleId} not found`);
        if (sale.documentType === sale_entity_1.DocumentType.NOTA_CREDITO) {
            const original = sale.relatedDocumentId
                ? await this.saleRepo.findOne({
                    where: { id: sale.relatedDocumentId },
                    relations: { customer: true, items: { product: true } },
                })
                : null;
            if (!original) {
                throw new common_1.BadRequestException('No se encontró el comprobante original de referencia');
            }
            const reason = sale.creditNoteReason || '01 - Anulación de la operación';
            return this.sendCreditNoteToApisunat(sale, original, reason, sale.notes || '');
        }
        else {
            return this.sendToApisunat(sale);
        }
    }
    async fixIncorrectRefundedStatuses() {
        try {
            const rejectedNcs = await this.saleRepo.find({
                where: { documentType: sale_entity_1.DocumentType.NOTA_CREDITO, sunatStatus: 'RECHAZADO' },
            });
            for (const nc of rejectedNcs) {
                if (nc.relatedDocumentId) {
                    const orig = await this.saleRepo.findOne({ where: { id: nc.relatedDocumentId } });
                    if (orig && orig.status === sale_entity_1.SaleStatus.REFUNDED) {
                        await this.saleRepo.update(orig.id, { status: sale_entity_1.SaleStatus.COMPLETED });
                    }
                }
            }
        }
        catch { }
    }
    async voidSale(id, dto, performedBy) {
        return this.dataSource.transaction(async (manager) => {
            const sale = await manager.findOne(sale_entity_1.SaleEntity, {
                where: { id },
                relations: { items: true },
            });
            if (!sale)
                throw new common_1.NotFoundException(`Sale #${id} not found`);
            if (sale.status !== sale_entity_1.SaleStatus.COMPLETED) {
                throw new common_1.BadRequestException('Only completed sales can be voided');
            }
            for (const item of sale.items) {
                if (!item.productId)
                    continue;
                const product = await manager.findOne(product_entity_1.ProductEntity, { where: { id: item.productId } });
                if (product) {
                    product.stockQuantity = Number(product.stockQuantity) + Number(item.quantity);
                    await manager.save(product);
                    await manager.save(manager.create(inventory_movement_entity_1.InventoryMovementEntity, {
                        productId: product.id,
                        movementType: inventory_movement_entity_1.MovementType.IN,
                        quantity: item.quantity,
                        referenceType: inventory_movement_entity_1.MovementReferenceType.SALE,
                        notes: `Void sale #${sale.invoiceNumber}: ${dto.reason}`,
                        performedBy,
                    }));
                }
            }
            sale.status = sale_entity_1.SaleStatus.VOIDED;
            sale.notes = `VOIDED: ${dto.reason}${sale.notes ? ` | ${sale.notes}` : ''}`;
            return manager.save(sale);
        });
    }
    async getSalesSummary(from, to) {
        const result = await this.saleRepo
            .createQueryBuilder('s')
            .select([
            'COUNT(s.id) AS totalSales',
            'COALESCE(SUM(s.totalAmount), 0) AS totalRevenue',
            'COALESCE(SUM(s.taxAmount), 0) AS totalTax',
            'COALESCE(AVG(s.totalAmount), 0) AS avgTicket',
        ])
            .where('s.status = :status', { status: sale_entity_1.SaleStatus.COMPLETED })
            .andWhere('s.saleDate BETWEEN :from AND :to', { from, to })
            .getRawOne();
        return {
            totalSales: Number(result?.totalSales ?? 0),
            totalRevenue: Number(result?.totalRevenue ?? 0),
            totalTax: Number(result?.totalTax ?? 0),
            avgTicket: Number(result?.avgTicket ?? 0),
        };
    }
    async generateInvoiceNumber(manager, docType = sale_entity_1.DocumentType.BOLETA, cashierId) {
        if (cashierId) {
            try {
                const cashier = await manager.findOne(user_entity_1.UserEntity, { where: { id: cashierId } });
                if (cashier?.establishmentId) {
                    let targetType = 'boleta';
                    if (docType === sale_entity_1.DocumentType.FACTURA)
                        targetType = 'factura';
                    if (docType === sale_entity_1.DocumentType.NOTA_VENTA)
                        targetType = 'nota_venta';
                    let serieFound = null;
                    try {
                        const seriesRes = await this.facturacionAdapter.get(`/series?sucursal_id=${cashier.establishmentId}`).catch(() => null);
                        const seriesList = Array.isArray(seriesRes?.datos) ? seriesRes.datos : Array.isArray(seriesRes) ? seriesRes : [];
                        const matchingSeries = seriesList.find((s) => s.tipo === targetType);
                        if (matchingSeries?.serie) {
                            serieFound = matchingSeries.serie.toUpperCase();
                        }
                    }
                    catch { }
                    if (!serieFound) {
                        const localSeries = await manager.findOne(establishment_series_entity_1.EstablishmentSeriesEntity, {
                            where: { establishmentId: cashier.establishmentId, tipo: targetType, activo: true },
                        });
                        if (localSeries?.serie) {
                            serieFound = localSeries.serie.toUpperCase();
                        }
                    }
                    if (serieFound) {
                        const serie = serieFound;
                        const lastSale = await manager.createQueryBuilder(sale_entity_1.SaleEntity, 's')
                            .where('s.invoiceNumber LIKE :pattern', { pattern: `${serie}-%` })
                            .orderBy('s.id', 'DESC')
                            .getOne();
                        let nextNum = 1;
                        if (lastSale?.invoiceNumber) {
                            const parts = lastSale.invoiceNumber.split('-');
                            if (parts[1])
                                nextNum = parseInt(parts[1], 10) + 1;
                        }
                        return `${serie}-${String(nextNum).padStart(8, '0')}`;
                    }
                }
            }
            catch (err) {
                console.warn('Advertencia al resolver serie por establecimiento:', err?.message);
            }
        }
        if (docType === sale_entity_1.DocumentType.FACTURA)
            return this.companySettings.nextInvoiceNumber('factura', manager);
        if (docType === sale_entity_1.DocumentType.NOTA_VENTA)
            return this.companySettings.nextInvoiceNumber('nota_venta', manager);
        return this.companySettings.nextInvoiceNumber('boleta', manager);
    }
    async sendWhatsappMessage(id, phone) {
        const sale = await this.findById(id);
        const company = await this.companySettings.get();
        const result = await this.whatsappAdapter.sendInvoiceMessage(sale, phone, company);
        return {
            success: true,
            message: `Comprobante enviado por WhatsApp al ${phone}`,
            result,
        };
    }
    async generatePdfBuffer(id) {
        const sale = await this.findById(id);
        const company = await this.companySettings.get();
        const buffer = await this.whatsappAdapter.generateReceiptPdfBuffer(sale, company);
        const fileName = `${sale.invoiceNumber || 'COMPROBANTE'}.pdf`;
        return { buffer, fileName };
    }
    getSecurePdfToken(saleId) {
        const secret = process.env.JWT_SECRET || 'devpro-secure-pdf-secret-2026';
        const hash = crypto.createHmac('sha256', secret)
            .update(`sale-pdf-${saleId}`)
            .digest('hex')
            .substring(0, 24);
        return `sec_${saleId}_${hash}`;
    }
    verifyPdfToken(token) {
        try {
            const parts = token.split('_');
            if (parts.length !== 3 || parts[0] !== 'sec')
                return null;
            const saleId = parseInt(parts[1], 10);
            if (isNaN(saleId))
                return null;
            const expected = this.getSecurePdfToken(saleId);
            if (crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
                return saleId;
            }
        }
        catch {
            return null;
        }
        return null;
    }
};
exports.SaleService = SaleService;
exports.SaleService = SaleService = SaleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(sale_entity_1.SaleEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(sale_item_entity_1.SaleItemEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.ProductEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(customer_entity_1.CustomerEntity)),
    __param(4, (0, typeorm_1.InjectRepository)(inventory_movement_entity_1.InventoryMovementEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        company_settings_service_1.CompanySettingsService,
        facturacion_adapter_1.FacturacionAdapter,
        whatsapp_adapter_1.WhatsappAdapter,
        cash_service_1.CashService])
], SaleService);
//# sourceMappingURL=sale.service.js.map