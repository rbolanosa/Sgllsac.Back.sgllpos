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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuiaRemisionController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const guia_remision_service_1 = require("../../domain/services/guia-remision.service");
const guia_remision_dto_1 = require("../../application/dtos/guia-remision.dto");
let GuiaRemisionController = class GuiaRemisionController {
    constructor(service) {
        this.service = service;
    }
    findAll(page = 1, limit = 20, sunatStatus, from, to) {
        return this.service.findAll({ page: +page, limit: +limit, sunatStatus, from, to });
    }
    findOne(id) {
        return this.service.findById(id);
    }
    create(dto) {
        return this.service.create(dto);
    }
    resendSunat(id) {
        return this.service.resendSunat(id);
    }
};
exports.GuiaRemisionController = GuiaRemisionController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar guías de remisión (paginado, con filtros)' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('sunatStatus')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", void 0)
], GuiaRemisionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener una guía de remisión por ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GuiaRemisionController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Crear y enviar Guía de Remisión Remitente a SUNAT' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [guia_remision_dto_1.CreateGuiaRemisionDto]),
    __metadata("design:returntype", void 0)
], GuiaRemisionController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/resend-sunat'),
    (0, swagger_1.ApiOperation)({ summary: 'Reenviar guía rechazada/pendiente a SUNAT' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], GuiaRemisionController.prototype, "resendSunat", null);
exports.GuiaRemisionController = GuiaRemisionController = __decorate([
    (0, swagger_1.ApiTags)('Guías de Remisión'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('guias-remision'),
    __metadata("design:paramtypes", [guia_remision_service_1.GuiaRemisionService])
], GuiaRemisionController);
//# sourceMappingURL=guia-remision.controller.js.map