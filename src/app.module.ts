import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import * as rfs from 'rotating-file-stream';
import { typeOrmConfig } from './infrastructure/config/typeorm.config';
import { appConfig } from './infrastructure/config/app.config';
import { AuthModule } from './infrastructure/modules/auth.module';
import { HealthModule } from './infrastructure/modules/health.module';
import { CategoryModule } from './infrastructure/modules/category.module';
import { SupplierModule } from './infrastructure/modules/supplier.module';
import { ProductModule } from './infrastructure/modules/product.module';
import { CustomerModule } from './infrastructure/modules/customer.module';
import { SaleModule } from './infrastructure/modules/sale.module';
import { PurchaseOrderModule } from './infrastructure/modules/purchase-order.module';
import { CompanySettingsModule } from './infrastructure/modules/company-settings.module';
import { UserModule } from './infrastructure/modules/user.module';
import { EstablishmentsModule } from './infrastructure/modules/establishments.module';

@Module({
  imports: [
    // ─── Config ───────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // ─── Logger ───────────────────────────────────────────────────────────────
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
        ...(process.env.VERCEL ? [] : [
          new winston.transports.Stream({
            stream: rfs.createStream('application-%DATE%.log', {
              interval: '1d',
              maxFiles: 14,
              path: path.resolve(process.cwd(), 'logs'),
            }),
          }),
        ]),
      ],
    }),

    // ─── Base de datos ────────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync(typeOrmConfig),

    // ─── Eventos ──────────────────────────────────────────────────────────────
    EventEmitterModule.forRoot(),

    // ─── Cron Jobs ────────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Módulos de funcionalidad ─────────────────────────────────────────────
    AuthModule,
    UserModule,
    HealthModule,
    CategoryModule,
    SupplierModule,
    ProductModule,
    CustomerModule,
    SaleModule,
    PurchaseOrderModule,
    CompanySettingsModule,
    EstablishmentsModule,
  ],
})
export class AppModule {}
