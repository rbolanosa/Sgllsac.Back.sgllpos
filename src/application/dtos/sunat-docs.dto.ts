import { IsIn, IsNotEmpty, IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RequestVoidDto {
  @ApiProperty({ example: 'Error en los datos del cliente' })
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  reason: string;
}

export class CreateDebitNoteDto {
  @ApiProperty({ enum: ['01', '02', '03'] })
  @IsIn(['01', '02', '03'])
  reasonCode: string;

  @ApiProperty({ example: 'Interés por pago fuera de plazo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  description: string;

  @ApiProperty({ example: 25, description: 'Monto con IGV' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;
}
