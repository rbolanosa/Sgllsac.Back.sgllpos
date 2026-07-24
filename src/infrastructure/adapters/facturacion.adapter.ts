import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

/**
 * Adaptador para la API de Facturación Electrónica.
 * Implementa circuit breaker + retry automático configurables por env vars.
 */
@Injectable()
export class FacturacionAdapter implements OnModuleInit {
  private readonly logger = new Logger(FacturacionAdapter.name);
  private readonly defaultBaseUrl: string;
  private readonly defaultToken: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly circuitBreakerThreshold: number;
  private readonly circuitResetMs = 5_000; // 5 segundos

  private failureCount = 0;
  private circuitOpen = false;
  private lastFailureTime: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(CompanySettingsEntity)
    private readonly settingsRepo: Repository<CompanySettingsEntity>,
  ) {
    this.defaultBaseUrl = this.configService.get<string>('URL_API_FACTURACION_QA', 'http://localhost:8000/api/v1');
    this.defaultToken = this.configService.get<string>('TOKEN_API_FACTURACION', '');
    this.maxRetries = this.configService.get<number>('RETRY_ATTEMPTS', 3);
    this.retryDelay = this.configService.get<number>('RETRY_DELAY_MS', 1000);
    this.circuitBreakerThreshold = this.configService.get<number>(
      'CIRCUIT_BREAKER_THRESHOLD',
      5,
    );
  }

  onModuleInit() {
    this.logger.log('Facturación electrónica: Adaptador inicializado.');
  }

  private async getResolvedConfig(): Promise<{ baseUrl: string; headers: AxiosRequestConfig['headers'] }> {
    try {
      const settings = await this.settingsRepo.findOne({ where: { id: 1 } });
      if (settings?.sunatApiKey && settings?.sunatApiSecret) {
        const baseUrl = settings.sunatApiUrl || 'http://localhost:8000/api/v1';
        return {
          baseUrl: baseUrl.replace(/\/$/, ''),
          headers: {
            'X-Api-Key': settings.sunatApiKey,
            'X-Api-Secret': settings.sunatApiSecret,
            'Content-Type': 'application/json',
          },
        };
      }
    } catch (e) {
      this.logger.warn(`Error al consultar credenciales de la DB: ${e.message}`);
    }

    return {
      baseUrl: (this.defaultBaseUrl || 'http://localhost:8000/api/v1').replace(/\/$/, ''),
      headers: {
        Authorization: `Bearer ${this.defaultToken}`,
        'Content-Type': 'application/json',
      },
    };
  }

  resetCircuit() {
    this.circuitOpen = false;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.logger.log('Circuit breaker reseteado manualmente.');
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;
    const now = new Date();
    if (
      !this.lastFailureTime ||
      now.getTime() - this.lastFailureTime.getTime() > this.circuitResetMs
    ) {
      this.logger.log('Circuit breaker restablecido (half-open)');
      this.circuitOpen = false;
      this.failureCount = 0;
      return false;
    }
    return true;
  }

  private recordFailure() {
    this.failureCount++;
    this.lastFailureTime = new Date();
    if (this.failureCount >= this.circuitBreakerThreshold) {
      this.circuitOpen = true;
      this.logger.error(`Circuit breaker ABIERTO tras ${this.failureCount} fallos`);
    }
  }

  private recordSuccess() {
    this.failureCount = 0;
    this.circuitOpen = false;
  }

  async post<T>(endpoint: string, body: unknown, attempt = 1): Promise<T> {
    if (this.isCircuitOpen()) {
      throw new Error('Facturación: Circuit breaker abierto, servicio no disponible');
    }

    const { baseUrl, headers } = await this.getResolvedConfig();

    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(`${baseUrl}${endpoint}`, body, {
          headers,
          timeout: 10_000,
        }),
      );
      this.recordSuccess();
      return response.data;
    } catch (error: any) {
      // Do not trip circuit breaker on HTTP 4xx validation/client errors
      const status = error?.response?.status;
      if (!status || status >= 500) {
        this.recordFailure();
      }
      if (attempt < this.maxRetries) {
        this.logger.warn(`Reintentando (${attempt}/${this.maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
        return this.post<T>(endpoint, body, attempt + 1);
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, attempt = 1): Promise<T> {
    if (this.isCircuitOpen()) {
      throw new Error('Facturación: Circuit breaker abierto, servicio no disponible');
    }

    const { baseUrl, headers } = await this.getResolvedConfig();

    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${baseUrl}${endpoint}`, {
          headers,
          timeout: 10_000,
        }),
      );
      this.recordSuccess();
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      if (!status || status >= 500) {
        this.recordFailure();
      }
      if (attempt < this.maxRetries) {
        this.logger.warn(`Reintentando GET (${attempt}/${this.maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
        return this.get<T>(endpoint, attempt + 1);
      }
      throw error;
    }
  }
}
