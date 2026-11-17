import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../../domain/entities/product.entity';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { StockEntryEntity } from '../../domain/entities/stock-entry.entity';
import { SupplierProductMapEntity } from '../../domain/entities/supplier-product-map.entity';
import { StockEntryService } from '../../domain/services/stock-entry.service';
import { StockEntryController } from '../controllers/stock-entry.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, SupplierEntity, StockEntryEntity, SupplierProductMapEntity]),
  ],
  controllers: [StockEntryController],
  providers: [StockEntryService],
})
export class StockEntryModule {}
