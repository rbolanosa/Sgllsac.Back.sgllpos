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
exports.ProductService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("../../domain/entities/product.entity");
const inventory_movement_entity_1 = require("../../domain/entities/inventory-movement.entity");
let ProductService = class ProductService {
    constructor(productRepo, movementRepo) {
        this.productRepo = productRepo;
        this.movementRepo = movementRepo;
    }
    async findAll(filters = {}) {
        const { search, categoryId, supplierId, isActive, lowStock, page = 1, limit = 50 } = filters;
        const qb = this.productRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.category', 'c')
            .leftJoinAndSelect('p.supplier', 's');
        if (search) {
            qb.andWhere('(p.name LIKE :s OR p.barcode LIKE :s OR p.sku LIKE :s)', { s: `%${search}%` });
        }
        if (categoryId)
            qb.andWhere('p.categoryId = :categoryId', { categoryId });
        if (supplierId)
            qb.andWhere('p.supplierId = :supplierId', { supplierId });
        if (isActive !== undefined)
            qb.andWhere('p.isActive = :isActive', { isActive });
        if (lowStock)
            qb.andWhere('p.stockQuantity <= p.minStockLevel');
        const [data, total] = await qb
            .skip((page - 1) * limit)
            .take(limit)
            .orderBy('p.name', 'ASC')
            .getManyAndCount();
        return { data, total, page, limit };
    }
    async findById(id) {
        const product = await this.productRepo.findOne({
            where: { id },
            relations: { category: true, supplier: true },
        });
        if (!product)
            throw new common_1.NotFoundException(`Product #${id} not found`);
        return product;
    }
    async findByBarcode(barcode) {
        const product = await this.productRepo.findOne({
            where: { barcode, isActive: true },
            relations: { category: true },
        });
        if (!product)
            throw new common_1.NotFoundException(`Product with barcode "${barcode}" not found`);
        return product;
    }
    async create(dto) {
        if (dto.barcode) {
            const exists = await this.productRepo.findOne({ where: { barcode: dto.barcode } });
            if (exists)
                throw new common_1.ConflictException(`Barcode "${dto.barcode}" already registered`);
        }
        if (dto.sku) {
            const exists = await this.productRepo.findOne({ where: { sku: dto.sku } });
            if (exists)
                throw new common_1.ConflictException(`SKU "${dto.sku}" already registered`);
        }
        const product = this.productRepo.create(dto);
        return this.productRepo.save(product);
    }
    async update(id, dto) {
        const product = await this.findById(id);
        Object.assign(product, dto);
        return this.productRepo.save(product);
    }
    async remove(id) {
        const product = await this.findById(id);
        product.isActive = false;
        await this.productRepo.save(product);
    }
    async adjustStock(id, dto, type, performedBy) {
        const product = await this.findById(id);
        if (type === inventory_movement_entity_1.MovementType.OUT && product.stockQuantity < dto.quantity) {
            throw new common_1.BadRequestException(`Insufficient stock. Available: ${product.stockQuantity}, requested: ${dto.quantity}`);
        }
        const delta = type === inventory_movement_entity_1.MovementType.IN ? dto.quantity : -dto.quantity;
        product.stockQuantity = Number(product.stockQuantity) + delta;
        await this.productRepo.save(product);
        await this.movementRepo.save(this.movementRepo.create({
            productId: id,
            movementType: type,
            quantity: dto.quantity,
            referenceType: inventory_movement_entity_1.MovementReferenceType.MANUAL,
            notes: dto.notes,
            performedBy,
        }));
        return product;
    }
    async getLowStockProducts() {
        return this.productRepo
            .createQueryBuilder('p')
            .where('p.isActive = true')
            .andWhere('p.stockQuantity <= p.minStockLevel')
            .leftJoinAndSelect('p.category', 'c')
            .orderBy('p.stockQuantity', 'ASC')
            .getMany();
    }
};
exports.ProductService = ProductService;
exports.ProductService = ProductService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.ProductEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(inventory_movement_entity_1.InventoryMovementEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ProductService);
//# sourceMappingURL=product.service.js.map