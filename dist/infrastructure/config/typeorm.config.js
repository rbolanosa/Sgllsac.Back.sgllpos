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
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
exports.typeOrmConfig = {
    imports: [config_1.ConfigModule],
    inject: [config_1.ConfigService],
    useFactory: (configService) => ({
        type: 'mariadb',
        host: configService.get('DATABASE_HOST', '127.0.0.1'),
        port: configService.get('DATABASE_PORT', 3306),
        username: configService.get('DATABASE_USER', 'root'),
        password: configService.get('DATABASE_PASSWORD', ''),
        database: configService.get('DATABASE_NAME', 'devpro_db'),
        synchronize: configService.get('DATABASE_SYNCHRONIZE') === 'true',
        logging: configService.get('NODE_ENV') === 'development',
        entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
        migrations: [
            path.join(__dirname, '../database/migrations/*{.ts,.js}'),
        ],
        migrationsTableName: 'migrations',
    }),
};
exports.AppDataSource = new typeorm_1.DataSource({
    type: 'mariadb',
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    username: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'devpro_db',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
    entities: [path.join(__dirname, '../../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../database/migrations/*{.ts,.js}')],
    migrationsTableName: 'migrations',
});
//# sourceMappingURL=typeorm.config.js.map