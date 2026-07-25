"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const common_1 = require("@nestjs/common");
const express_1 = __importDefault(require("express"));
const app_module_1 = require("../src/app.module");
let cachedServer;
async function bootstrapServer() {
    if (!cachedServer) {
        const expressApp = (0, express_1.default)();
        const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp), { logger: ['error', 'warn', 'log'] });
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
        cachedServer = expressApp;
    }
    return cachedServer;
}
exports.default = async (req, res) => {
    try {
        const server = await bootstrapServer();
        return server(req, res);
    }
    catch (err) {
        return res.status(500).send(`Serverless Nest Error: ${err?.message || err}\n${err?.stack || ''}`);
    }
};
//# sourceMappingURL=index.js.map