import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { User } from '../../domain/entities/user.entity';
import { Category } from '../../domain/entities/category.entity';
import { Product } from '../../domain/entities/product.entity';
import { Customer } from '../../domain/entities/customer.entity';
import { Supplier } from '../../domain/entities/supplier.entity';
import { Sale } from '../../domain/entities/sale.entity';
import { SaleItem } from '../../domain/entities/sale-item.entity';
import { PurchaseOrder } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../domain/entities/purchase-order-item.entity';
import { InventoryMovement } from '../../domain/entities/inventory-movement.entity';
import { CompanySettings } from '../../domain/entities/company-settings.entity';
import { Establishment } from '../../domain/entities/establishment.entity';
import { EstablishmentSeries } from '../../domain/entities/establishment-series.entity';

// Carga el .env cuando el archivo se usa desde TypeORM CLI (ts-node)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const entities = [
  User,
  Category,
  Product,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  PurchaseOrder,
  PurchaseOrderItem,
  InventoryMovement,
  CompanySettings,
  Establishment,
  EstablishmentSeries,
];

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService): DataSourceOptions => ({
    type: 'mysql',
    host: configService.get<string>('DATABASE_HOST', '127.0.0.1'),
    port: configService.get<number>('DATABASE_PORT', 3306),
    username: configService.get<string>('DATABASE_USER', 'root'),
    password: configService.get<string>('DATABASE_PASSWORD', ''),
    database: configService.get<string>('DATABASE_NAME', 'devpro_db'),
    synchronize: configService.get<string>('DATABASE_SYNCHRONIZE') === 'true',
    ssl: process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    entities,
    migrations: [
      path.join(__dirname, '../database/migrations/*{.ts,.js}'),
    ],
    migrationsTableName: 'migrations',
  }),
};

// DataSource para TypeORM CLI (npm run migration:run / generate / etc.)
export const AppDataSource = new DataSource({
  type: 'mysql',
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
