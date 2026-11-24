import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { SunatVoidEntity } from '../../domain/entities/sunat-void.entity';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { SunatDocsService } from '../../domain/services/sunat-docs.service';
import { SireService } from '../../domain/services/sire.service';
import { SalesRegisterService } from '../../domain/services/sales-register.service';
import { StockEntryEntity } from '../../domain/entities/stock-entry.entity';
import { SunatDocsController } from '../controllers/sunat-docs.controller';
import { FacturacionAdapter } from '../adapters/facturacion.adapter';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([SaleEntity, SunatVoidEntity, CompanySettingsEntity, StockEntryEntity])],
  controllers: [SunatDocsController],
  providers: [SunatDocsService, SireService, SalesRegisterService, FacturacionAdapter],
})
export class SunatDocsModule {}
