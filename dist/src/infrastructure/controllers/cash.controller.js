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
exports.CashController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const cash_service_1 = require("../../domain/services/cash.service");
const cash_dto_1 = require("../../application/dtos/cash.dto");
let CashController = class CashController {
    constructor(cashService) {
        this.cashService = cashService;
    }
    open(dto, req) {
        return this.cashService.openSession(dto, req.user?.id);
    }
    active(req) {
        return this.cashService.getActiveSession(req.user?.id);
    }
    summary(req) {
        return this.cashService.getSessionSummary(req.user?.id);
    }
    addMovement(dto, req) {
        return this.cashService.addMovement(dto, req.user?.id);
    }
    close(dto, req) {
        return this.cashService.closeSession(dto, req.user?.id);
    }
    history(req, page, limit, cashierId) {
        return this.cashService.getHistory(page, limit, cashierId ? parseInt(cashierId) : undefined);
    }
    getOne(req, id) {
        return this.cashService.getSessionById(id);
    }
};
exports.CashController = CashController;
__decorate([
    (0, common_1.Post)('abrir'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cash_dto_1.OpenCashSessionDto, Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "open", null);
__decorate([
    (0, common_1.Get)('activa'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "active", null);
__decorate([
    (0, common_1.Get)('resumen'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)('movimiento'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cash_dto_1.CreateCashMovementDto, Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "addMovement", null);
__decorate([
    (0, common_1.Post)('cerrar'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [cash_dto_1.CloseCashSessionDto, Object]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "close", null);
__decorate([
    (0, common_1.Get)('historial'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('cashierId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Number, String]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "history", null);
__decorate([
    (0, common_1.Get)('sesion/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", void 0)
], CashController.prototype, "getOne", null);
exports.CashController = CashController = __decorate([
    (0, swagger_1.ApiTags)('Caja'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)({ path: 'caja', version: '1' }),
    __metadata("design:paramtypes", [cash_service_1.CashService])
], CashController);
//# sourceMappingURL=cash.controller.js.map