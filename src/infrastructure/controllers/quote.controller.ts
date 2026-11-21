import { Controller, Get, Post, Put, Patch, Body, Query, Req, Param, ParseIntPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuoteService } from '../../domain/services/quote.service';
import { SaveQuoteDto, QuoteStatusDto, QuoteSoldDto } from '../../application/dtos/quote.dto';
import { Public } from '../decorators/public.decorator';

@ApiTags('Cotizaciones')
@ApiBearerAuth('JWT-auth')
@Controller('quotes')
export class QuoteController {
  constructor(private readonly service: QuoteService) {}

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ page: +page, limit: +limit, search, status });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Pendientes, aceptadas y vendidas del mes' })
  summary() {
    return this.service.summary();
  }

  // El enlace usa un token aleatorio: se puede compartir con el cliente sin exponer otras cotizaciones.
  @Public()
  @Get('pdf/:token')
  @ApiOperation({ summary: 'PDF A4 de la cotización (enlace para el cliente)' })
  async pdf(@Param('token') token: string, @Res() res: Response) {
    try {
      const { buffer, fileName } = await this.service.generatePdfByToken(token);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.send(buffer);
    } catch (err: any) {
      const status = err?.status === 404 ? 404 : 500;
      res.status(status).json({ statusCode: status, message: status === 404 ? 'Cotización no encontrada' : 'Error al generar el PDF' });
    }
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cotización (no mueve stock ni genera venta)' })
  create(@Body() dto: SaveQuoteDto, @Req() req: any) {
    const rawId = req.user?.sub ?? req.user?.id;
    return this.service.create(dto, rawId ? Number(rawId) : undefined);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: SaveQuoteDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: QuoteStatusDto) {
    return this.service.setStatus(id, dto.status);
  }

  @Patch(':id/sold')
  @ApiOperation({ summary: 'Marca la cotización como vendida (la llama el POS)' })
  markSold(@Param('id', ParseIntPipe) id: number, @Body() dto: QuoteSoldDto) {
    return this.service.markSold(id, dto.saleRef);
  }
}
