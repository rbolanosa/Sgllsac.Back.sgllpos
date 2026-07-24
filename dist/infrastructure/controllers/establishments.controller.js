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
exports.EstablishmentsController = void 0;
const common_1 = require("@nestjs/common");
const establishments_service_1 = require("../../domain/services/establishments.service");
let EstablishmentsController = class EstablishmentsController {
    constructor(service) {
        this.service = service;
    }
    async findAll() {
        return this.service.findAll();
    }
    async create(dto) {
        return this.service.create(dto);
    }
    async listSeries(sucursalId) {
        const id = sucursalId ? parseInt(sucursalId, 10) : undefined;
        return this.service.listSeries(id);
    }
    async saveSeriesBatch(dto) {
        return this.service.saveSeriesBatch(dto);
    }
};
exports.EstablishmentsController = EstablishmentsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EstablishmentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EstablishmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('series'),
    __param(0, (0, common_1.Query)('sucursal_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EstablishmentsController.prototype, "listSeries", null);
__decorate([
    (0, common_1.Post)('series'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EstablishmentsController.prototype, "saveSeriesBatch", null);
exports.EstablishmentsController = EstablishmentsController = __decorate([
    (0, common_1.Controller)({ path: 'establishments', version: '1' }),
    __metadata("design:paramtypes", [establishments_service_1.EstablishmentsService])
], EstablishmentsController);
//# sourceMappingURL=establishments.controller.js.map