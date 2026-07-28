"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const cash_session_entity_1 = require("../../domain/entities/cash-session.entity");
const cash_movement_entity_1 = require("../../domain/entities/cash-movement.entity");
const sale_entity_1 = require("../../domain/entities/sale.entity");
const user_entity_1 = require("../../domain/entities/user.entity");
const cash_service_1 = require("../../domain/services/cash.service");
const cash_controller_1 = require("../controllers/cash.controller");
let CashModule = class CashModule {
};
exports.CashModule = CashModule;
exports.CashModule = CashModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                cash_session_entity_1.CashSessionEntity,
                cash_movement_entity_1.CashMovementEntity,
                sale_entity_1.SaleEntity,
                user_entity_1.UserEntity,
            ]),
        ],
        controllers: [cash_controller_1.CashController],
        providers: [cash_service_1.CashService],
        exports: [cash_service_1.CashService],
    })
], CashModule);
//# sourceMappingURL=cash.module.js.map