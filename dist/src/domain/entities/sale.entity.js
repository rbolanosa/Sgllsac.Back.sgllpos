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
exports.SaleEntity = exports.DocumentType = exports.SaleStatus = exports.PaymentMethod = void 0;
const typeorm_1 = require("typeorm");
const customer_entity_1 = require("./customer.entity");
const sale_item_entity_1 = require("./sale-item.entity");
const user_entity_1 = require("./user.entity");
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["CARD"] = "card";
    PaymentMethod["TRANSFER"] = "transfer";
    PaymentMethod["MIXED"] = "mixed";
    PaymentMethod["YAPE"] = "yape";
    PaymentMethod["PLIN"] = "plin";
    PaymentMethod["DEPOSIT"] = "deposit";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var SaleStatus;
(function (SaleStatus) {
    SaleStatus["COMPLETED"] = "completed";
    SaleStatus["VOIDED"] = "voided";
    SaleStatus["REFUNDED"] = "refunded";
})(SaleStatus || (exports.SaleStatus = SaleStatus = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["FACTURA"] = "factura";
    DocumentType["BOLETA"] = "boleta";
    DocumentType["NOTA_VENTA"] = "nota_venta";
    DocumentType["NOTA_CREDITO"] = "nota_credito";
    DocumentType["NOTA_DEBITO"] = "nota_debito";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
let SaleEntity = class SaleEntity {
};
exports.SaleEntity = SaleEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SaleEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_number', type: 'varchar', length: 20, unique: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'document_type', type: 'enum', enum: DocumentType, default: DocumentType.BOLETA }),
    __metadata("design:type", String)
], SaleEntity.prototype, "documentType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'related_document_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "relatedDocumentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'credit_note_reason', type: 'varchar', length: 300, nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "creditNoteReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', nullable: true }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.CustomerEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", customer_entity_1.CustomerEntity)
], SaleEntity.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cashier_id', nullable: true }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "cashierId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.UserEntity, { nullable: true, onDelete: 'SET NULL', eager: false }),
    (0, typeorm_1.JoinColumn)({ name: 'cashier_id' }),
    __metadata("design:type", user_entity_1.UserEntity)
], SaleEntity.prototype, "cashier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sale_date', type: 'timestamp' }),
    __metadata("design:type", Date)
], SaleEntity.prototype, "saleDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "taxAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "discountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_amount', type: 'decimal', precision: 12, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method', type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH }),
    __metadata("design:type", String)
], SaleEntity.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_tendered', type: 'decimal', precision: 12, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "amountTendered", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'change_given', type: 'decimal', precision: 12, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], SaleEntity.prototype, "changeGiven", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED }),
    __metadata("design:type", String)
], SaleEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dte_number', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "dteNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_status', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "sunatStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_message', type: 'text', nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "sunatMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'xml_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "xmlUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cdr_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "cdrUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "pdfUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'qr_code', type: 'text', nullable: true }),
    __metadata("design:type", String)
], SaleEntity.prototype, "qrCode", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => sale_item_entity_1.SaleItemEntity, (item) => item.sale, { cascade: true, eager: false }),
    __metadata("design:type", Array)
], SaleEntity.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SaleEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], SaleEntity.prototype, "updatedAt", void 0);
exports.SaleEntity = SaleEntity = __decorate([
    (0, typeorm_1.Entity)('sales'),
    (0, typeorm_1.Index)('IDX_sales_invoice_number', ['invoiceNumber'], { unique: true })
], SaleEntity);
//# sourceMappingURL=sale.entity.js.map