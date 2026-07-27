import 'mysql2';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import express from 'express';
let cachedServer: any;

async function bootstrapServer() {
  if (!cachedServer) {
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
