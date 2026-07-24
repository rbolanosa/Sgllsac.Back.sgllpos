import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SaleService } from '../../domain/services/sale.service';
import { CreateSaleDto, VoidSaleDto } from '../../application/dtos/sale.dto';
import { SaleStatus } from '../../domain/entities/sale.entity';

@ApiTags('Sales')
@ApiBearerAuth('JWT-auth')
@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Get()
  @ApiOperation({ summary: 'List all sales with optional filters (paginated)' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 30,
    @Query('status') status?: SaleStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('documentType') documentType?: string,
  ) {
    return this.saleService.findAll({ page: +page, limit: +limit, status, from, to, documentType });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Sales summary for a date range' })
  getSummary(@Query('from') from: string, @Query('to') to: string) {
    return this.saleService.getSalesSummary(from, to);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.saleService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new sale (POS checkout)' })
  create(@Body() dto: CreateSaleDto, @Req() req: any) {
    const cashierId = req.user?.sub || req.user?.id || 1;
    return this.saleService.create(dto, cashierId);
  }

  @Patch(':id/void')
  @ApiOperation({ summary: 'Void a completed sale (reverses stock movements)' })
  void(@Param('id', ParseIntPipe) id: number, @Body() dto: VoidSaleDto) {
    return this.saleService.voidSale(id, dto);
  }

  @Post('credit-note')
  @ApiOperation({ summary: 'Issue a credit note (nota de credito) for an existing sale' })
  createCreditNote(
    @Body() body: { originalSaleId: number; motivo: string; descripcion: string },
  ) {
    return this.saleService.createCreditNote(body.originalSaleId, body.motivo, body.descripcion);
  }
}
