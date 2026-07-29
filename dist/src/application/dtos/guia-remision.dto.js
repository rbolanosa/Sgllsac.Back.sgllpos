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
exports.CreateGuiaRemisionDto = exports.GuiaRemisionItemDto = exports.ConductorDto = exports.VehiculoDto = exports.VehiculoSecundarioDto = exports.TransportistaDto = exports.DestinatarioDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class DestinatarioDto {
}
exports.DestinatarioDto = DestinatarioDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '6', description: '1=DNI, 6=RUC' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DestinatarioDto.prototype, "tipo_doc", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '20000000002' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DestinatarioDto.prototype, "num_doc", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'EMPRESA DESTINO SAC' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], DestinatarioDto.prototype, "razon_social", void 0);
class TransportistaDto {
}
exports.TransportistaDto = TransportistaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '6' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TransportistaDto.prototype, "tipo_doc", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '20000000002' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TransportistaDto.prototype, "num_doc", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'TRANSPORTES SAC' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], TransportistaDto.prototype, "razon_social", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '0001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], TransportistaDto.prototype, "nro_mtc", void 0);
class VehiculoSecundarioDto {
}
exports.VehiculoSecundarioDto = VehiculoSecundarioDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'XYZ789' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], VehiculoSecundarioDto.prototype, "placa", void 0);
class VehiculoDto {
}
exports.VehiculoDto = VehiculoDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ABC123' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], VehiculoDto.prototype, "placa", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [VehiculoSecundarioDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => VehiculoSecundarioDto),
    __metadata("design:type", Array)
], VehiculoDto.prototype, "secundarios", void 0);
class ConductorDto {
}
exports.ConductorDto = ConductorDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Principal' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConductorDto.prototype, "tipo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '1', description: '1=DNI' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConductorDto.prototype, "tipo_doc", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '44004400' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConductorDto.prototype, "num_doc", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ROBERTO' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConductorDto.prototype, "nombres", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'RODRIGUEZ VALENCIA' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConductorDto.prototype, "apellidos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '0001122020' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ConductorDto.prototype, "licencia", void 0);
class GuiaRemisionItemDto {
}
exports.GuiaRemisionItemDto = GuiaRemisionItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PROD1' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GuiaRemisionItemDto.prototype, "codigo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Producto de prueba' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GuiaRemisionItemDto.prototype, "descripcion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.001),
    __metadata("design:type", Number)
], GuiaRemisionItemDto.prototype, "cantidad", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'NIU' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], GuiaRemisionItemDto.prototype, "unidad", void 0);
class CreateGuiaRemisionDto {
    constructor() {
        this.serie = 'T001';
        this.und_peso_total = 'KGM';
        this.enviar_automatico = true;
    }
}
exports.CreateGuiaRemisionDto = CreateGuiaRemisionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'T001', description: 'Serie GRR (debe comenzar con T)' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "serie", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-01' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "fecha_emision", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: DestinatarioDto }),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DestinatarioDto),
    __metadata("design:type", DestinatarioDto)
], CreateGuiaRemisionDto.prototype, "destinatario", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '01',
        enum: ['01', '02', '03', '04', '05', '06', '08', '09', '13'],
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['01', '02', '03', '04', '05', '06', '08', '09', '13'], {
        message: 'cod_traslado inválido. Valores: 01=Venta 02=Compra 03=Almacén 04=Establ. 05=Venta a terceros 06=Devolución 08=Import 09=Export 13=Otros',
    }),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "cod_traslado", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '01', enum: ['01', '02'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['01', '02'], { message: 'mod_traslado: 01=Público, 02=Privado' }),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "mod_traslado", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-01' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "fecha_traslado", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-07-01' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "fecha_de_entrega_al_transportista", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12.5 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.001),
    __metadata("design:type", Number)
], CreateGuiaRemisionDto.prototype, "peso_total", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'KGM', enum: ['KGM', 'TNE'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "und_peso_total", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 5 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateGuiaRemisionDto.prototype, "num_bultos", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '150203', description: 'Ubigeo INEI 6 dígitos (partida)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "partida_ubigeo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AV ITALIA 123, RIMAC' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "partida_direccion", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '150101', description: 'Ubigeo INEI 6 dígitos (llegada)' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "llegada_ubigeo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AV LIMA 456, CERCADO' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateGuiaRemisionDto.prototype, "llegada_direccion", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: TransportistaDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TransportistaDto),
    __metadata("design:type", TransportistaDto)
], CreateGuiaRemisionDto.prototype, "transportista", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: VehiculoDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => VehiculoDto),
    __metadata("design:type", VehiculoDto)
], CreateGuiaRemisionDto.prototype, "vehiculo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: ConductorDto }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ConductorDto),
    __metadata("design:type", ConductorDto)
], CreateGuiaRemisionDto.prototype, "conductor", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [ConductorDto] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => ConductorDto),
    __metadata("design:type", Array)
], CreateGuiaRemisionDto.prototype, "conductores", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: [String], example: [] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], CreateGuiaRemisionDto.prototype, "indicadores", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [GuiaRemisionItemDto] }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => GuiaRemisionItemDto),
    __metadata("design:type", Array)
], CreateGuiaRemisionDto.prototype, "items", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateGuiaRemisionDto.prototype, "enviar_automatico", void 0);
//# sourceMappingURL=guia-remision.dto.js.map