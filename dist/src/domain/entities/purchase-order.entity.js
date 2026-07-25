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
exports.PurchaseOrderEntity = exports.PurchaseOrderStatus = void 0;
const typeorm_1 = require("typeorm");
const supplier_entity_1 = require("./supplier.entity");
const purchase_order_item_entity_1 = require("./purchase-order-item.entity");
var PurchaseOrderStatus;
(function (PurchaseOrderStatus) {
    PurchaseOrderStatus["PENDING"] = "pending";
    PurchaseOrderStatus["RECEIVED"] = "received";
    PurchaseOrderStatus["PARTIAL"] = "partial";
    PurchaseOrderStatus["CANCELLED"] = "cancelled";
})(PurchaseOrderStatus || (exports.PurchaseOrderStatus = PurchaseOrderStatus = {}));
let PurchaseOrderEntity = class PurchaseOrderEntity {
};
exports.PurchaseOrderEntity = PurchaseOrderEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PurchaseOrderEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_number', type: 'varchar', length: 20, unique: true }),
    __metadata("design:type", String)
], PurchaseOrderEntity.prototype, "orderNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_id', nullable: true }),
    __metadata("design:type", Number)
], PurchaseOrderEntity.prototype, "supplierId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supplier_entity_1.SupplierEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'supplier_id' }),
    __metadata("design:type", supplier_entity_1.SupplierEntity)
], PurchaseOrderEntity.prototype, "supplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ordered_by', nullable: true }),
    __metadata("design:type", Number)
], PurchaseOrderEntity.prototype, "orderedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_by', nullable: true }),
    __metadata("design:type", Number)
], PurchaseOrderEntity.prototype, "receivedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_date', type: 'timestamp' }),
    __metadata("design:type", Date)
], PurchaseOrderEntity.prototype, "orderDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_date', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], PurchaseOrderEntity.prototype, "receivedDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.PENDING }),
    __metadata("design:type", String)
], PurchaseOrderEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_amount', type: 'decimal', precision: 12, scale: 4, default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrderEntity.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], PurchaseOrderEntity.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => purchase_order_item_entity_1.PurchaseOrderItemEntity, (item) => item.purchaseOrder, { cascade: true }),
    __metadata("design:type", Array)
], PurchaseOrderEntity.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PurchaseOrderEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], PurchaseOrderEntity.prototype, "updatedAt", void 0);
exports.PurchaseOrderEntity = PurchaseOrderEntity = __decorate([
    (0, typeorm_1.Entity)('purchase_orders'),
    (0, typeorm_1.Index)('IDX_purchase_orders_order_number', ['orderNumber'], { unique: true })
], PurchaseOrderEntity);
//# sourceMappingURL=purchase-order.entity.js.map