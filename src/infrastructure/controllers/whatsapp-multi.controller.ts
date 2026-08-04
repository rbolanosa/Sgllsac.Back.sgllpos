import { Controller, Get, Post, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsappMultiService } from '../services/whatsapp-multi.service';

@ApiTags('WhatsApp')
@ApiBearerAuth('JWT-auth')
@Controller('whatsapp')
export class WhatsappMultiController {
  constructor(private readonly whatsappService: WhatsappMultiService) {}

  @Get('status')
  @ApiOperation({ summary: 'Verificar estado de conexión de WhatsApp para la empresa' })
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Get('contacts')
  @ApiOperation({ summary: 'Obtener lista de contactos desde la tabla clientes' })
  getContacts() {
    return this.whatsappService.getContacts();
  }

  @Post('send-text')
  @ApiOperation({ summary: 'Enviar mensaje de texto individual por WhatsApp' })
  sendText(@Body() body: { to: string; message: string }) {
    return this.whatsappService.sendText(body.to, body.message);
  }

  @Post('send-voucher/:saleId')
  @ApiOperation({ summary: 'Enviar comprobante electrónico PDF por WhatsApp a un cliente' })
  sendVoucher(
    @Param('saleId', ParseIntPipe) saleId: number,
    @Body() body: { phone?: string },
  ) {
    return this.whatsappService.sendVoucher(saleId, body?.phone);
  }
}
