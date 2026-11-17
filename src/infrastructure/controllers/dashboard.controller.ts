import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService, DashboardPeriod } from '../../domain/services/dashboard.service';

const PERIODS: DashboardPeriod[] = ['today', '7d', '30d', 'month'];

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Indicadores del negocio para el periodo (solo lectura)' })
  get(@Query('period') period: DashboardPeriod = '7d') {
    if (!PERIODS.includes(period)) throw new BadRequestException(`Periodo no válido. Usa: ${PERIODS.join(', ')}`);
    return this.service.get(period);
  }
}
