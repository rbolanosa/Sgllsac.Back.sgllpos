import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../../domain/entities/product.entity';
import { InventoryMovementEntity } from '../../domain/entities/inventory-movement.entity';
import { ProductService } from '../../domain/services/product.service';
import { ProductController } from '../controllers/product.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, InventoryMovementEntity])],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService, TypeOrmModule],
})
export class ProductModule {}
