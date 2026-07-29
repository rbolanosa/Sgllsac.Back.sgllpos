import {
  Controller, Get, Post, Param, Body, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuiaRemisionService } from '../../domain/services/guia-remision.service';
import { CreateGuiaRemisionDto } from '../../application/dtos/guia-remision.dto';

@ApiTags('Guías de Remisión')
@ApiBearerAuth('JWT-auth')
@Controller('guias-remision')
export class GuiaRemisionController {
  constructor(private readonly service: GuiaRemisionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar guías de remisión (paginado, con filtros)' })
  findAll(
    @Query('page')        page        = 1,
    @Query('limit')       limit       = 20,
    @Query('sunatStatus') sunatStatus?: string,
    @Query('from')        from?:        string,
    @Query('to')          to?:          string,
  ) {
    return this.service.findAll({ page: +page, limit: +limit, sunatStatus, from, to });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una guía de remisión por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear y enviar Guía de Remisión Remitente a SUNAT' })
  create(@Body() dto: CreateGuiaRemisionDto) {
    return this.service.create(dto);
  }

  @Post(':id/resend-sunat')
  @ApiOperation({ summary: 'Reenviar guía rechazada/pendiente a SUNAT' })
  resendSunat(@Param('id', ParseIntPipe) id: number) {
    return this.service.resendSunat(id);
  }
}
