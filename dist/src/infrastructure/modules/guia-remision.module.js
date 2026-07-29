"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuiaRemisionModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
const guia_remision_entity_1 = require("../../domain/entities/guia-remision.entity");
const guia_remision_service_1 = require("../../domain/services/guia-remision.service");
const guia_remision_controller_1 = require("../controllers/guia-remision.controller");
const facturacion_adapter_1 = require("../adapters/facturacion.adapter");
const company_settings_entity_1 = require("../../domain/entities/company-settings.entity");
let GuiaRemisionModule = class GuiaRemisionModule {
};
exports.GuiaRemisionModule = GuiaRemisionModule;
exports.GuiaRemisionModule = GuiaRemisionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            typeorm_1.TypeOrmModule.forFeature([guia_remision_entity_1.GuiaRemisionEntity, company_settings_entity_1.CompanySettingsEntity]),
        ],
        controllers: [guia_remision_controller_1.GuiaRemisionController],
        providers: [guia_remision_service_1.GuiaRemisionService, facturacion_adapter_1.FacturacionAdapter],
        exports: [guia_remision_service_1.GuiaRemisionService],
    })
], GuiaRemisionModule);
//# sourceMappingURL=guia-remision.module.js.map