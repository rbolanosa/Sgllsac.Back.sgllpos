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
exports.CategoryController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const category_entity_1 = require("../../domain/entities/category.entity");
const category_dto_1 = require("../../application/dtos/category.dto");
let CategoryController = class CategoryController {
    constructor(categoryRepo) {
        this.categoryRepo = categoryRepo;
    }
    async findAll(search, page, limit) {
        if (!page && !limit) {
            const qb = this.categoryRepo.createQueryBuilder('c').orderBy('c.name', 'ASC');
            if (search)
                qb.where('c.name LIKE :q', { q: `%${search}%` });
            const data = await qb.getMany();
            return data;
        }
        const p = +(page || 1);
        const l = +(limit || 20);
        const qb = this.categoryRepo
            .createQueryBuilder('c')
            .orderBy('c.name', 'ASC')
            .skip((p - 1) * l)
            .take(l);
        if (search)
            qb.where('c.name LIKE :q', { q: `%${search}%` });
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page: p, limit: l };
    }
    async findOne(id) {
        const cat = await this.categoryRepo.findOne({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException(`Category #${id} not found`);
        return cat;
    }
    async create(dto) {
        const cat = this.categoryRepo.create(dto);
        return this.categoryRepo.save(cat);
    }
    async update(id, dto) {
        const cat = await this.categoryRepo.findOne({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException(`Category #${id} not found`);
        Object.assign(cat, dto);
        return this.categoryRepo.save(cat);
    }
    async remove(id) {
        const cat = await this.categoryRepo.findOne({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException(`Category #${id} not found`);
        cat.isActive = false;
        return this.categoryRepo.save(cat);
    }
};
exports.CategoryController = CategoryController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List categories with optional pagination' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], CategoryController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get category by ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CategoryController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create category' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [category_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoryController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update category' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, category_dto_1.UpdateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoryController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft-delete category' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CategoryController.prototype, "remove", null);
exports.CategoryController = CategoryController = __decorate([
    (0, swagger_1.ApiTags)('Categories'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('categories'),
    __param(0, (0, typeorm_1.InjectRepository)(category_entity_1.CategoryEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CategoryController);
//# sourceMappingURL=category.controller.js.map