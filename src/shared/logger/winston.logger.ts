import * as winston from 'winston';
import 'rotating-file-stream';
import { WinstonModule } from 'nest-winston';
import * as rfs from 'rotating-file-stream';
import * as path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

export class WinstonLogger {
  static createLogger(): winston.Logger {
    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat,
      ),
      transports: [
        new winston.transports.Console({
          format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
        }),
        new winston.transports.Stream({
          stream: rfs.createStream('application-%DATE%.log', {
            interval: '1d',
            maxFiles: 14,
            path: path.resolve(process.cwd(), 'logs'),
          }),
        }),
        new winston.transports.Stream({
          level: 'error',
          stream: rfs.createStream('error-%DATE%.log', {
            interval: '1d',
            maxFiles: 30,
            path: path.resolve(process.cwd(), 'logs'),
          }),
        }),
      ],
    });
  }

  static createNestLogger() {
    return WinstonModule.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        logFormat,
      ),
      transports: [
        new winston.transports.Console({
          format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
        }),
        new winston.transports.Stream({
          stream: rfs.createStream('application-%DATE%.log', {
            interval: '1d',
            maxFiles: 14,
            path: path.resolve(process.cwd(), 'logs'),
          }),
        }),
      ],
    });
  }
}
