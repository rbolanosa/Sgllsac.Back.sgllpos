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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySettingsEntity = exports.InvoiceType = exports.TaxRegime = void 0;
const typeorm_1 = require("typeorm");
var TaxRegime;
(function (TaxRegime) {
    TaxRegime["GENERAL"] = "general";
    TaxRegime["MYPE"] = "mype_tributaria";
    TaxRegime["ESPECIAL"] = "especial";
    TaxRegime["NO_DOMICILIADO"] = "no_domiciliado";
})(TaxRegime || (exports.TaxRegime = TaxRegime = {}));
var InvoiceType;
(function (InvoiceType) {
    InvoiceType["FACTURA"] = "01";
    InvoiceType["BOLETA"] = "03";
})(InvoiceType || (exports.InvoiceType = InvoiceType = {}));
let CompanySettingsEntity = class CompanySettingsEntity {
};
exports.CompanySettingsEntity = CompanySettingsEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], CompanySettingsEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 11, default: '' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "ruc", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'razon_social', type: 'varchar', length: 200, default: '' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "razonSocial", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'nombre_comercial', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "nombreComercial", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: '' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "direccion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 6, nullable: true, comment: 'Código INEI/SUNAT' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "ubigeo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "distrito", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "provincia", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "departamento", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, default: 'PE', comment: 'ISO 3166-1 alpha-2' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "pais", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'regimen_tributario', type: 'enum', enum: TaxRegime, default: TaxRegime.MYPE }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "regimenTributario", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'usuario_sol', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "usuarioSol", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'clave_sol', type: 'varchar', length: 200, nullable: true, comment: 'Stored encrypted' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "claveSol", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'serie_factura', type: 'varchar', length: 4, default: 'F001' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "serieFactura", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'serie_boleta', type: 'varchar', length: 4, default: 'B001' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "serieBoleta", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'serie_nota_venta', type: 'varchar', length: 4, default: 'NV01' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "serieNotaVenta", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlativo_factura', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], CompanySettingsEntity.prototype, "correlativoFactura", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlativo_boleta', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], CompanySettingsEntity.prototype, "correlativoBoleta", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlativo_nota_venta', type: 'int', default: 1 }),
    __metadata("design:type", Number)
], CompanySettingsEntity.prototype, "correlativoNotaVenta", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'igv_rate', type: 'decimal', precision: 5, scale: 2, default: 18.00, comment: 'IGV rate in %, default 18' }),
    __metadata("design:type", Number)
], CompanySettingsEntity.prototype, "igvRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'moneda', type: 'varchar', length: 3, default: 'PEN' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "moneda", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "telefono", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'logo_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'website', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_api_url', type: 'varchar', length: 300, nullable: true, comment: 'Beta o producción' }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "sunatApiUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'production_mode', type: 'boolean', default: false, comment: 'false=beta, true=producción' }),
    __metadata("design:type", Boolean)
], CompanySettingsEntity.prototype, "productionMode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_api_key', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "sunatApiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_api_secret', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "sunatApiSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_client_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "sunatClientId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_client_secret', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "sunatClientSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'certificado_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "certificadoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'certificado_password', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", String)
], CompanySettingsEntity.prototype, "certificadoPassword", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CompanySettingsEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CompanySettingsEntity.prototype, "updatedAt", void 0);
exports.CompanySettingsEntity = CompanySettingsEntity = __decorate([
    (0, typeorm_1.Entity)('company_settings')
], CompanySettingsEntity);
//# sourceMappingURL=company-settings.entity.js.map