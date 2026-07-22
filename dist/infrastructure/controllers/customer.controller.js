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
exports.CustomerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const customer_entity_1 = require("../../domain/entities/customer.entity");
const customer_dto_1 = require("../../application/dtos/customer.dto");
let CustomerController = class CustomerController {
    constructor(customerRepo) {
        this.customerRepo = customerRepo;
    }
    async findAll(search, page = 1, limit = 20) {
        const qb = this.customerRepo
            .createQueryBuilder('c')
            .where('c.isActive = true')
            .orderBy('c.name', 'ASC')
            .skip((+page - 1) * +limit)
            .take(+limit);
        if (search) {
            qb.andWhere('(c.name LIKE :q OR c.nit LIKE :q OR c.phone LIKE :q OR c.email LIKE :q)', {
                q: `%${search}%`,
            });
        }
        const [data, total] = await qb.getManyAndCount();
        return { data, total, page: +page, limit: +limit };
    }
    async lookupDoc(doc) {
        const clean = doc.trim();
        const existing = await this.customerRepo.findOne({ where: { nit: clean } });
        if (existing) {
            return { source: 'db', data: existing };
        }
        const token = process.env.APISPERU_TOKEN || '';
        if (clean.length === 8) {
            try {
                const res = await fetch(`https://dniruc.apisperu.com/api/v1/dni/${clean}?token=${token}`, { headers: { 'Accept': 'application/json' } });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (json.nombres || json.apellidoPaterno) {
                    const name = `${json.apellidoPaterno || ''} ${json.apellidoMaterno || ''} ${json.nombres || ''}`.trim();
                    return {
                        source: 'api',
                        data: { nit: clean, name, address: '' },
                    };
                }
            }
            catch (e) { }
        }
        if (clean.length === 11) {
            try {
                const res = await fetch(`https://dniruc.apisperu.com/api/v1/ruc/${clean}?token=${token}`, { headers: { 'Accept': 'application/json' } });
                if (!res.ok)
                    throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (json.razonSocial) {
                    return {
                        source: 'api',
                        data: {
                            nit: clean,
                            name: json.razonSocial,
                            address: json.direccion || '',
                        },
                    };
                }
            }
            catch (e) { }
        }
        return { source: 'not_found', data: null };
    }
    async findOne(id) {
        const cust = await this.customerRepo.findOne({ where: { id } });
        if (!cust)
            throw new common_1.NotFoundException(`Customer #${id} not found`);
        return cust;
    }
    create(dto) {
        const cust = this.customerRepo.create(dto);
        return this.customerRepo.save(cust);
    }
    async update(id, dto) {
        const cust = await this.customerRepo.findOne({ where: { id } });
        if (!cust)
            throw new common_1.NotFoundException(`Customer #${id} not found`);
        Object.assign(cust, dto);
        return this.customerRepo.save(cust);
    }
    async remove(id) {
        const cust = await this.customerRepo.findOne({ where: { id } });
        if (!cust)
            throw new common_1.NotFoundException(`Customer #${id} not found`);
        cust.isActive = false;
        return this.customerRepo.save(cust);
    }
};
exports.CustomerController = CustomerController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List customers with pagination and search' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('lookup/:doc'),
    (0, swagger_1.ApiOperation)({ summary: 'Lookup RENIEC/SUNAT by DNI (8 digits) or RUC (11 digits)' }),
    __param(0, (0, common_1.Param)('doc')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "lookupDoc", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customer by ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create customer' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [customer_dto_1.CreateCustomerDto]),
    __metadata("design:returntype", void 0)
], CustomerController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update customer' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, customer_dto_1.UpdateCustomerDto]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft-delete customer' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], CustomerController.prototype, "remove", null);
exports.CustomerController = CustomerController = __decorate([
    (0, swagger_1.ApiTags)('Customers'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('customers'),
    __param(0, (0, typeorm_1.InjectRepository)(customer_entity_1.CustomerEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CustomerController);
//# sourceMappingURL=customer.controller.js.map