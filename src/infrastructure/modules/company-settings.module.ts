import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { CompanySettingsService } from '../../domain/services/company-settings.service';
import { CompanySettingsController } from '../controllers/company-settings.controller';
import { FacturacionAdapter } from '../adapters/facturacion.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanySettingsEntity]),
    HttpModule,
  ],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService, FacturacionAdapter],
  exports: [CompanySettingsService, FacturacionAdapter],
})
export class CompanySettingsModule {}
