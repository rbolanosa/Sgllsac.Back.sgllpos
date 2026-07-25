"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EstablishmentsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
const company_settings_entity_1 = require("../../domain/entities/company-settings.entity");
const establishment_entity_1 = require("../../domain/entities/establishment.entity");
const establishment_series_entity_1 = require("../../domain/entities/establishment-series.entity");
const facturacion_adapter_1 = require("../adapters/facturacion.adapter");
const establishments_service_1 = require("../../domain/services/establishments.service");
const establishments_controller_1 = require("../controllers/establishments.controller");
let EstablishmentsModule = class EstablishmentsModule {
};
exports.EstablishmentsModule = EstablishmentsModule;
exports.EstablishmentsModule = EstablishmentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                company_settings_entity_1.CompanySettingsEntity,
                establishment_entity_1.EstablishmentEntity,
                establishment_series_entity_1.EstablishmentSeriesEntity,
            ]),
            axios_1.HttpModule,
        ],
        controllers: [establishments_controller_1.EstablishmentsController],
        providers: [establishments_service_1.EstablishmentsService, facturacion_adapter_1.FacturacionAdapter],
        exports: [establishments_service_1.EstablishmentsService],
    })
], EstablishmentsModule);
//# sourceMappingURL=establishments.module.js.map