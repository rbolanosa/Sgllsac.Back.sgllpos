import {
  IsNumber, IsOptional, IsString, IsEnum, Min, IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CashMovementType } from '../../domain/entities/cash-movement.entity';

export class OpenCashSessionDto {
  @ApiProperty({ example: 150.00, description: 'Monto inicial en caja (fondo de apertura)' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingAmount: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  establishmentId?: number;

  @ApiPropertyOptional({ example: 'Apertura de turno mañana' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseCashSessionDto {
  @ApiProperty({ example: 480.50, description: 'Monto físico contado al cierre' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  closingAmount: number;

  @ApiPropertyOptional({ example: 'Todo cuadra correctamente' })
  @IsOptional()
  @IsString()
  closingNotes?: string;
}

export class CreateCashMovementDto {
  @ApiProperty({ enum: CashMovementType })
  @IsEnum(CashMovementType)
  type: CashMovementType;

  @ApiProperty({ example: 50.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: 'Compra de útiles de oficina' })
  @IsOptional()
  @IsString()
  description?: string;
}
