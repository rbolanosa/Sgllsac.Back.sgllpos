import {
  IsString, IsOptional, IsBoolean, IsNumber, IsEnum,
  IsPositive, Min, Max, MaxLength, IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductUnit, TipAfeIgv } from '../../domain/entities/product.entity';

export class CreateProductDto {
  @ApiPropertyOptional({ example: '7501000000000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiPropertyOptional({ example: 'SKU-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiProperty({ example: 'Coca-Cola 600ml' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supplierId?: number;

  /**
   * Catálogo Nº 3 SUNAT - Código de Unidad de Medida
   * Valores comunes: NIU (unidad), KGM (kg), ZZ (servicio), LTR (litro)
   */
  @ApiProperty({ enum: ProductUnit, default: ProductUnit.NIU, example: 'NIU' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  unit?: string = ProductUnit.NIU;

  /**
   * Catálogo Nº 7 SUNAT - Tipo de Afectación del IGV
   * 10=Gravado (normal), 20=Exonerado, 30=Inafecto, 40=Exportación
   */
  @ApiProperty({ enum: TipAfeIgv, default: TipAfeIgv.GRAVADO_ONEROSA, example: '10' })
  @IsString()
  @IsOptional()
  @MaxLength(5)
  tipAfeIgv?: string = TipAfeIgv.GRAVADO_ONEROSA;

  @ApiProperty({ example: 4.5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ example: 6.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiPropertyOptional({ default: 18, description: 'Porcentaje IGV. 18 para tasa general, 4 para IVAP, 0 para exonerado/inafecto' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number = 18;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stockQuantity?: number = 0;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockLevel?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  // ─── Presentación en Caja ─────────────────────────────────────────────────

  @ApiPropertyOptional({
    default: false,
    description: 'Si true, el producto maneja presentación dual caja + unidad',
  })
  @IsOptional()
  @IsBoolean()
  hasBoxPresentation?: boolean = false;

  @ApiPropertyOptional({
    example: 24,
    description: 'Unidades que contiene una caja. Requerido si hasBoxPresentation=true',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  unitsPerBox?: number;

  @ApiPropertyOptional({
    example: 58.0,
    description: 'Precio de venta de una caja completa (independiente del precio unitario)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  boxSalePrice?: number;

  @ApiPropertyOptional({
    example: 'Caja',
    description: 'Nombre de la presentación mayorista (Caja, Paquete, Tira, Blíster, Saco, Fardo, Palet, etc.)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  boxUnitName?: string = 'Caja';

  @ApiPropertyOptional({
    example: 0.6,
    description: 'Peso unitario en kg (KGM). Para calcular el peso total en la Guía de Remisión automáticamente.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pesoUnitario?: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supplierId?: number;

  @ApiPropertyOptional({ enum: ProductUnit, example: 'NIU', description: 'Catálogo Nº 3 SUNAT' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  unit?: string;

  @ApiPropertyOptional({ enum: TipAfeIgv, example: '10', description: 'Catálogo Nº 7 SUNAT - Tipo de Afectación IGV' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  tipAfeIgv?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // ─── Presentación en Caja ─────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Si true, el producto maneja presentación dual caja + unidad',
  })
  @IsOptional()
  @IsBoolean()
  hasBoxPresentation?: boolean;

  @ApiPropertyOptional({
    example: 24,
    description: 'Unidades que contiene una caja',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  unitsPerBox?: number;

  @ApiPropertyOptional({
    example: 58.0,
    description: 'Precio de venta de una caja completa',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  boxSalePrice?: number;

  @ApiPropertyOptional({
    example: 0.6,
    description: 'Peso unitario en kg. Para calcular el peso total en la Guía de Remisión.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pesoUnitario?: number;
}

export class StockAdjustmentDto {
  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'Received from supplier' })
  @IsString()
  @IsNotEmpty()
  notes: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supplierId?: number;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  expirationDate?: string;
}
