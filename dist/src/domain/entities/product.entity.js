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
exports.ProductEntity = exports.TipAfeIgv = exports.ProductUnit = void 0;
const typeorm_1 = require("typeorm");
const category_entity_1 = require("./category.entity");
const supplier_entity_1 = require("./supplier.entity");
var ProductUnit;
(function (ProductUnit) {
    ProductUnit["NIU"] = "NIU";
    ProductUnit["KGM"] = "KGM";
    ProductUnit["GRM"] = "GRM";
    ProductUnit["LTR"] = "LTR";
    ProductUnit["MLT"] = "MLT";
    ProductUnit["MTR"] = "MTR";
    ProductUnit["CMT"] = "CMT";
    ProductUnit["MTK"] = "MTK";
    ProductUnit["MTQ"] = "MTQ";
    ProductUnit["TNE"] = "TNE";
    ProductUnit["GLL"] = "GLL";
    ProductUnit["BX"] = "BX";
    ProductUnit["DZN"] = "DZN";
    ProductUnit["PK"] = "PK";
    ProductUnit["BG"] = "BG";
    ProductUnit["BO"] = "BO";
    ProductUnit["CJ"] = "CJ";
    ProductUnit["SA"] = "SA";
    ProductUnit["SET"] = "SET";
    ProductUnit["ZZ"] = "ZZ";
    ProductUnit["HUR"] = "HUR";
    ProductUnit["DAY"] = "DAY";
    ProductUnit["MON"] = "MON";
})(ProductUnit || (exports.ProductUnit = ProductUnit = {}));
var TipAfeIgv;
(function (TipAfeIgv) {
    TipAfeIgv["GRAVADO_ONEROSA"] = "10";
    TipAfeIgv["GRAVADO_RETIRO_PREMIO"] = "11";
    TipAfeIgv["GRAVADO_RETIRO_DONACION"] = "12";
    TipAfeIgv["GRAVADO_RETIRO"] = "13";
    TipAfeIgv["GRAVADO_RETIRO_PUBLICIDAD"] = "14";
    TipAfeIgv["GRAVADO_BONIFICACIONES"] = "15";
    TipAfeIgv["GRAVADO_RETIRO_TRABAJADOR"] = "16";
    TipAfeIgv["GRAVADO_IVAP"] = "17";
    TipAfeIgv["EXONERADO_ONEROSA"] = "20";
    TipAfeIgv["EXONERADO_TRANSFERENCIA"] = "21";
    TipAfeIgv["INAFECTO_ONEROSA"] = "30";
    TipAfeIgv["INAFECTO_RETIRO_BONIF"] = "31";
    TipAfeIgv["INAFECTO_RETIRO"] = "32";
    TipAfeIgv["INAFECTO_RETIRO_MUESTRAS"] = "33";
    TipAfeIgv["INAFECTO_RETIRO_CONVENIO"] = "34";
    TipAfeIgv["INAFECTO_RETIRO_PREMIO"] = "35";
    TipAfeIgv["INAFECTO_RETIRO_PUBLICIDAD"] = "36";
    TipAfeIgv["EXPORTACION"] = "40";
})(TipAfeIgv || (exports.TipAfeIgv = TipAfeIgv = {}));
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
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 10,
        default: ProductUnit.NIU,
        comment: 'Catálogo Nº 3 SUNAT - Código de Unidad de Medida',
    }),
    __metadata("design:type", String)
], ProductEntity.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'tip_afe_igv',
        type: 'varchar',
        length: 5,
        default: TipAfeIgv.GRAVADO_ONEROSA,
        comment: 'Catálogo Nº 7 SUNAT - Tipo de Afectación del IGV',
    }),
    __metadata("design:type", String)
], ProductEntity.prototype, "tipAfeIgv", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cost_price', type: 'decimal', precision: 10, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "costPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sale_price', type: 'decimal', precision: 10, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "salePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 18.0 }),
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
    (0, typeorm_1.Column)({ name: 'has_box_presentation', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ProductEntity.prototype, "hasBoxPresentation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'units_per_box', type: 'decimal', precision: 10, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "unitsPerBox", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'box_sale_price', type: 'decimal', precision: 10, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], ProductEntity.prototype, "boxSalePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'box_unit_name', type: 'varchar', length: 50, nullable: true, default: 'Caja' }),
    __metadata("design:type", String)
], ProductEntity.prototype, "boxUnitName", void 0);
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