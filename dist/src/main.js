"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const nestjs_api_reference_1 = require("@scalar/nestjs-api-reference");
const app_module_1 = require("./app.module");
const winston_logger_1 = require("./shared/logger/winston.logger");
const path_1 = require("path");
async function bootstrap() {
    const logger = winston_logger_1.WinstonLogger.createLogger();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: winston_logger_1.WinstonLogger.createNestLogger(),
    });
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), { prefix: '/uploads' });
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: common_1.VersioningType.URI, defaultVersion: '1' });
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (/^https?:\/\/localhost(:\d+)?$/.test(origin))
                return callback(null, true);
            const allowed = process.env.CORS_ORIGINS?.split(',') ?? [];
            if (allowed.includes(origin))
                return callback(null, true);
            callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Sistema DEVPRO API')
        .setDescription('Documentación de la API del Sistema DEVPRO')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    app.use('/api/docs', (0, nestjs_api_reference_1.apiReference)({ spec: { content: document } }));
    swagger_1.SwaggerModule.setup('api/docs-json', app, document, {
        jsonDocumentUrl: '/api/docs-json',
    });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Servidor corriendo en http://localhost:${port}/api`);
    console.log(`📚 Documentación disponible en http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map