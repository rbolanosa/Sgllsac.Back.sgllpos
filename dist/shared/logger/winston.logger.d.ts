import * as winston from 'winston';
import 'rotating-file-stream';
export declare class WinstonLogger {
    static createLogger(): winston.Logger;
    static createNestLogger(): import("@nestjs/common").LoggerService;
}
