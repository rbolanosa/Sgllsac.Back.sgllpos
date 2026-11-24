import { Controller, Get, Query, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../domain/services/audit.service';
import { BackupService } from '../../domain/services/backup.service';
import { UserRole } from '../../domain/entities/user.entity';
import { Roles } from '../decorators/roles.decorator';

@ApiTags('Historial y copias')
@ApiBearerAuth('JWT-auth')
@Roles(UserRole.ADMIN)
@Controller()
export class AuditController {
  constructor(private readonly audit: AuditService, private readonly backups: BackupService) {}

  @Get('audit')
  @ApiOperation({ summary: 'Historial de acciones' })
  list(
    @Query('page') page = '1', @Query('limit') limit = '30', @Query('userId') userId?: string,
    @Query('from') from?: string, @Query('to') to?: string, @Query('q') q?: string,
  ) {
    return this.audit.list({ page: Number(page), limit: Number(limit), userId: Number(userId) || undefined, from, to, q });
  }

  @Get('backup/status')
  async status() { return { last: await this.audit.lastBackup() }; }

  @Get('backup')
  @ApiOperation({ summary: 'Copia completa de la base (SQL comprimido)' })
  async backup() {
    const { file } = await this.backups.dump();
    return new StreamableFile(file, { type: 'application/gzip', disposition: 'attachment; filename="SGLLPOS.sql.gz"' });
  }
}
