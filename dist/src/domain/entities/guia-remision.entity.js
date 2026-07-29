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
exports.GuiaRemisionEntity = exports.CodTraslado = exports.ModTraslado = void 0;
const typeorm_1 = require("typeorm");
var ModTraslado;
(function (ModTraslado) {
    ModTraslado["PUBLICO"] = "01";
    ModTraslado["PRIVADO"] = "02";
})(ModTraslado || (exports.ModTraslado = ModTraslado = {}));
var CodTraslado;
(function (CodTraslado) {
    CodTraslado["VENTA"] = "01";
    CodTraslado["COMPRA"] = "02";
    CodTraslado["TRASLADO_ALMACEN_PROPIO"] = "03";
    CodTraslado["ENTRE_ESTABLECIMIENTOS"] = "04";
    CodTraslado["IMPORTACION"] = "08";
    CodTraslado["EXPORTACION"] = "09";
    CodTraslado["OTROS"] = "13";
})(CodTraslado || (exports.CodTraslado = CodTraslado = {}));
let GuiaRemisionEntity = class GuiaRemisionEntity {
};
exports.GuiaRemisionEntity = GuiaRemisionEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], GuiaRemisionEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'T001' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "serie", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlativo', type: 'varchar', length: 15, nullable: true }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "correlativo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'numero_completo', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "numeroCompleto", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_emision', type: 'date' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "fechaEmision", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_traslado', type: 'date' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "fechaTraslado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dest_tipo_doc', type: 'varchar', length: 2 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "destTipoDoc", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dest_num_doc', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "destNumDoc", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dest_razon_social', type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "destRazonSocial", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cod_traslado', type: 'varchar', length: 5 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "codTraslado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mod_traslado', type: 'varchar', length: 2 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "modTraslado", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'peso_total', type: 'decimal', precision: 10, scale: 3 }),
    __metadata("design:type", Number)
], GuiaRemisionEntity.prototype, "pesoTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'und_peso_total', type: 'varchar', length: 5, default: 'KGM' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "undPesoTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'num_bultos', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], GuiaRemisionEntity.prototype, "numBultos", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'partida_ubigeo', type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "partidaUbigeo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'partida_direccion', type: 'varchar', length: 300 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "partidaDireccion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'llegada_ubigeo', type: 'varchar', length: 10 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "llegadaUbigeo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'llegada_direccion', type: 'varchar', length: 300 }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "llegadaDireccion", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transportista_json', type: 'text', nullable: true,
        comment: 'JSON: {tipo_doc, num_doc, razon_social, nro_mtc}' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "transportistaJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fecha_entrega_transportista', type: 'date', nullable: true }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "fechaEntregaTransportista", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'vehiculo_json', type: 'text', nullable: true,
        comment: 'JSON: {placa, secundarios[]}' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "vehiculoJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'conductor_json', type: 'text', nullable: true,
        comment: 'JSON: {tipo, tipo_doc, num_doc, nombres, apellidos, licencia}' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "conductorJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'items_json', type: 'text',
        comment: 'JSON: [{codigo, descripcion, cantidad, unidad}]' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "itemsJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_status', type: 'varchar', length: 30, default: 'PENDIENTE' }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "sunatStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sunat_message', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "sunatMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'xml_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "xmlUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "pdfUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cdr_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], GuiaRemisionEntity.prototype, "cdrUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'apisunat_id', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], GuiaRemisionEntity.prototype, "apisunatId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], GuiaRemisionEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], GuiaRemisionEntity.prototype, "updatedAt", void 0);
exports.GuiaRemisionEntity = GuiaRemisionEntity = __decorate([
    (0, typeorm_1.Entity)('guias_remision')
], GuiaRemisionEntity);
//# sourceMappingURL=guia-remision.entity.js.map