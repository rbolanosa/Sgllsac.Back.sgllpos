import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { SaleItemEntity } from '../../domain/entities/sale-item.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import { ProductBatchEntity } from '../../domain/entities/product-batch.entity';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { InventoryMovementEntity } from '../../domain/entities/inventory-movement.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { SaleService } from '../../domain/services/sale.service';
import { SaleController } from '../controllers/sale.controller';
import { CompanySettingsModule } from './company-settings.module';
import { CashModule } from './cash.module';

import { WhatsappAdapter } from '../adapters/whatsapp.adapter';
import { WhatsappMultiModule } from './whatsapp-multi.module';
import { WhatsappMultiService } from '../services/whatsapp-multi.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaleEntity,
      SaleItemEntity,
      ProductEntity,
      ProductBatchEntity,
      CustomerEntity,
      InventoryMovementEntity,
      UserEntity,
    ]),
    CompanySettingsModule,
    CashModule,
    WhatsappMultiModule,
  ],
  controllers: [SaleController],
  providers: [SaleService, WhatsappAdapter],
  exports: [SaleService, WhatsappAdapter],
})
export class SaleModule {}

