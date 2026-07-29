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
exports.SaleController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sale_service_1 = require("../../domain/services/sale.service");
const sale_dto_1 = require("../../application/dtos/sale.dto");
const sale_entity_1 = require("../../domain/entities/sale.entity");
const public_decorator_1 = require("../decorators/public.decorator");
let SaleController = class SaleController {
    constructor(saleService) {
        this.saleService = saleService;
    }
    findAll(page = 1, limit = 30, status, from, to, documentType) {
        return this.saleService.findAll({ page: +page, limit: +limit, status, from, to, documentType });
    }
    getSummary(from, to) {
        return this.saleService.getSalesSummary(from, to);
    }
    async getPdfByToken(token, res) {
        const saleId = this.saleService.verifyPdfToken(token);
        if (!saleId) {
            throw new common_1.ForbiddenException('Enlace de comprobante no válido o expirado');
        }
        const { buffer, fileName } = await this.saleService.generatePdfBuffer(saleId);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.send(buffer);
    }
    getPdfToken(id) {
        const token = this.saleService.getSecurePdfToken(id);
        return { token, path: `/sales/comprobante/pdf/${token}` };
    }
    async getPdf(id, res) {
        const { buffer, fileName } = await this.saleService.generatePdfBuffer(id);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.send(buffer);
    }
    findOne(id) {
        return this.saleService.findById(id);
    }
    create(dto, req) {
        const rawId = req.user?.sub ?? req.user?.id;
        const cashierId = rawId ? parseInt(String(rawId), 10) : 1;
        return this.saleService.create(dto, cashierId);
    }
    createCreditNote(dto) {
        return this.saleService.createCreditNote(dto.originalSaleId, dto.motivo, dto.descripcion || dto.motivo);
    }
    void(id, dto) {
        return this.saleService.voidSale(id, dto);
    }
    sendWhatsapp(id, body) {
        return this.saleService.sendWhatsappMessage(id, body.phone);
    }
    resendSunat(id) {
        return this.saleService.resendSunat(id);
    }
};
exports.SaleController = SaleController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all sales with optional filters (paginated)' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __param(5, (0, common_1.Query)('documentType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, swagger_1.ApiOperation)({ summary: 'Sales summary for a date range' }),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "getSummary", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('comprobante/pdf/:token'),
    (0, swagger_1.ApiOperation)({ summary: 'Secure public PDF download via HMAC signed token' }),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SaleController.prototype, "getPdfByToken", null);
__decorate([
    (0, common_1.Get)(':id/pdf-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get secure signed PDF download token' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "getPdfToken", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    (0, swagger_1.ApiOperation)({ summary: 'Download invoice receipt PDF file' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], SaleController.prototype, "getPdf", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get sale by ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new sale (POS checkout)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sale_dto_1.CreateSaleDto, Object]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('credit-note'),
    (0, swagger_1.ApiOperation)({ summary: 'Create credit note for an invoice or boleta' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [sale_dto_1.CreateCreditNoteDto]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "createCreditNote", null);
__decorate([
    (0, common_1.Patch)(':id/void'),
    (0, swagger_1.ApiOperation)({ summary: 'Void a completed sale (reverses stock movements)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, sale_dto_1.VoidSaleDto]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "void", null);
__decorate([
    (0, common_1.Post)(':id/send-whatsapp'),
    (0, swagger_1.ApiOperation)({ summary: 'Send invoice receipt via WhatsApp Evolution API' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "sendWhatsapp", null);
__decorate([
    (0, common_1.Post)(':id/resend-sunat'),
    (0, swagger_1.ApiOperation)({ summary: 'Resend rejected document or credit note to SUNAT' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], SaleController.prototype, "resendSunat", null);
exports.SaleController = SaleController = __decorate([
    (0, swagger_1.ApiTags)('Sales'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('sales'),
    __metadata("design:paramtypes", [sale_service_1.SaleService])
], SaleController);
//# sourceMappingURL=sale.controller.js.map