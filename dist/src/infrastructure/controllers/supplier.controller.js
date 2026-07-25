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
exports.SupplierController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const supplier_entity_1 = require("../../domain/entities/supplier.entity");
const supplier_dto_1 = require("../../application/dtos/supplier.dto");
let SupplierController = class SupplierController {
    constructor(supplierRepo) {
        this.supplierRepo = supplierRepo;
    }
    async findAll(search, page = 1, limit = 20) {
        const qb = this.supplierRepo
            .createQueryBuilder('s')
            .where('s.isActive = true')
            .orderBy('s.name', 'ASC')
            .skip((+page - 1) * +limit)
            .take(+limit);
        if (search) {
            qb.andWhere('(s.name LIKE :q OR s.nit LIKE :q OR s.contactName LIKE :q OR s.email LIKE :q)', {
                q: `%${search}%`,
            });
        }
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page: +page, limit: +limit };
    }
    async findOne(id) {
        const sup = await this.supplierRepo.findOne({ where: { id } });
        if (!sup)
            throw new common_1.NotFoundException(`Supplier #${id} not found`);
        return sup;
    }
    async create(dto) {
        const sup = this.supplierRepo.create(dto);
        return this.supplierRepo.save(sup);
    }
    async update(id, dto) {
        const sup = await this.supplierRepo.findOne({ where: { id } });
        if (!sup)
            throw new common_1.NotFoundException(`Supplier #${id} not found`);
        Object.assign(sup, dto);
        return this.supplierRepo.save(sup);
    }
    async remove(id) {
        const sup = await this.supplierRepo.findOne({ where: { id } });
        if (!sup)
            throw new common_1.NotFoundException(`Supplier #${id} not found`);
        sup.isActive = false;
        return this.supplierRepo.save(sup);
    }
};
exports.SupplierController = SupplierController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List suppliers with pagination and search' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SupplierController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get supplier by ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SupplierController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create supplier' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [supplier_dto_1.CreateSupplierDto]),
    __metadata("design:returntype", Promise)
], SupplierController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update supplier' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, supplier_dto_1.UpdateSupplierDto]),
    __metadata("design:returntype", Promise)
], SupplierController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft-delete supplier' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SupplierController.prototype, "remove", null);
exports.SupplierController = SupplierController = __decorate([
    (0, swagger_1.ApiTags)('Suppliers'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('suppliers'),
    __param(0, (0, typeorm_1.InjectRepository)(supplier_entity_1.SupplierEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SupplierController);
//# sourceMappingURL=supplier.controller.js.map