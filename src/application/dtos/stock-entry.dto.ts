import {
  IsString, IsOptional, IsNumber, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested,
  Min, IsNotEmpty, IsIn, Matches, MaxLength, IsBoolean, IsDateString, ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreviewLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;
}

export class PreviewStockEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierRuc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty({ type: [PreviewLineDto] })
  @IsArray()
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => PreviewLineDto)
  lines: PreviewLineDto[];
}

export class NewProductInputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del producto nuevo es obligatorio' })
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcode?: string;

  @ApiProperty({ description: 'Precio de venta por unidad' })
  @Type(() => Number)
  @IsNumber({}, { message: 'El precio de venta debe ser un número' })
  @Min(0.01, { message: 'El precio de venta debe ser mayor a 0' })
  salePrice: number;

  @ApiPropertyOptional({ description: 'Precio de venta del empaque completo (caja, tira…)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  boxSalePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Stock mínimo para alertas' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStockLevel?: number;
}

export class ConfirmLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiProperty({ description: 'Cantidad de empaques según la factura' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @ApiPropertyOptional({ description: 'Nombre del empaque (Caja, Tira, Unidad…)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  unitLabel?: string;

  @ApiProperty({ description: 'Unidades por empaque' })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Las unidades por empaque deben ser al menos 1' })
  factor: number;

  @ApiProperty({ description: 'Precio por empaque' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ enum: ['existing', 'new', 'skip'] })
  @IsIn(['existing', 'new', 'skip'])
  action: 'existing' | 'new' | 'skip';

  @ValidateIf((o) => o.action === 'existing')
  @Type(() => Number)
  @IsNumber({}, { message: 'Elige el producto del catálogo' })
  productId?: number;

  @ValidateIf((o) => o.action === 'new')
  @ValidateNested()
  @Type(() => NewProductInputDto)
  newProduct?: NewProductInputDto;

  @ApiPropertyOptional({ description: 'Nuevo precio de venta por unidad de un producto existente' })
  @ValidateIf((o) => o.action === 'existing' && o.newSalePrice !== undefined && o.newSalePrice !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'El nuevo precio de venta debe ser mayor a 0' })
  newSalePrice?: number;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento del lote' })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

export class ConfirmStockEntryDto {
  @ApiProperty()
  @Matches(/^(10|15|16|17|20)\d{9}$/, { message: 'El RUC del proveedor debe tener 11 dígitos válidos' })
  supplierRuc: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'La razón social del proveedor es obligatoria' })
  @MaxLength(200)
  supplierName: string;

  @ApiProperty()
  @Matches(/^[A-Z0-9]{1,4}-\d{1,10}$/i, { message: 'El número de factura debe tener el formato SERIE-NÚMERO (ej. F001-1520)' })
  invoiceNumber: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @ApiPropertyOptional({ description: 'Total impreso en la factura' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  invoiceTotal?: number;

  @ApiPropertyOptional({ description: 'false si la factura muestra precios sin IGV (se suma 18% al costo)' })
  @IsOptional()
  @IsBoolean()
  pricesIncludeIgv?: boolean;

  @ApiPropertyOptional({ description: 'Descuentos (negativo) u otros cargos (positivo) que no son productos' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  otherAmount?: number;

  @ApiPropertyOptional({ description: 'Cargar aunque la suma no coincida con el total' })
  @IsOptional()
  @IsBoolean()
  acceptTotalMismatch?: boolean;

  @ApiProperty({ type: [ConfirmLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => ConfirmLineDto)
  lines: ConfirmLineDto[];
}
