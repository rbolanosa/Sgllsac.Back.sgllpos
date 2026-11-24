import { Controller, Get, Post, Body, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SunatDocsService } from '../../domain/services/sunat-docs.service';
import { SireService } from '../../domain/services/sire.service';
import { SalesRegisterService } from '../../domain/services/sales-register.service';
import { RequestVoidDto, CreateDebitNoteDto } from '../../application/dtos/sunat-docs.dto';

@ApiTags('Baja y notas de débito')
@ApiBearerAuth('JWT-auth')
@Controller('sunat-docs')
export class SunatDocsController {
  constructor(private readonly service: SunatDocsService, private readonly sire: SireService, private readonly register: SalesRegisterService) {}

  @Get('sales/:id/void')
  @ApiOperation({ summary: '¿Se puede dar de baja esta factura? y estado de la última baja' })
  voidCheck(@Param('id', ParseIntPipe) id: number) {
    return this.service.voidCheck(id);
  }

  @Post('sales/:id/void')
  @ApiOperation({ summary: 'Comunicación de baja de una factura (hasta 7 días)' })
  requestVoid(@Param('id', ParseIntPipe) id: number, @Body() dto: RequestVoidDto, @Req() req: any) {
    const rawId = req.user?.sub ?? req.user?.id;
    return this.service.requestVoid(id, dto.reason, rawId ? Number(rawId) : undefined);
  }

  @Post('voids/refresh')
  @ApiOperation({ summary: 'Consulta en SUNAT las bajas pendientes' })
  refreshPending() {
    return this.service.refreshPendingVoids();
  }

  @Get('voids')
  @ApiOperation({ summary: 'Estado de baja de varias ventas (ids separados por coma)' })
  listVoids(@Query('saleIds') saleIds = '') {
    const ids = saleIds.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
    return this.service.listVoids(ids);
  }

  @Post('sales/:id/debit-note')
  @ApiOperation({ summary: 'Nota de débito sobre una factura (intereses, aumento de valor, penalidad)' })
  debitNote(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateDebitNoteDto) {
    return this.service.createDebitNote(id, dto);
  }

  @Get('sales-register')
  @ApiOperation({ summary: 'Comprobantes enviados a SUNAT en un rango de fechas, con sus montos' })
  salesRegister(@Query('from') from: string, @Query('to') to: string) {
    return this.register.list(from, to);
  }

  @Post('sire/activate')
  @ApiOperation({ summary: 'Activa SIRE en APISUNAT con las credenciales de la empresa' })
  sireActivate() {
    return this.sire.activate();
  }

  @Post('sire/:periodo/request')
  @ApiOperation({ summary: 'Pide a SUNAT la propuesta del Registro de Compras del periodo (AAAAMM)' })
  sireRequest(@Param('periodo') periodo: string) {
    return this.sire.request(periodo);
  }

  @Get('sire/:periodo/tickets')
  sireTickets(@Param('periodo') periodo: string) {
    return this.sire.tickets(periodo);
  }

  @Get('sire/:periodo/compare')
  @ApiOperation({ summary: 'Cruza lo declarado en SUNAT con las facturas cargadas' })
  sireCompare(@Param('periodo') periodo: string) {
    return this.sire.compare(periodo);
  }
}
