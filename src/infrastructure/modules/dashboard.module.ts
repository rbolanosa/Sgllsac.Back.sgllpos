import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { SaleItemEntity } from '../../domain/entities/sale-item.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import { DashboardService } from '../../domain/services/dashboard.service';
import { DashboardController } from '../controllers/dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SaleEntity, SaleItemEntity, ProductEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
