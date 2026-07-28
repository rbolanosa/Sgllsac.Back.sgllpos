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
exports.PurchaseOrderService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const purchase_order_entity_1 = require("../../domain/entities/purchase-order.entity");
const purchase_order_item_entity_1 = require("../../domain/entities/purchase-order-item.entity");
const product_entity_1 = require("../../domain/entities/product.entity");
const inventory_movement_entity_1 = require("../../domain/entities/inventory-movement.entity");
let PurchaseOrderService = class PurchaseOrderService {
    constructor(poRepo, poItemRepo, productRepo, movementRepo, dataSource) {
        this.poRepo = poRepo;
        this.poItemRepo = poItemRepo;
        this.productRepo = productRepo;
        this.movementRepo = movementRepo;
        this.dataSource = dataSource;
    }
    async findAll(filters = {}) {
        const { page = 1, limit = 30, status } = filters;
        const qb = this.poRepo
            .createQueryBuilder('po')
            .leftJoinAndSelect('po.supplier', 's')
            .leftJoinAndSelect('po.items', 'i')
            .leftJoinAndSelect('i.product', 'p');
        if (status)
            qb.andWhere('po.status = :status', { status });
        const [data, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .orderBy('po.orderDate', 'DESC')
            .getManyAndCount();
        return { data, total, page, limit };
    }
    async findById(id) {
        const po = await this.poRepo.findOne({
            where: { id },
            relations: { supplier: true, items: { product: true } },
        });
        if (!po)
            throw new common_1.NotFoundException(`Purchase Order #${id} not found`);
        return po;
    }
    async create(dto, orderedBy) {
        return this.dataSource.transaction(async (manager) => {
            const orderNumber = await this.generateOrderNumber(manager);
            let totalAmount = 0;
            const po = manager.create(purchase_order_entity_1.PurchaseOrderEntity, {
                orderNumber,
                supplierId: dto.supplierId ?? null,
                orderedBy: orderedBy ?? null,
                orderDate: new Date(),
                status: purchase_order_entity_1.PurchaseOrderStatus.PENDING,
                notes: dto.notes ?? null,
                totalAmount: 0,
            });
            const savedPo = await manager.save(po);
            for (const item of dto.items) {
                const product = await manager.findOne(product_entity_1.ProductEntity, { where: { id: item.productId } });
                if (!product)
                    throw new common_1.NotFoundException(`Producto #${item.productId} no encontrado`);
                const purchaseUnit = item.purchaseUnit ?? 'unit';
                let quantityOrdered;
                let unitCost;
                let boxesOrdered = null;
                let boxCost = null;
                if (purchaseUnit === 'box') {
                    if (!product.hasBoxPresentation || !product.unitsPerBox || Number(product.unitsPerBox) <= 0) {
                        throw new common_1.BadRequestException(`El producto "${product.name}" no tiene configurada la presentación en caja. ` +
                            `Activa "Presentación en Caja" y define las unidades por caja en el catálogo de productos.`);
                    }
                    if (!item.boxesOrdered || item.boxesOrdered <= 0) {
                        throw new common_1.BadRequestException(`Debe indicar la cantidad de cajas para el producto "${product.name}"`);
                    }
                    if (item.boxCost === undefined || item.boxCost === null) {
                        throw new common_1.BadRequestException(`Debe indicar el costo por caja para el producto "${product.name}"`);
                    }
                    boxesOrdered = item.boxesOrdered;
                    boxCost = item.boxCost;
                    quantityOrdered = Number(item.boxesOrdered) * Number(product.unitsPerBox);
                    unitCost = Number(item.boxCost) / Number(product.unitsPerBox);
                }
                else {
                    if (!item.quantityOrdered || item.quantityOrdered <= 0) {
                        throw new common_1.BadRequestException(`Debe indicar la cantidad para el producto "${product.name}"`);
                    }
                    if (item.unitCost === undefined || item.unitCost === null) {
                        throw new common_1.BadRequestException(`Debe indicar el costo unitario para el producto "${product.name}"`);
                    }
                    quantityOrdered = item.quantityOrdered;
                    unitCost = item.unitCost;
                }
                const subtotal = quantityOrdered * unitCost;
                totalAmount += subtotal;
                await manager.save(manager.create(purchase_order_item_entity_1.PurchaseOrderItemEntity, {
                    purchaseOrderId: savedPo.id,
                    productId: item.productId,
                    purchaseUnit: purchaseUnit === 'box' ? purchase_order_item_entity_1.PurchaseUnit.BOX : purchase_order_item_entity_1.PurchaseUnit.UNIT,
                    boxesOrdered,
                    boxCost,
                    quantityOrdered,
                    quantityReceived: 0,
                    unitCost,
                    subtotal,
                }));
            }
            savedPo.totalAmount = totalAmount;
            return manager.save(savedPo);
        });
    }
    async receive(id, dto, receivedBy) {
        return this.dataSource.transaction(async (manager) => {
            const po = await manager.findOne(purchase_order_entity_1.PurchaseOrderEntity, {
                where: { id },
                relations: { items: true },
            });
            if (!po)
                throw new common_1.NotFoundException(`Purchase Order #${id} not found`);
            if (po.status === purchase_order_entity_1.PurchaseOrderStatus.RECEIVED) {
                throw new common_1.BadRequestException('This purchase order has already been fully received');
            }
            if (po.status === purchase_order_entity_1.PurchaseOrderStatus.CANCELLED) {
                throw new common_1.BadRequestException('Cannot receive a cancelled purchase order');
            }
            for (const recv of dto.items) {
                const poItem = po.items.find((i) => i.id === recv.itemId);
                if (!poItem)
                    throw new common_1.NotFoundException(`PO Item #${recv.itemId} not found`);
                const remaining = Number(poItem.quantityOrdered) - Number(poItem.quantityReceived);
                const toReceive = Math.min(recv.quantityReceived, remaining);
                if (toReceive <= 0)
                    continue;
                poItem.quantityReceived = Number(poItem.quantityReceived) + toReceive;
                await manager.save(poItem);
                if (poItem.productId) {
                    const product = await manager.findOne(product_entity_1.ProductEntity, { where: { id: poItem.productId } });
                    if (product) {
                        product.stockQuantity = Number(product.stockQuantity) + toReceive;
                        product.costPrice = Number(poItem.unitCost);
                        await manager.save(product);
                        await manager.save(manager.create(inventory_movement_entity_1.InventoryMovementEntity, {
                            productId: product.id,
                            movementType: inventory_movement_entity_1.MovementType.IN,
                            quantity: toReceive,
                            referenceType: inventory_movement_entity_1.MovementReferenceType.PURCHASE_ORDER,
                            referenceId: po.id,
                            notes: `Received from PO ${po.orderNumber}`,
                            performedBy: receivedBy,
                        }));
                    }
                }
            }
            const allReceived = po.items.every((i) => Number(i.quantityReceived) >= Number(i.quantityOrdered));
            po.status = allReceived ? purchase_order_entity_1.PurchaseOrderStatus.RECEIVED : purchase_order_entity_1.PurchaseOrderStatus.PARTIAL;
            po.receivedDate = new Date();
            po.receivedBy = receivedBy ?? null;
            if (dto.notes)
                po.notes = dto.notes;
            return manager.save(po);
        });
    }
    async cancel(id) {
        const po = await this.findById(id);
        if (po.status !== purchase_order_entity_1.PurchaseOrderStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending purchase orders can be cancelled');
        }
        po.status = purchase_order_entity_1.PurchaseOrderStatus.CANCELLED;
        return this.poRepo.save(po);
    }
    async generateOrderNumber(manager) {
        const last = await manager
            .createQueryBuilder(purchase_order_entity_1.PurchaseOrderEntity, 'po')
            .orderBy('po.id', 'DESC')
            .getOne();
        const nextNum = last ? last.id + 1 : 1;
        return `PO-${String(nextNum).padStart(6, '0')}`;
    }
};
exports.PurchaseOrderService = PurchaseOrderService;
exports.PurchaseOrderService = PurchaseOrderService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(purchase_order_entity_1.PurchaseOrderEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(purchase_order_item_entity_1.PurchaseOrderItemEntity)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.ProductEntity)),
    __param(3, (0, typeorm_1.InjectRepository)(inventory_movement_entity_1.InventoryMovementEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], PurchaseOrderService);
//# sourceMappingURL=purchase-order.service.js.map