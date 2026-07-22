import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';

/**
 * Adaptador para la API de Facturación Electrónica.
 * Implementa circuit breaker + retry automático configurables por env vars.
 */
@Injectable()
export class FacturacionAdapter implements OnModuleInit {
  private readonly logger = new Logger(FacturacionAdapter.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly circuitBreakerThreshold: number;

  private failureCount = 0;
  private circuitOpen = false;
  private lastFailureTime: Date | null = null;
  private readonly circuitResetMs = 60_000; // 1 minuto

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('URL_API_FACTURACION_QA', '');
    this.token = this.configService.get<string>('TOKEN_API_FACTURACION', '');
    this.maxRetries = this.configService.get<number>('RETRY_ATTEMPTS', 3);
    this.retryDelay = this.configService.get<number>('RETRY_DELAY_MS', 1000);
    this.circuitBreakerThreshold = this.configService.get<number>(
      'CIRCUIT_BREAKER_THRESHOLD',
      5,
    );
  }

  onModuleInit() {
    if (!this.baseUrl || !this.token) {
      this.logger.warn(
        '⚠️  Facturación electrónica: URL o TOKEN no configurados. El adaptador está inactivo.',
      );
    }
  }

  private getHeaders(): AxiosRequestConfig['headers'] {
    return { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' };
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;
    const now = new Date();
    if (
      this.lastFailureTime &&
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

    try {
      const response = await firstValueFrom(
        this.httpService.post<T>(`${this.baseUrl}${endpoint}`, body, {
          headers: this.getHeaders(),
          timeout: 10_000,
        }),
      );
      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
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

    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}${endpoint}`, {
          headers: this.getHeaders(),
          timeout: 10_000,
        }),
      );
      this.recordSuccess();
      return response.data;
    } catch (error) {
      this.recordFailure();
      if (attempt < this.maxRetries) {
        this.logger.warn(`Reintentando (${attempt}/${this.maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * attempt));
        return this.get<T>(endpoint, attempt + 1);
      }
      throw error;
    }
  }
}
