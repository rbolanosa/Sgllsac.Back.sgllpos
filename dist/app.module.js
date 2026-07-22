"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const nest_winston_1 = require("nest-winston");
const winston = __importStar(require("winston"));
const path = __importStar(require("path"));
const rfs = __importStar(require("rotating-file-stream"));
const typeorm_config_1 = require("./infrastructure/config/typeorm.config");
const app_config_1 = require("./infrastructure/config/app.config");
const auth_module_1 = require("./infrastructure/modules/auth.module");
const health_module_1 = require("./infrastructure/modules/health.module");
const category_module_1 = require("./infrastructure/modules/category.module");
const supplier_module_1 = require("./infrastructure/modules/supplier.module");
const product_module_1 = require("./infrastructure/modules/product.module");
const customer_module_1 = require("./infrastructure/modules/customer.module");
const sale_module_1 = require("./infrastructure/modules/sale.module");
const purchase_order_module_1 = require("./infrastructure/modules/purchase-order.module");
const company_settings_module_1 = require("./infrastructure/modules/company-settings.module");
const user_module_1 = require("./infrastructure/modules/user.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.appConfig],
                envFilePath: ['.env', '.env.local'],
            }),
            nest_winston_1.WinstonModule.forRoot({
                level: process.env.LOG_LEVEL || 'info',
                format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)),
                transports: [
                    new winston.transports.Console({
                        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
                    }),
                    new winston.transports.Stream({
                        stream: rfs.createStream('application-%DATE%.log', {
                            interval: '1d',
                            maxFiles: 14,
                            path: path.resolve(process.cwd(), 'logs'),
                        }),
                    }),
                ],
            }),
            typeorm_1.TypeOrmModule.forRootAsync(typeorm_config_1.typeOrmConfig),
            event_emitter_1.EventEmitterModule.forRoot(),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            health_module_1.HealthModule,
            category_module_1.CategoryModule,
            supplier_module_1.SupplierModule,
            product_module_1.ProductModule,
            customer_module_1.CustomerModule,
            sale_module_1.SaleModule,
            purchase_order_module_1.PurchaseOrderModule,
            company_settings_module_1.CompanySettingsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map