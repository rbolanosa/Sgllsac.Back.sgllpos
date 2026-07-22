import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],

  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  facturacion: {
    token: process.env.TOKEN_API_FACTURACION || '',
    url: process.env.URL_API_FACTURACION_QA || '',
    circuitBreakerThreshold: parseInt(
      process.env.CIRCUIT_BREAKER_THRESHOLD || '5',
      10,
    ),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  },

  sentry: {
    dsn: process.env.SENTRY_DSN || '',
  },
}));
