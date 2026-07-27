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
exports.ProductBatchEntity = void 0;
const typeorm_1 = require("typeorm");
const product_entity_1 = require("./product.entity");
const supplier_entity_1 = require("./supplier.entity");
let ProductBatchEntity = class ProductBatchEntity {
};
exports.ProductBatchEntity = ProductBatchEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ProductBatchEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id' }),
    __metadata("design:type", Number)
], ProductBatchEntity.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.ProductEntity, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.ProductEntity)
], ProductBatchEntity.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id', nullable: true }),
    __metadata("design:type", Number)
], ProductBatchEntity.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supplier_entity_1.SupplierEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'supplier_id' }),
    __metadata("design:type", supplier_entity_1.SupplierEntity)
], ProductBatchEntity.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_ref', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], ProductBatchEntity.prototype, "documentRef", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cost_price', type: 'decimal', precision: 10, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], ProductBatchEntity.prototype, "costPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'initial_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], ProductBatchEntity.prototype, "initialQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], ProductBatchEntity.prototype, "currentQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expiration_date', type: 'date', nullable: true }),
    __metadata("design:type", Date)
], ProductBatchEntity.prototype, "expirationDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ProductBatchEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ProductBatchEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ProductBatchEntity.prototype, "updatedAt", void 0);
exports.ProductBatchEntity = ProductBatchEntity = __decorate([
    (0, typeorm_1.Entity)('product_batches'),
    (0, typeorm_1.Index)('IDX_batches_product_id', ['productId'])
], ProductBatchEntity);
//# sourceMappingURL=product-batch.entity.js.map