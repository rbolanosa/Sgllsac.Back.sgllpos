export declare const appConfig: (() => {
    nodeEnv: string;
    port: number;
    corsOrigins: string[];
    jwt: {
        secret: string;
        expiresIn: string;
    };
    facturacion: {
        token: string;
        url: string;
        circuitBreakerThreshold: number;
        retryAttempts: number;
        retryDelay: number;
    };
    sentry: {
        dsn: string;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    nodeEnv: string;
    port: number;
    corsOrigins: string[];
    jwt: {
        secret: string;
        expiresIn: string;
    };
    facturacion: {
        token: string;
        url: string;
        circuitBreakerThreshold: number;
        retryAttempts: number;
        retryDelay: number;
    };
    sentry: {
        dsn: string;
    };
}>;
