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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const sale_entity_1 = require("../../domain/entities/sale.entity");
const sale_item_entity_1 = require("../../domain/entities/sale-item.entity");
const product_entity_1 = require("../../domain/entities/product.entity");
const customer_entity_1 = require("../../domain/entities/customer.entity");
const inventory_movement_entity_1 = require("../../domain/entities/inventory-movement.entity");
const company_settings_service_1 = require("./company-settings.service");
let SaleService = class SaleService {
    constructor(saleRepo, saleItemRepo, productRepo, customerRepo, movementRepo, dataSource, companySettings) {
        this.saleRepo = saleRepo;
        this.saleItemRepo = saleItemRepo;
        this.productRepo = productRepo;
        this.customerRepo = customerRepo;
        this.movementRepo = movementRepo;
        this.dataSource = dataSource;
        this.companySettings = companySettings;
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
        return this.dataSource.transaction(async (manager) => {
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
                    throw new common_1.NotFoundException(`Product #${item.productId} not found`);
                if (!product.isActive)
                    throw new common_1.BadRequestException(`Product "${product.name}" is inactive`);
                if (product.stockQuantity < item.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for "${product.name}". Available: ${product.stockQuantity}`);
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
                product.stockQuantity = Number(product.stockQuantity) - item.quantity;
                await manager.save(product);
                await manager.save(manager.create(inventory_movement_entity_1.InventoryMovementEntity, {
                    productId: product.id,
                    movementType: inventory_movement_entity_1.MovementType.OUT,
                    quantity: item.quantity,
                    referenceType: inventory_movement_entity_1.MovementReferenceType.SALE,
                    notes: 'Sale',
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
            const invoiceNumber = await this.generateInvoiceNumber(manager, docType);
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
    }
    async createCreditNote(originalId, reason, description) {
        return this.dataSource.transaction(async (manager) => {
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
            const serie = original.documentType === 'factura' ? 'FC01' : 'BC01';
            const ncCount = await manager.count(sale_entity_1.SaleEntity, { where: { documentType: sale_entity_1.DocumentType.NOTA_CREDITO } });
            const correlativo = String(ncCount + 1).padStart(8, '0');
            const ncNumber = `${serie}-${correlativo}`;
            original.status = sale_entity_1.SaleStatus.REFUNDED;
            await manager.save(original);
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
            return manager.save(nc);
        });
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
    async generateInvoiceNumber(manager, docType = sale_entity_1.DocumentType.BOLETA) {
        if (docType === sale_entity_1.DocumentType.FACTURA)
            return this.companySettings.nextInvoiceNumber('factura', manager);
        if (docType === sale_entity_1.DocumentType.NOTA_VENTA)
            return this.companySettings.nextInvoiceNumber('nota_venta', manager);
        return this.companySettings.nextInvoiceNumber('boleta', manager);
    }
};
exports.SaleService = SaleService;
exports.SaleService = SaleService = __decorate([
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
        company_settings_service_1.CompanySettingsService])
], SaleService);
//# sourceMappingURL=sale.service.js.map