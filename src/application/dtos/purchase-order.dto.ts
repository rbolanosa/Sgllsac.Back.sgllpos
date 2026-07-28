import {
  IsString, IsOptional, IsNumber, IsArray,
  ArrayMinSize, ValidateNested, Min, IsNotEmpty, IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseOrderItemInputDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  productId: number;

  /**
   * Indica cómo se compra al proveedor: 'unit' (unidades) o 'box' (cajas).
   * Si es 'box', usar boxesOrdered + boxCost en lugar de quantityOrdered + unitCost.
   */
  @ApiPropertyOptional({
    enum: ['unit', 'box'],
    default: 'unit',
    description: 'unit = compra por unidad | box = compra por caja',
  })
  @IsOptional()
  @IsIn(['unit', 'box'])
  purchaseUnit?: 'unit' | 'box' = 'unit';

  /**
   * Cantidad en UNIDADES (solo cuando purchaseUnit = 'unit').
   * Si purchaseUnit = 'box', se calcula automáticamente: boxesOrdered × product.unitsPerBox
   */
  @ApiPropertyOptional({ example: 48, description: 'Cantidad en unidades (modo unidad)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantityOrdered?: number;

  /**
   * Costo por unidad individual (solo cuando purchaseUnit = 'unit').
   */
  @ApiPropertyOptional({ example: 2.5, description: 'Costo por unidad (modo unidad)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  /**
   * Cajas ordenadas al proveedor (solo cuando purchaseUnit = 'box').
   * El sistema multiplica por unitsPerBox para obtener las unidades totales.
   */
  @ApiPropertyOptional({ example: 2, description: 'Cajas pedidas al proveedor (modo caja)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  boxesOrdered?: number;

  /**
   * Costo por caja completa (solo cuando purchaseUnit = 'box').
   * El sistema calcula: unitCost = boxCost / unitsPerBox
   */
  @ApiPropertyOptional({ example: 54.0, description: 'Costo por caja (modo caja)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  boxCost?: number;
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supplierId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseOrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemInputDto)
  items: PurchaseOrderItemInputDto[];
}


export class ReceivePurchaseOrderItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  itemId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityReceived: number;
}

export class ReceivePurchaseOrderDto {
  @ApiProperty({ type: [ReceivePurchaseOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items: ReceivePurchaseOrderItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
