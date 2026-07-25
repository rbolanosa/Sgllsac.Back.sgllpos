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
exports.InventoryMovementEntity = exports.MovementReferenceType = exports.MovementType = void 0;
const typeorm_1 = require("typeorm");
const product_entity_1 = require("./product.entity");
var MovementType;
(function (MovementType) {
    MovementType["IN"] = "in";
    MovementType["OUT"] = "out";
    MovementType["ADJUSTMENT"] = "adjustment";
    MovementType["LOSS"] = "loss";
})(MovementType || (exports.MovementType = MovementType = {}));
var MovementReferenceType;
(function (MovementReferenceType) {
    MovementReferenceType["SALE"] = "sale";
    MovementReferenceType["PURCHASE_ORDER"] = "purchase_order";
    MovementReferenceType["MANUAL"] = "manual";
    MovementReferenceType["INITIAL"] = "initial";
})(MovementReferenceType || (exports.MovementReferenceType = MovementReferenceType = {}));
let InventoryMovementEntity = class InventoryMovementEntity {
};
exports.InventoryMovementEntity = InventoryMovementEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], InventoryMovementEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id' }),
    __metadata("design:type", Number)
], InventoryMovementEntity.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.ProductEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.ProductEntity)
], InventoryMovementEntity.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'movement_type', type: 'enum', enum: MovementType }),
    __metadata("design:type", String)
], InventoryMovementEntity.prototype, "movementType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 3 }),
    __metadata("design:type", Number)
], InventoryMovementEntity.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_type', type: 'enum', enum: MovementReferenceType }),
    __metadata("design:type", String)
], InventoryMovementEntity.prototype, "referenceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reference_id', nullable: true }),
    __metadata("design:type", Number)
], InventoryMovementEntity.prototype, "referenceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], InventoryMovementEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'performed_by', nullable: true }),
    __metadata("design:type", Number)
], InventoryMovementEntity.prototype, "performedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], InventoryMovementEntity.prototype, "createdAt", void 0);
exports.InventoryMovementEntity = InventoryMovementEntity = __decorate([
    (0, typeorm_1.Entity)('inventory_movements')
], InventoryMovementEntity);
//# sourceMappingURL=inventory-movement.entity.js.map