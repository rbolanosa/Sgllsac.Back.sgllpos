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
exports.EstablishmentSeriesEntity = void 0;
const typeorm_1 = require("typeorm");
let EstablishmentSeriesEntity = class EstablishmentSeriesEntity {
};
exports.EstablishmentSeriesEntity = EstablishmentSeriesEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], EstablishmentSeriesEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'establishment_id', type: 'int' }),
    __metadata("design:type", Number)
], EstablishmentSeriesEntity.prototype, "establishmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)('EstablishmentEntity', 'series', { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'establishment_id' }),
    __metadata("design:type", Function)
], EstablishmentSeriesEntity.prototype, "establishment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, comment: 'factura, boleta, nota_credito, etc.' }),
    __metadata("design:type", String)
], EstablishmentSeriesEntity.prototype, "tipo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, comment: 'F001, B001, FC01, etc.' }),
    __metadata("design:type", String)
], EstablishmentSeriesEntity.prototype, "serie", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlativo_actual', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], EstablishmentSeriesEntity.prototype, "correlativoActual", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlativo_inicial', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], EstablishmentSeriesEntity.prototype, "correlativoInicial", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], EstablishmentSeriesEntity.prototype, "activo", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], EstablishmentSeriesEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], EstablishmentSeriesEntity.prototype, "updatedAt", void 0);
exports.EstablishmentSeriesEntity = EstablishmentSeriesEntity = __decorate([
    (0, typeorm_1.Entity)('establishment_series'),
    (0, typeorm_1.Unique)(['establishmentId', 'tipo']),
    (0, typeorm_1.Unique)(['serie'])
], EstablishmentSeriesEntity);
//# sourceMappingURL=establishment-series.entity.js.map