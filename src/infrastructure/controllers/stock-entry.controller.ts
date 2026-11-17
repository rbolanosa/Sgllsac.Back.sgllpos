import { Controller, Get, Post, Body, Query, Req, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StockEntryService } from '../../domain/services/stock-entry.service';
import { PreviewStockEntryDto, ConfirmStockEntryDto } from '../../application/dtos/stock-entry.dto';

@ApiTags('Ingreso por factura')
@ApiBearerAuth('JWT-auth')
@Controller('stock-entries')
export class StockEntryController {
  constructor(private readonly service: StockEntryService) {}

  @Get()
  @ApiOperation({ summary: 'Facturas de compra cargadas' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.service.findAll(+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Productos que ingresaron con una factura cargada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Sugerir productos del catálogo y detectar factura repetida' })
  preview(@Body() dto: PreviewStockEntryDto) {
    return this.service.preview(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Cargar la factura: sube stock, actualiza costos y crea productos nuevos' })
  confirm(@Body() dto: ConfirmStockEntryDto, @Req() req: any) {
    const rawId = req.user?.sub ?? req.user?.id;
    return this.service.confirm(dto, rawId ? Number(rawId) : undefined);
  }
}
