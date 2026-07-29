import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { WinstonLogger } from './shared/logger/winston.logger';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { join } from 'path';

async function bootstrap() {
  const logger = WinstonLogger.createLogger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonLogger.createNestLogger(),
  });

  // ─── Static Files (uploaded logos, etc.) ─────────────────────────────────────
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // ─── Global Prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── Versioning ──────────────────────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ─── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, etc.)
      if (!origin) return callback(null, true);
      // Allow any localhost port in development
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      // Allow configured origins
      const allowed = process.env.CORS_ORIGINS?.split(',') ?? [];
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Global Validation Pipe ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global JWT Auth Guard ─────────────────────────────────────────────────────
  // Protege todos los endpoints por defecto. Usar @Public() para rutas sin auth.
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // ─── Swagger ─────────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Sistema DEVPRO API')
    .setDescription('Documentación de la API del Sistema DEVPRO')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Scalar UI en /api/docs
  app.use(
    '/api/docs',
    apiReference({ spec: { content: document } }),
  );

  // Raw OpenAPI JSON en /api/docs-json
  SwaggerModule.setup('api/docs-json', app, document, {
    jsonDocumentUrl: '/api/docs-json',
  });

  // ─── Start ────────────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Servidor corriendo en http://localhost:${port}/api`);
  console.log(`📚 Documentación disponible en http://localhost:${port}/api/docs`);
}

bootstrap();
