import {
  IsString, IsOptional, IsBoolean, IsNumber, IsEnum,
  IsArray, ArrayMinSize, ValidateNested, Min, MaxLength, IsNotEmpty, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, DocumentType } from '../../domain/entities/sale.entity';

export class SaleItemInputDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  productId: number;

  /**
   * Modo de venta: 'unit' (unidades sueltas) o 'box' (cajas completas) o 'mixed' (cajas + sueltas).
   * 'unit'  → usar quantity
   * 'box'   → usar boxes (las cajas se convierten a unidades internamente)
   * 'mixed' → usar boxes + quantity (cajas + unidades sueltas adicionales)
   */
  @ApiPropertyOptional({
    enum: ['unit', 'box', 'mixed'],
    default: 'unit',
    description: 'unit=solo unidades | box=solo cajas | mixed=cajas + unidades sueltas',
  })
  @IsOptional()
  @IsIn(['unit', 'box', 'mixed'])
  sellUnit?: 'unit' | 'box' | 'mixed' = 'unit';

  /**
   * Cajas completas a vender (cuando sellUnit = 'box' o 'mixed').
   * El precio se toma de product.boxSalePrice (o unitsPerBox × salePrice si no está definido).
   */
  @ApiPropertyOptional({ example: 1, description: 'Cajas a vender' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  boxes?: number;

  /**
   * Precio por caja (override opcional; si no viene, se usa product.boxSalePrice).
   */
  @ApiPropertyOptional({ example: 58.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  boxUnitPrice?: number;

  /**
   * Unidades sueltas (modo 'unit': todas las unidades; modo 'mixed': unidades EXTRA además de las cajas).
   */
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}


export class PaymentItemInputDto {
  @ApiProperty()
  @IsString()
  method: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ enum: DocumentType, default: DocumentType.BOLETA })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ type: [PaymentItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemInputDto)
  payments?: PaymentItemInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountTendered?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [SaleItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items: SaleItemInputDto[];
}

export class VoidSaleDto {
  @ApiProperty({ example: 'Customer request' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CreateCreditNoteDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  originalSaleId: number;

  /**
   * Código del motivo según Catálogo 09 SUNAT:
   * 01=Anulación | 02=Error RUC | 03=Corrección descripción | 04=Descuento global
   * 05=Descuento por ítem | 06=Devolución total | 07=Devolución parcial
   * 08=Bonificación | 09=Ajuste precio | 10=Otros
   */
  @ApiProperty({
    example: '01',
    description: 'Código motivo Catálogo 09 SUNAT (01–10)',
    enum: ['01','02','03','04','05','06','07','08','09','10'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['01','02','03','04','05','06','07','08','09','10'], {
    message: 'motivo debe ser un código válido del Catálogo 09 SUNAT: 01 al 10',
  })
  motivo: string;

  @ApiPropertyOptional({ example: 'Anulación por error en el RUC' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;
}
