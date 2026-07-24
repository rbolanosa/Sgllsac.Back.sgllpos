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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstablishmentEntity = void 0;
const typeorm_1 = require("typeorm");
const company_settings_entity_1 = require("./company-settings.entity");
let EstablishmentEntity = class EstablishmentEntity {
};
exports.EstablishmentEntity = EstablishmentEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], EstablishmentEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'company_settings_id', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], EstablishmentEntity.prototype, "companySettingsId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_settings_entity_1.CompanySettingsEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'company_settings_id' }),
    __metadata("design:type", company_settings_entity_1.CompanySettingsEntity)
], EstablishmentEntity.prototype, "companySettings", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150 }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "nombre", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cod_local', type: 'varchar', length: 10, default: '0000' }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "codLocal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "direccion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 6, nullable: true }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "ubigeo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "departamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "provincia", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "distrito", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "telefono", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 150, nullable: true }),
    __metadata("design:type", String)
], EstablishmentEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'es_principal', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], EstablishmentEntity.prototype, "esPrincipal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], EstablishmentEntity.prototype, "activo", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('EstablishmentSeriesEntity', 'establishment'),
    __metadata("design:type", Array)
], EstablishmentEntity.prototype, "series", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], EstablishmentEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], EstablishmentEntity.prototype, "updatedAt", void 0);
exports.EstablishmentEntity = EstablishmentEntity = __decorate([
    (0, typeorm_1.Entity)('establishments'),
    (0, typeorm_1.Unique)('UQ_establishment_company_cod_local', ['companySettingsId', 'codLocal'])
], EstablishmentEntity);
//# sourceMappingURL=establishment.entity.js.map