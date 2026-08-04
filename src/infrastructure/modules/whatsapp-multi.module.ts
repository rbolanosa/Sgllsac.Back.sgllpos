import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { WhatsappAdapter } from '../adapters/whatsapp.adapter';
import { WhatsappMultiService } from '../services/whatsapp-multi.service';
import { WhatsappMultiController } from '../controllers/whatsapp-multi.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanySettingsEntity,
      CustomerEntity,
      SaleEntity,
    ]),
  ],
  controllers: [WhatsappMultiController],
  providers: [WhatsappMultiService, WhatsappAdapter],
  exports: [WhatsappMultiService],
})
export class WhatsappMultiModule {}
