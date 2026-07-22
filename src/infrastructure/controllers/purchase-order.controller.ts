import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrderService } from '../../domain/services/purchase-order.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from '../../application/dtos/purchase-order.dto';
import { PurchaseOrderStatus } from '../../domain/entities/purchase-order.entity';

@ApiTags('Purchase Orders')
@ApiBearerAuth('JWT-auth')
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService) {}

  @Get()
  @ApiOperation({ summary: 'List all purchase orders' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 30,
    @Query('status') status?: PurchaseOrderStatus,
  ) {
    return this.poService.findAll({ page: +page, limit: +limit, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.poService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.poService.create(dto);
  }

  @Patch(':id/receive')
  @ApiOperation({ summary: 'Mark items as received and update stock' })
  receive(@Param('id', ParseIntPipe) id: number, @Body() dto: ReceivePurchaseOrderDto) {
    return this.poService.receive(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending purchase order' })
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.poService.cancel(id);
  }
}
