import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrderEntity } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../../domain/entities/purchase-order-item.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import { InventoryMovementEntity } from '../../domain/entities/inventory-movement.entity';
import { PurchaseOrderService } from '../../domain/services/purchase-order.service';
import { PurchaseOrderController } from '../controllers/purchase-order.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrderEntity,
      PurchaseOrderItemEntity,
      ProductEntity,
      InventoryMovementEntity,
    ]),
  ],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
