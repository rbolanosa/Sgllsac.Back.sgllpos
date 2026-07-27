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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const common_1 = require("@nestjs/common");
const express_1 = __importDefault(require("express"));
let cachedServer;
async function bootstrapServer() {
    if (!cachedServer) {
        const { AppModule } = await Promise.resolve().then(() => __importStar(require('../src/app.module')));
        const expressApp = (0, express_1.default)();
        const app = await core_1.NestFactory.create(AppModule, new platform_express_1.ExpressAdapter(expressApp), { logger: ['error', 'warn', 'log'] });
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
        if (req.url === '/api/ping' || req.url === '/ping') {
            return res.status(200).json({ status: 'ok', message: 'Vercel Serverless Function is running' });
        }
        const server = await bootstrapServer();
        return server(req, res);
    }
    catch (err) {
        return res.status(500).json({
            error: 'Serverless Nest Error',
            message: err?.message || String(err),
            stack: err?.stack,
        });
    }
};
//# sourceMappingURL=index.js.map