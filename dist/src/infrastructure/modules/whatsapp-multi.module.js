"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappMultiModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const company_settings_entity_1 = require("../../domain/entities/company-settings.entity");
const customer_entity_1 = require("../../domain/entities/customer.entity");
const sale_entity_1 = require("../../domain/entities/sale.entity");
const whatsapp_adapter_1 = require("../adapters/whatsapp.adapter");
const whatsapp_multi_service_1 = require("../services/whatsapp-multi.service");
const whatsapp_multi_controller_1 = require("../controllers/whatsapp-multi.controller");
let WhatsappMultiModule = class WhatsappMultiModule {
};
exports.WhatsappMultiModule = WhatsappMultiModule;
exports.WhatsappMultiModule = WhatsappMultiModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                company_settings_entity_1.CompanySettingsEntity,
                customer_entity_1.CustomerEntity,
                sale_entity_1.SaleEntity,
            ]),
        ],
        controllers: [whatsapp_multi_controller_1.WhatsappMultiController],
        providers: [whatsapp_multi_service_1.WhatsappMultiService, whatsapp_adapter_1.WhatsappAdapter],
        exports: [whatsapp_multi_service_1.WhatsappMultiService],
    })
], WhatsappMultiModule);
//# sourceMappingURL=whatsapp-multi.module.js.map