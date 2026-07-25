"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("../src/app.module");
let app;
async function handler(req, res) {
    if (!app) {
        app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.setGlobalPrefix('api');
        app.enableVersioning({ type: common_1.VersioningType.URI, defaultVersion: '1' });
        app.enableCors({
            origin: '*',
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
        await app.init();
    }
    const instance = app.getHttpAdapter().getInstance();
    return instance(req, res);
}
//# sourceMappingURL=index.js.map