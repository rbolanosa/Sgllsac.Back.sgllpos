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
exports.CreateCashMovementDto = exports.CloseCashSessionDto = exports.OpenCashSessionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const cash_movement_entity_1 = require("../../domain/entities/cash-movement.entity");
class OpenCashSessionDto {
}
exports.OpenCashSessionDto = OpenCashSessionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 150.00, description: 'Monto inicial en caja (fondo de apertura)' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], OpenCashSessionDto.prototype, "openingAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], OpenCashSessionDto.prototype, "establishmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Apertura de turno mañana' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], OpenCashSessionDto.prototype, "notes", void 0);
class CloseCashSessionDto {
}
exports.CloseCashSessionDto = CloseCashSessionDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 480.50, description: 'Monto físico contado al cierre' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CloseCashSessionDto.prototype, "closingAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Todo cuadra correctamente' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CloseCashSessionDto.prototype, "closingNotes", void 0);
class CreateCashMovementDto {
}
exports.CreateCashMovementDto = CreateCashMovementDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: cash_movement_entity_1.CashMovementType }),
    (0, class_validator_1.IsEnum)(cash_movement_entity_1.CashMovementType),
    __metadata("design:type", String)
], CreateCashMovementDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 50.00 }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.01),
    __metadata("design:type", Number)
], CreateCashMovementDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Compra de útiles de oficina' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCashMovementDto.prototype, "description", void 0);
//# sourceMappingURL=cash.dto.js.map