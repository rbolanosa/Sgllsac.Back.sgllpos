import 'mysql2';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import express from 'express';
import mysql from 'mysql2/promise';
let cachedServer: any;

/** Ensure critical tables exist in production DB before the app handles requests */
async function ensureProductionSchema() {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'devpro_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 10000,
  });
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS \`product_batches\` (
        \`id\`               INT           NOT NULL AUTO_INCREMENT,
        \`product_id\`       INT           NOT NULL,
        \`supplier_id\`      INT           NULL,
        \`document_ref\`     VARCHAR(100)  NULL,
        \`cost_price\`       DECIMAL(10,4) NOT NULL DEFAULT 0,
        \`initial_quantity\` DECIMAL(10,3) NOT NULL DEFAULT 0,
        \`current_quantity\` DECIMAL(10,3) NOT NULL DEFAULT 0,
        \`expiration_date\`  DATE          NULL,
        \`is_active\`        TINYINT(1)    NOT NULL DEFAULT 1,
        \`created_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\`       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_batches_product_id\` (\`product_id\`),
        CONSTRAINT \`FK_product_batches_product\`
          FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_product_batches_supplier\`
          FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    await conn.end();
  }
}

async function bootstrapServer() {
  if (!cachedServer) {
    // Create missing tables before NestJS initializes repositories
    await ensureProductionSchema();

    const { AppModule } = await import('../src/app.module');
    const expressApp = express();
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn', 'log'] },
    );

    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    app.enableCors({
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer;
}

export default async (req: any, res: any) => {
  try {
    if (req.url === '/api/ping' || req.url === '/ping') {
      return res.status(200).json({ status: 'ok', message: 'Vercel Serverless Function is running' });
    }
    const server = await bootstrapServer();
    return server(req, res);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Serverless Nest Error',
      message: err?.message || String(err),
      stack: err?.stack,
    });
  }
};
