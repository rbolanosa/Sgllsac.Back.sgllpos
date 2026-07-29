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
exports.CashMovementEntity = exports.CashMovementType = void 0;
const typeorm_1 = require("typeorm");
const cash_session_entity_1 = require("./cash-session.entity");
const user_entity_1 = require("./user.entity");
var CashMovementType;
(function (CashMovementType) {
    CashMovementType["OPENING"] = "opening";
    CashMovementType["SALE_CASH"] = "sale_cash";
    CashMovementType["SALE_CARD"] = "sale_card";
    CashMovementType["SALE_TRANSFER"] = "sale_transfer";
    CashMovementType["SALE_YAPE"] = "sale_yape";
    CashMovementType["SALE_PLIN"] = "sale_plin";
    CashMovementType["SALE_MIXED"] = "sale_mixed";
    CashMovementType["WITHDRAWAL"] = "withdrawal";
    CashMovementType["DEPOSIT"] = "deposit";
    CashMovementType["EXPENSE"] = "expense";
    CashMovementType["REFUND"] = "refund";
    CashMovementType["CLOSING"] = "closing";
})(CashMovementType || (exports.CashMovementType = CashMovementType = {}));
let CashMovementEntity = class CashMovementEntity {
};
exports.CashMovementEntity = CashMovementEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CashMovementEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', type: 'int' }),
    __metadata("design:type", Number)
], CashMovementEntity.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => cash_session_entity_1.CashSessionEntity, (s) => s.movements, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'session_id' }),
    __metadata("design:type", cash_session_entity_1.CashSessionEntity)
], CashMovementEntity.prototype, "session", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'type', type: 'enum', enum: CashMovementType }),
    __metadata("design:type", String)
], CashMovementEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], CashMovementEntity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'description', type: 'varchar', length: 300, nullable: true }),
    __metadata("design:type", String)
], CashMovementEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], CashMovementEntity.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], CashMovementEntity.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], CashMovementEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.UserEntity)
], CashMovementEntity.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CashMovementEntity.prototype, "createdAt", void 0);
exports.CashMovementEntity = CashMovementEntity = __decorate([
    (0, typeorm_1.Entity)('cash_movements')
], CashMovementEntity);
//# sourceMappingURL=cash-movement.entity.js.map