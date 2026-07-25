import { OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
export declare class FacturacionAdapter implements OnModuleInit {
    private readonly httpService;
    private readonly configService;
    private readonly settingsRepo;
    private readonly logger;
    private readonly defaultBaseUrl;
    private readonly defaultToken;
    private readonly maxRetries;
    private readonly retryDelay;
    private readonly circuitBreakerThreshold;
    private readonly circuitResetMs;
    private failureCount;
    private circuitOpen;
    private lastFailureTime;
    constructor(httpService: HttpService, configService: ConfigService, settingsRepo: Repository<CompanySettingsEntity>);
    onModuleInit(): void;
    private getResolvedConfig;
    resetCircuit(): void;
    private isCircuitOpen;
    private recordFailure;
    private recordSuccess;
    post<T>(endpoint: string, body: unknown, attempt?: number): Promise<T>;
    get<T>(endpoint: string, attempt?: number): Promise<T>;
}
