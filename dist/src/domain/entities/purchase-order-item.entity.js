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
exports.PurchaseOrderItemEntity = void 0;
const typeorm_1 = require("typeorm");
const purchase_order_entity_1 = require("./purchase-order.entity");
const product_entity_1 = require("./product.entity");
let PurchaseOrderItemEntity = class PurchaseOrderItemEntity {
};
exports.PurchaseOrderItemEntity = PurchaseOrderItemEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], PurchaseOrderItemEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purchase_order_id' }),
    __metadata("design:type", Number)
], PurchaseOrderItemEntity.prototype, "purchaseOrderId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_entity_1.PurchaseOrderEntity, (po) => po.items, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_order_id' }),
    __metadata("design:type", purchase_order_entity_1.PurchaseOrderEntity)
], PurchaseOrderItemEntity.prototype, "purchaseOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id', nullable: true }),
    __metadata("design:type", Number)
], PurchaseOrderItemEntity.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.ProductEntity, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.ProductEntity)
], PurchaseOrderItemEntity.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity_ordered', type: 'decimal', precision: 10, scale: 3 }),
    __metadata("design:type", Number)
], PurchaseOrderItemEntity.prototype, "quantityOrdered", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'quantity_received', type: 'decimal', precision: 10, scale: 3, default: 0 }),
    __metadata("design:type", Number)
], PurchaseOrderItemEntity.prototype, "quantityReceived", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], PurchaseOrderItemEntity.prototype, "unitCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 4 }),
    __metadata("design:type", Number)
], PurchaseOrderItemEntity.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], PurchaseOrderItemEntity.prototype, "createdAt", void 0);
exports.PurchaseOrderItemEntity = PurchaseOrderItemEntity = __decorate([
    (0, typeorm_1.Entity)('purchase_order_items')
], PurchaseOrderItemEntity);
//# sourceMappingURL=purchase-order-item.entity.js.map