import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { CompanySettingsService } from '../../domain/services/company-settings.service';
import { CompanySettingsController } from '../controllers/company-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CompanySettingsEntity])],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
