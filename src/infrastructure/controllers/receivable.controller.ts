import { Controller, Get, Post, Body, Query, Req, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReceivableService } from '../../domain/services/receivable.service';
import { ReceivablePaymentDto } from '../../application/dtos/receivable.dto';

@ApiTags('Cuentas por cobrar')
@ApiBearerAuth('JWT-auth')
@Controller('receivables')
export class ReceivableController {
  constructor(private readonly service: ReceivableService) {}

  @Get()
  @ApiOperation({ summary: 'Ventas al crédito con su saldo' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ page: +page, limit: +limit, status, search });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Total por cobrar, vencido y por vencer en 7 días' })
  summary() {
    return this.service.summary();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Registrar un abono del cliente' })
  addPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: ReceivablePaymentDto, @Req() req: any) {
    const rawId = req.user?.sub ?? req.user?.id;
    return this.service.addPayment(id, dto, rawId ? Number(rawId) : undefined);
  }
}
