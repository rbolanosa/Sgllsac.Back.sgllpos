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
exports.AppDataSource = exports.typeOrmConfig = void 0;
require("mysql2");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const user_entity_1 = require("../../domain/entities/user.entity");
const category_entity_1 = require("../../domain/entities/category.entity");
const product_entity_1 = require("../../domain/entities/product.entity");
const customer_entity_1 = require("../../domain/entities/customer.entity");
const supplier_entity_1 = require("../../domain/entities/supplier.entity");
const sale_entity_1 = require("../../domain/entities/sale.entity");
const sale_item_entity_1 = require("../../domain/entities/sale-item.entity");
const purchase_order_entity_1 = require("../../domain/entities/purchase-order.entity");
const purchase_order_item_entity_1 = require("../../domain/entities/purchase-order-item.entity");
const inventory_movement_entity_1 = require("../../domain/entities/inventory-movement.entity");
const company_settings_entity_1 = require("../../domain/entities/company-settings.entity");
const establishment_entity_1 = require("../../domain/entities/establishment.entity");
const establishment_series_entity_1 = require("../../domain/entities/establishment-series.entity");
const product_batch_entity_1 = require("../../domain/entities/product-batch.entity");
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const entities = [
    user_entity_1.UserEntity,
    category_entity_1.CategoryEntity,
    product_entity_1.ProductEntity,
    customer_entity_1.CustomerEntity,
    supplier_entity_1.SupplierEntity,
    sale_entity_1.SaleEntity,
    sale_item_entity_1.SaleItemEntity,
    purchase_order_entity_1.PurchaseOrderEntity,
    purchase_order_item_entity_1.PurchaseOrderItemEntity,
    inventory_movement_entity_1.InventoryMovementEntity,
    company_settings_entity_1.CompanySettingsEntity,
    establishment_entity_1.EstablishmentEntity,
    establishment_series_entity_1.EstablishmentSeriesEntity,
    product_batch_entity_1.ProductBatchEntity,
];
exports.typeOrmConfig = {
    imports: [config_1.ConfigModule],
    inject: [config_1.ConfigService],
    useFactory: (configService) => ({
        type: 'mysql',
        host: configService.get('DATABASE_HOST') || '127.0.0.1',
        port: parseInt(String(configService.get('DATABASE_PORT') || 3306), 10),
        username: configService.get('DATABASE_USER') || 'root',
        password: configService.get('DATABASE_PASSWORD') || '',
        database: configService.get('DATABASE_NAME') || 'devpro_db',
        synchronize: false,
        migrationsRun: true,
        migrations: [path.join(__dirname, '../../infrastructure/database/migrations/*.{ts,js}')],
        connectTimeout: 10000,
        ssl: process.env.DATABASE_SSL === 'true'
            ? { rejectUnauthorized: false }
            : false,
        entities,
        migrationsTableName: 'migrations',
    }),
};
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'devpro_db',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    entities,
    migrations: [path.join(__dirname, '../../infrastructure/database/migrations/*.{ts,js}')],
    migrationsTableName: 'migrations',
});
//# sourceMappingURL=typeorm.config.js.map