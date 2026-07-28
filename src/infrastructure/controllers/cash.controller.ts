import {
  Controller, Get, Post, Body, Req, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CashService } from '../../domain/services/cash.service';
import {
  OpenCashSessionDto, CloseCashSessionDto, CreateCashMovementDto,
} from '../../application/dtos/cash.dto';

@ApiTags('Caja')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'caja', version: '1' })
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Post('abrir')
  open(@Body() dto: OpenCashSessionDto, @Req() req: any) {
    return this.cashService.openSession(dto, req.user?.id);
  }

  @Get('activa')
  active(@Req() req: any) {
    return this.cashService.getActiveSession(req.user?.id);
  }

  @Get('resumen')
  summary(@Req() req: any) {
    return this.cashService.getSessionSummary(req.user?.id);
  }

  @Post('movimiento')
  addMovement(@Body() dto: CreateCashMovementDto, @Req() req: any) {
    return this.cashService.addMovement(dto, req.user?.id);
  }

  @Post('cerrar')
  close(@Body() dto: CloseCashSessionDto, @Req() req: any) {
    return this.cashService.closeSession(dto, req.user?.id);
  }

  @Get('historial')
  history(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cashierId') cashierId?: string,
  ) {
    return this.cashService.getHistory(page, limit, cashierId ? parseInt(cashierId) : undefined);
  }

  @Get('sesion/:id')
  getOne(@Req() req: any, @Query('id', ParseIntPipe) id: number) {
    return this.cashService.getSessionById(id);
  }
}
