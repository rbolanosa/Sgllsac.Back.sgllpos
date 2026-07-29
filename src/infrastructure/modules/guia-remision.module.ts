import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { GuiaRemisionEntity } from '../../domain/entities/guia-remision.entity';
import { GuiaRemisionService } from '../../domain/services/guia-remision.service';
import { GuiaRemisionController } from '../controllers/guia-remision.controller';
import { FacturacionAdapter } from '../adapters/facturacion.adapter';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([GuiaRemisionEntity, CompanySettingsEntity]),
  ],
  controllers: [GuiaRemisionController],
  providers: [GuiaRemisionService, FacturacionAdapter],
  exports: [GuiaRemisionService],
})
export class GuiaRemisionModule {}

