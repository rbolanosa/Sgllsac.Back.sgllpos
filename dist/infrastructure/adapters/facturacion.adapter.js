"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FacturacionAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacturacionAdapter = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let FacturacionAdapter = FacturacionAdapter_1 = class FacturacionAdapter {
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
        this.logger = new common_1.Logger(FacturacionAdapter_1.name);
        this.failureCount = 0;
        this.circuitOpen = false;
        this.lastFailureTime = null;
        this.circuitResetMs = 60_000;
        this.baseUrl = this.configService.get('URL_API_FACTURACION_QA', '');
        this.token = this.configService.get('TOKEN_API_FACTURACION', '');
        this.maxRetries = this.configService.get('RETRY_ATTEMPTS', 3);
        this.retryDelay = this.configService.get('RETRY_DELAY_MS', 1000);
        this.circuitBreakerThreshold = this.configService.get('CIRCUIT_BREAKER_THRESHOLD', 5);
    }
    onModuleInit() {
        if (!this.baseUrl || !this.token) {
            this.logger.warn('⚠️  Facturación electrónica: URL o TOKEN no configurados. El adaptador está inactivo.');
        }
    }
    getHeaders() {
        return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
    }
    isCircuitOpen() {
        if (!this.circuitOpen)
            return false;
        const now = new Date();
        if (this.lastFailureTime &&
            now.getTime() - this.lastFailureTime.getTime() > this.circuitResetMs) {
            this.logger.log('Circuit breaker restablecido (half-open)');
            this.circuitOpen = false;
            this.failureCount = 0;
            return false;
        }
        return true;
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = new Date();
        if (this.failureCount >= this.circuitBreakerThreshold) {
            this.circuitOpen = true;
            this.logger.error(`Circuit breaker ABIERTO tras ${this.failureCount} fallos`);
        }
    }
    recordSuccess() {
        this.failureCount = 0;
        this.circuitOpen = false;
    }
    async post(endpoint, body, attempt = 1) {
        if (this.isCircuitOpen()) {
            throw new Error('Facturación: Circuit breaker abierto, servicio no disponible');
        }
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.baseUrl}${endpoint}`, body, {
                headers: this.getHeaders(),
                timeout: 10_000,
            }));
            this.recordSuccess();
            return response.data;
        }
        catch (error) {
            this.recordFailure();
            if (attempt < this.maxRetries) {
                this.logger.warn(`Reintentando (${attempt}/${this.maxRetries})...`);
                await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
                return this.post(endpoint, body, attempt + 1);
            }
            throw error;
        }
    }
    async get(endpoint, attempt = 1) {
        if (this.isCircuitOpen()) {
            throw new Error('Facturación: Circuit breaker abierto, servicio no disponible');
        }
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}${endpoint}`, {
                headers: this.getHeaders(),
                timeout: 10_000,
            }));
            this.recordSuccess();
            return response.data;
        }
        catch (error) {
            this.recordFailure();
            if (attempt < this.maxRetries) {
                this.logger.warn(`Reintentando (${attempt}/${this.maxRetries})...`);
                await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
                return this.get(endpoint, attempt + 1);
            }
            throw error;
        }
    }
};
exports.FacturacionAdapter = FacturacionAdapter;
exports.FacturacionAdapter = FacturacionAdapter = FacturacionAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], FacturacionAdapter);
//# sourceMappingURL=facturacion.adapter.js.map