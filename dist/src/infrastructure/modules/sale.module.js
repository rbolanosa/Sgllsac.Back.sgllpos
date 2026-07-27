"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaleModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const sale_entity_1 = require("../../domain/entities/sale.entity");
const sale_item_entity_1 = require("../../domain/entities/sale-item.entity");
const product_entity_1 = require("../../domain/entities/product.entity");
const product_batch_entity_1 = require("../../domain/entities/product-batch.entity");
const customer_entity_1 = require("../../domain/entities/customer.entity");
const inventory_movement_entity_1 = require("../../domain/entities/inventory-movement.entity");
const user_entity_1 = require("../../domain/entities/user.entity");
const sale_service_1 = require("../../domain/services/sale.service");
const sale_controller_1 = require("../controllers/sale.controller");
const company_settings_module_1 = require("./company-settings.module");
const whatsapp_adapter_1 = require("../adapters/whatsapp.adapter");
let SaleModule = class SaleModule {
};
exports.SaleModule = SaleModule;
exports.SaleModule = SaleModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                sale_entity_1.SaleEntity,
                sale_item_entity_1.SaleItemEntity,
                product_entity_1.ProductEntity,
                product_batch_entity_1.ProductBatchEntity,
                customer_entity_1.CustomerEntity,
                inventory_movement_entity_1.InventoryMovementEntity,
                user_entity_1.UserEntity,
            ]),
            company_settings_module_1.CompanySettingsModule,
        ],
        controllers: [sale_controller_1.SaleController],
        providers: [sale_service_1.SaleService, whatsapp_adapter_1.WhatsappAdapter],
        exports: [sale_service_1.SaleService, whatsapp_adapter_1.WhatsappAdapter],
    })
], SaleModule);
//# sourceMappingURL=sale.module.js.map