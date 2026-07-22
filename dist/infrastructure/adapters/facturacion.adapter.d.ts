import { OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class FacturacionAdapter implements OnModuleInit {
    private readonly httpService;
    private readonly configService;
    private readonly logger;
    private readonly baseUrl;
    private readonly token;
    private readonly maxRetries;
    private readonly retryDelay;
    private readonly circuitBreakerThreshold;
    private failureCount;
    private circuitOpen;
    private lastFailureTime;
    private readonly circuitResetMs;
    constructor(httpService: HttpService, configService: ConfigService);
    onModuleInit(): void;
    private getHeaders;
    private isCircuitOpen;
    private recordFailure;
    private recordSuccess;
    post<T>(endpoint: string, body: unknown, attempt?: number): Promise<T>;
    get<T>(endpoint: string, attempt?: number): Promise<T>;
}
