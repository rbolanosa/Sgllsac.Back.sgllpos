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
exports.WhatsappMultiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const whatsapp_multi_service_1 = require("../services/whatsapp-multi.service");
let WhatsappMultiController = class WhatsappMultiController {
    constructor(whatsappService) {
        this.whatsappService = whatsappService;
    }
    getStatus() {
        return this.whatsappService.getStatus();
    }
    getContacts() {
        return this.whatsappService.getContacts();
    }
    sendText(body) {
        return this.whatsappService.sendText(body.to, body.message);
    }
    sendVoucher(saleId, body) {
        return this.whatsappService.sendVoucher(saleId, body?.phone);
    }
};
exports.WhatsappMultiController = WhatsappMultiController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Verificar estado de conexión de WhatsApp para la empresa' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsappMultiController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('contacts'),
    (0, swagger_1.ApiOperation)({ summary: 'Obtener lista de contactos desde la tabla clientes' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WhatsappMultiController.prototype, "getContacts", null);
__decorate([
    (0, common_1.Post)('send-text'),
    (0, swagger_1.ApiOperation)({ summary: 'Enviar mensaje de texto individual por WhatsApp' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WhatsappMultiController.prototype, "sendText", null);
__decorate([
    (0, common_1.Post)('send-voucher/:saleId'),
    (0, swagger_1.ApiOperation)({ summary: 'Enviar comprobante electrónico PDF por WhatsApp a un cliente' }),
    __param(0, (0, common_1.Param)('saleId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], WhatsappMultiController.prototype, "sendVoucher", null);
exports.WhatsappMultiController = WhatsappMultiController = __decorate([
    (0, swagger_1.ApiTags)('WhatsApp'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('whatsapp'),
    __metadata("design:paramtypes", [whatsapp_multi_service_1.WhatsappMultiService])
], WhatsappMultiController);
//# sourceMappingURL=whatsapp-multi.controller.js.map