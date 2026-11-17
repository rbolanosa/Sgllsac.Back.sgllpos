import {
  IsString, IsOptional, IsNumber, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested,
  Min, Max, IsNotEmpty, IsIn, MaxLength, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QUOTE_STATUSES } from '../../domain/entities/quote.entity';

export class QuoteItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  productId?: number | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(1_000_000)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario con IGV' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(10_000_000)
  unitPrice: number;
}

export class SaveQuoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  customerId?: number | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerDoc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  customerAddress?: string;

  @ApiProperty({ description: 'Días de validez desde hoy' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  validDays: number;

  @ApiPropertyOptional({ description: 'Descuento global en soles (con IGV)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({ type: [QuoteItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
}

export class QuoteStatusDto {
  @ApiProperty({ enum: QUOTE_STATUSES })
  @IsIn(QUOTE_STATUSES)
  status: (typeof QUOTE_STATUSES)[number];
}
