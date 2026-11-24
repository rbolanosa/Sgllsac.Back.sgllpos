import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditService } from '../../domain/services/audit.service';
import { BackupService } from '../../domain/services/backup.service';
import { AuditController } from '../controllers/audit.controller';
import { AuditInterceptor } from '../interceptors/audit.interceptor';

@Module({
  controllers: [AuditController],
  providers: [AuditService, BackupService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AuditModule {}
