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
exports.ProductController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const product_service_1 = require("../../domain/services/product.service");
const product_dto_1 = require("../../application/dtos/product.dto");
const inventory_movement_entity_1 = require("../../domain/entities/inventory-movement.entity");
let ProductController = class ProductController {
    constructor(productService) {
        this.productService = productService;
    }
    findAll(search, categoryId, supplierId, isActive, lowStock, page = 1, limit = 50) {
        return this.productService.findAll({ search, categoryId, supplierId, isActive, lowStock, page: +page, limit: +limit });
    }
    getLowStock() {
        return this.productService.getLowStockProducts();
    }
    async downloadTemplate(res) {
        const buffer = await this.productService.generateExcelTemplate();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="DEVPRO_Plantilla_Productos_SUNAT.xlsx"');
        res.end(buffer);
    }
    async importExcel(file) {
        if (!file)
            throw new Error('No se recibió ningún archivo.');
        return this.productService.importFromExcel(file.buffer);
    }
    findByBarcode(barcode) {
        return this.productService.findByBarcode(barcode);
    }
    findOne(id) {
        return this.productService.findById(id);
    }
    create(dto) {
        return this.productService.create(dto);
    }
    update(id, dto) {
        return this.productService.update(id, dto);
    }
    remove(id) {
        return this.productService.remove(id);
    }
    addStock(id, dto) {
        return this.productService.adjustStock(id, dto, inventory_movement_entity_1.MovementType.IN);
    }
    subtractStock(id, dto) {
        return this.productService.adjustStock(id, dto, inventory_movement_entity_1.MovementType.OUT);
    }
};
exports.ProductController = ProductController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all products with optional filters' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('categoryId')),
    __param(2, (0, common_1.Query)('supplierId')),
    __param(3, (0, common_1.Query)('isActive')),
    __param(4, (0, common_1.Query)('lowStock')),
    __param(5, (0, common_1.Query)('page')),
    __param(6, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Boolean, Boolean, Object, Object]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('low-stock'),
    (0, swagger_1.ApiOperation)({ summary: 'List products below minimum stock level' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "getLowStock", null);
__decorate([
    (0, common_1.Get)('excel/template'),
    (0, swagger_1.ApiOperation)({ summary: 'Download Excel template for bulk product import (includes SUNAT catalogs 3 & 7)' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "downloadTemplate", null);
__decorate([
    (0, common_1.Post)('excel/import'),
    (0, swagger_1.ApiOperation)({ summary: 'Import products from Excel file. Creates new or updates by SKU.' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_, file, cb) => {
            const ok = file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls');
            cb(ok ? null : new Error('Solo se permiten archivos Excel (.xlsx / .xls)'), ok);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "importExcel", null);
__decorate([
    (0, common_1.Get)('barcode/:barcode'),
    (0, swagger_1.ApiOperation)({ summary: 'Find product by barcode (used by scanner)' }),
    __param(0, (0, common_1.Param)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "findByBarcode", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get product by ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new product' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.CreateProductDto]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update product' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Soft-delete product (mark inactive)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/stock/add'),
    (0, swagger_1.ApiOperation)({ summary: 'Add stock manually (entry)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, product_dto_1.StockAdjustmentDto]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "addStock", null);
__decorate([
    (0, common_1.Patch)(':id/stock/subtract'),
    (0, swagger_1.ApiOperation)({ summary: 'Subtract stock manually (loss/adjustment)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, product_dto_1.StockAdjustmentDto]),
    __metadata("design:returntype", void 0)
], ProductController.prototype, "subtractStock", null);
exports.ProductController = ProductController = __decorate([
    (0, swagger_1.ApiTags)('Products'),
    (0, swagger_1.ApiBearerAuth)('JWT-auth'),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [product_service_1.ProductService])
], ProductController);
//# sourceMappingURL=product.controller.js.map