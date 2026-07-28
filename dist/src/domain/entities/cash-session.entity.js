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
exports.CashSessionEntity = exports.CashSessionStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const establishment_entity_1 = require("./establishment.entity");
var CashSessionStatus;
(function (CashSessionStatus) {
    CashSessionStatus["OPEN"] = "open";
    CashSessionStatus["CLOSED"] = "closed";
})(CashSessionStatus || (exports.CashSessionStatus = CashSessionStatus = {}));
let CashSessionEntity = class CashSessionEntity {
};
exports.CashSessionEntity = CashSessionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CashSessionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cashier_id', type: 'int' }),
    __metadata("design:type", Number)
], CashSessionEntity.prototype, "cashierId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { onDelete: 'SET NULL', nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'cashier_id' }),
    __metadata("design:type", user_entity_1.UserEntity)
], CashSessionEntity.prototype, "cashier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'establishment_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], CashSessionEntity.prototype, "establishmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => establishment_entity_1.EstablishmentEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'establishment_id' }),
    __metadata("design:type", establishment_entity_1.EstablishmentEntity)
], CashSessionEntity.prototype, "establishment", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'status', type: 'enum', enum: CashSessionStatus, default: CashSessionStatus.OPEN }),
    __metadata("design:type", String)
], CashSessionEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opening_amount', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CashSessionEntity.prototype, "openingAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_amount', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CashSessionEntity.prototype, "expectedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closing_amount', type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CashSessionEntity.prototype, "closingAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'difference', type: 'decimal', precision: 12, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CashSessionEntity.prototype, "difference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closing_notes', type: 'text', nullable: true }),
    __metadata("design:type", String)
], CashSessionEntity.prototype, "closingNotes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'opened_at', type: 'timestamp' }),
    __metadata("design:type", Date)
], CashSessionEntity.prototype, "openedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closed_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CashSessionEntity.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)('CashMovementEntity', 'session'),
    __metadata("design:type", Array)
], CashSessionEntity.prototype, "movements", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CashSessionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CashSessionEntity.prototype, "updatedAt", void 0);
exports.CashSessionEntity = CashSessionEntity = __decorate([
    (0, typeorm_1.Entity)('cash_sessions')
], CashSessionEntity);
//# sourceMappingURL=cash-session.entity.js.map