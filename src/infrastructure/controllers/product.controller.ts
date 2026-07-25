import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, ParseIntPipe, Query,
  Res, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ProductService } from '../../domain/services/product.service';
import { CreateProductDto, UpdateProductDto, StockAdjustmentDto } from '../../application/dtos/product.dto';
import { MovementType } from '../../domain/entities/inventory-movement.entity';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'List all products with optional filters' })
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: number,
    @Query('supplierId') supplierId?: number,
    @Query('isActive') isActive?: boolean,
    @Query('lowStock') lowStock?: boolean,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.productService.findAll({ search, categoryId, supplierId, isActive, lowStock, page: +page, limit: +limit });
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'List products below minimum stock level' })
  getLowStock() {
    return this.productService.getLowStockProducts();
  }

  // ─── EXCEL TEMPLATE DOWNLOAD ───────────────────────────────────────────────
  @Get('excel/template')
  @ApiOperation({ summary: 'Download Excel template for bulk product import (includes SUNAT catalogs 3 & 7)' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.productService.generateExcelTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="DEVPRO_Plantilla_Productos_SUNAT.xlsx"');
    res.end(buffer);
  }

  // ─── EXCEL IMPORT ──────────────────────────────────────────────────────────
  @Post('excel/import')
  @ApiOperation({ summary: 'Import products from Excel file. Creates new or updates by SKU.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (_, file, cb) => {
      const ok = file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls');
      cb(ok ? null : new Error('Solo se permiten archivos Excel (.xlsx / .xls)'), ok);
    },
  }))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No se recibió ningún archivo.');
    return this.productService.importFromExcel(file.buffer);
  }

  @Get('barcode/:barcode')
  @ApiOperation({ summary: 'Find product by barcode (used by scanner)' })
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productService.findByBarcode(barcode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete product (mark inactive)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productService.remove(id);
  }

  @Patch(':id/stock/add')
  @ApiOperation({ summary: 'Add stock manually (entry)' })
  addStock(@Param('id', ParseIntPipe) id: number, @Body() dto: StockAdjustmentDto) {
    return this.productService.adjustStock(id, dto, MovementType.IN);
  }

  @Patch(':id/stock/subtract')
  @ApiOperation({ summary: 'Subtract stock manually (loss/adjustment)' })
  subtractStock(@Param('id', ParseIntPipe) id: number, @Body() dto: StockAdjustmentDto) {
    return this.productService.adjustStock(id, dto, MovementType.OUT);
  }
}
