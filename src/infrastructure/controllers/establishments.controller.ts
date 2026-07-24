import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  EstablishmentsService,
  CreateEstablishmentDto,
  SaveSeriesBatchDto,
} from '../../domain/services/establishments.service';

@Controller({ path: 'establishments', version: '1' })
export class EstablishmentsController {
  constructor(private readonly service: EstablishmentsService) {}

  @Get()
  async findAll() {
    return this.service.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateEstablishmentDto) {
    return this.service.create(dto);
  }

  @Get('series')
  async listSeries(@Query('sucursal_id') sucursalId?: string) {
    const id = sucursalId ? parseInt(sucursalId, 10) : undefined;
    return this.service.listSeries(id);
  }

  @Post('series')
  @HttpCode(HttpStatus.OK)
  async saveSeriesBatch(@Body() dto: SaveSeriesBatchDto) {
    return this.service.saveSeriesBatch(dto);
  }
}
