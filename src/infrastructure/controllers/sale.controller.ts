import {
  Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, Req, Res, ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SaleService } from '../../domain/services/sale.service';
import { CreateSaleDto, VoidSaleDto, CreateCreditNoteDto } from '../../application/dtos/sale.dto';
import { SaleStatus } from '../../domain/entities/sale.entity';
import { Public } from '../decorators/public.decorator';

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

  @Public()
  @Get('comprobante/pdf/:token')
  @ApiOperation({ summary: 'Secure public PDF download via HMAC signed token' })
  async getPdfByToken(@Param('token') token: string, @Res() res: Response) {
    const saleId = this.saleService.verifyPdfToken(token);
    if (!saleId) {
      throw new ForbiddenException('Enlace de comprobante no válido o expirado');
    }
    const { buffer, fileName } = await this.saleService.generatePdfBuffer(saleId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  }

  @Get(':id/pdf-token')
  @ApiOperation({ summary: 'Get secure signed PDF download token' })
  getPdfToken(@Param('id', ParseIntPipe) id: number) {
    const token = this.saleService.getSecurePdfToken(id);
    return { token, path: `/sales/comprobante/pdf/${token}` };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice receipt PDF file' })
  async getPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { buffer, fileName } = await this.saleService.generatePdfBuffer(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sale by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.saleService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new sale (POS checkout)' })
  create(@Body() dto: CreateSaleDto, @Req() req: any) {
    const rawId = req.user?.sub ?? req.user?.id;
    const cashierId = rawId ? parseInt(String(rawId), 10) : 1;
    return this.saleService.create(dto, cashierId);
  }

  @Post('credit-note')
  @ApiOperation({ summary: 'Create credit note for an invoice or boleta' })
  createCreditNote(@Body() dto: CreateCreditNoteDto) {
    return this.saleService.createCreditNote(
      dto.originalSaleId,
      dto.motivo,
      dto.descripcion || dto.motivo,
    );
  }

  @Patch(':id/void')
  @ApiOperation({ summary: 'Void a completed sale (reverses stock movements)' })
  void(@Param('id', ParseIntPipe) id: number, @Body() dto: VoidSaleDto) {
    return this.saleService.voidSale(id, dto);
  }

  @Post(':id/send-whatsapp')
  @ApiOperation({ summary: 'Send invoice receipt via WhatsApp Evolution API' })
  sendWhatsapp(@Param('id', ParseIntPipe) id: number, @Body() body: { phone: string }) {
    return this.saleService.sendWhatsappMessage(id, body.phone);
  }

  @Post(':id/resend-sunat')
  @ApiOperation({ summary: 'Resend rejected document or credit note to SUNAT' })
  resendSunat(@Param('id', ParseIntPipe) id: number) {
    return this.saleService.resendSunat(id);
  }

  @Get(':id/xml')
  @ApiOperation({ summary: 'Download official signed SUNAT XML for a sale' })
  async getXml(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const { buffer, filename } = await this.saleService.getXml(id);
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  }
}
