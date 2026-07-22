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
exports.ProductEntity = exports.ProductUnit = void 0;
const typeorm_1 = require("typeorm");
const category_entity_1 = require("./category.entity");
const supplier_entity_1 = require("./supplier.entity");
var ProductUnit;
(function (ProductUnit) {
    ProductUnit["PIECE"] = "piece";
    ProductUnit["KG"] = "kg";
    ProductUnit["LITER"] = "liter";
    ProductUnit["BOX"] = "box";
    ProductUnit["DOZEN"] = "dozen";
    ProductUnit["PACK"] = "pack";
})(ProductUnit || (exports.ProductUnit = ProductUnit = {}));
let ProductEntity = class ProductEntity {
};
exports.ProductEntity = ProductEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ProductEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ProductEntity.prototype, "barcode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ProductEntity.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], ProductEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ProductEntity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'category_id', nullable: true }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => category_entity_1.CategoryEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", category_entity_1.CategoryEntity)
], ProductEntity.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id', nullable: true }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supplier_entity_1.SupplierEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'supplier_id' }),
    __metadata("design:type", supplier_entity_1.SupplierEntity)
], ProductEntity.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProductUnit, default: ProductUnit.PIECE }),
    __metadata("design:type", String)
], ProductEntity.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cost_price', type: 'decimal', precision: 10, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "costPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sale_price', type: 'decimal', precision: 10, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "salePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 12.0 }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "taxRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stock_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "stockQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_stock_level', type: 'decimal', precision: 10, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "minStockLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_stock_level', type: 'decimal', precision: 10, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "maxStockLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'image_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], ProductEntity.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ProductEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ProductEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ProductEntity.prototype, "updatedAt", void 0);
exports.ProductEntity = ProductEntity = __decorate([
    (0, typeorm_1.Entity)('products'),
    (0, typeorm_1.Index)('IDX_products_barcode', ['barcode'], { unique: true, where: 'barcode IS NOT NULL' }),
    (0, typeorm_1.Index)('IDX_products_sku', ['sku'], { unique: true, where: 'sku IS NOT NULL' })
], ProductEntity);
//# sourceMappingURL=product.entity.js.map