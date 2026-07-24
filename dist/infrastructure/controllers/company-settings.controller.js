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
exports.CompanySettingsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs_1 = require("fs");
const company_settings_service_1 = require("../../domain/services/company-settings.service");
const company_settings_dto_1 = require("../../application/dto/company-settings.dto");
const UPLOADS_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'logos');
const CERTS_DIR = (0, path_1.join)(process.cwd(), 'uploads', 'certificates');
if (!(0, fs_1.existsSync)(UPLOADS_DIR))
    (0, fs_1.mkdirSync)(UPLOADS_DIR, { recursive: true });
if (!(0, fs_1.existsSync)(CERTS_DIR))
    (0, fs_1.mkdirSync)(CERTS_DIR, { recursive: true });
const logoStorage = (0, multer_1.diskStorage)({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const unique = `logo-${Date.now()}${(0, path_1.extname)(file.originalname)}`;
        cb(null, unique);
    },
});
const certStorage = (0, multer_1.diskStorage)({
    destination: (_req, _file, cb) => cb(null, CERTS_DIR),
    filename: (_req, file, cb) => {
        const unique = `cert-${Date.now()}${(0, path_1.extname)(file.originalname)}`;
        cb(null, unique);
    },
});
let CompanySettingsController = class CompanySettingsController {
    constructor(service) {
        this.service = service;
    }
    async get() {
        return this.service.get();
    }
    async update(dto) {
        return this.service.update(dto);
    }
    async uploadLogo(file) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        const logoUrl = `/uploads/logos/${file.filename}`;
        await this.service.update({ logoUrl });
        await this.service.syncLogoToApisunat(file);
        return { logoUrl, message: 'Logo uploaded successfully' };
    }
    async registerSunatApi(file, contrasenaCertificado) {
        if (!file)
            throw new common_1.BadRequestException('El archivo del certificado digital es requerido.');
        return this.service.registerSunatApi(file, contrasenaCertificado);
    }
};
exports.CompanySettingsController = CompanySettingsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [company_settings_dto_1.UpdateCompanySettingsDto]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('logo'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: logoStorage,
        limits: { fileSize: 2 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
            if (!allowed.includes((0, path_1.extname)(file.originalname).toLowerCase())) {
                return cb(new common_1.BadRequestException('Only image files are allowed (PNG, JPG, WEBP, SVG)'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "uploadLogo", null);
__decorate([
    (0, common_1.Post)('register-sunat-api'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('certificado', {
        storage: certStorage,
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('contrasenaCertificado')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "registerSunatApi", null);
exports.CompanySettingsController = CompanySettingsController = __decorate([
    (0, common_1.Controller)({ path: 'company-settings', version: '1' }),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], CompanySettingsController);
//# sourceMappingURL=company-settings.controller.js.map