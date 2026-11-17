import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { QuoteService } from '../../domain/services/quote.service';
import { QuoteController } from '../controllers/quote.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QuoteEntity, CompanySettingsEntity])],
  controllers: [QuoteController],
  providers: [QuoteService],
})
export class QuoteModule {}
