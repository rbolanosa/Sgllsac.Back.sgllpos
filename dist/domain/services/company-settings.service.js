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
exports.CompanySettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const company_settings_entity_1 = require("../entities/company-settings.entity");
const SINGLETON_ID = 1;
let CompanySettingsService = class CompanySettingsService {
    constructor(repo) {
        this.repo = repo;
    }
    async get() {
        let settings = await this.repo.findOne({ where: { id: SINGLETON_ID } });
        if (!settings) {
            settings = this.repo.create({ id: SINGLETON_ID });
            await this.repo.save(settings);
        }
        return settings;
    }
    async update(dto) {
        await this.get();
        await this.repo.update(SINGLETON_ID, {
            ...dto,
        });
        return this.get();
    }
    async nextInvoiceNumber(type, manager) {
        const mgr = manager || this.repo;
        const settings = manager
            ? await manager.findOne(company_settings_entity_1.CompanySettingsEntity, { where: { id: SINGLETON_ID } })
            : await this.get();
        let serie = settings?.serieBoleta || 'B001';
        let correlativo = settings?.correlativoBoleta || 1;
        let fieldToIncrement = 'correlativo_boleta';
        if (type === 'factura') {
            serie = settings?.serieFactura || 'F001';
            correlativo = settings?.correlativoFactura || 1;
            fieldToIncrement = 'correlativo_factura';
        }
        else if (type === 'nota_venta') {
            serie = settings?.serieNotaVenta || 'NV01';
            correlativo = settings?.correlativoNotaVenta || 1;
            fieldToIncrement = 'correlativo_nota_venta';
        }
        const invoiceNumber = `${serie}-${String(correlativo).padStart(8, '0')}`;
        if (manager) {
            await manager.query(`UPDATE company_settings SET ${fieldToIncrement} = ${fieldToIncrement} + 1 WHERE id = ?`, [SINGLETON_ID]);
        }
        else {
            await this.repo.increment({ id: SINGLETON_ID }, fieldToIncrement === 'correlativo_boleta' ? 'correlativoBoleta' : fieldToIncrement === 'correlativo_factura' ? 'correlativoFactura' : 'correlativoNotaVenta', 1);
        }
        return invoiceNumber;
    }
};
exports.CompanySettingsService = CompanySettingsService;
exports.CompanySettingsService = CompanySettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(company_settings_entity_1.CompanySettingsEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], CompanySettingsService);
//# sourceMappingURL=company-settings.service.js.map