import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CompanySettingsEntity } from '../../domain/entities/company-settings.entity';
import { EstablishmentEntity } from '../../domain/entities/establishment.entity';
import { EstablishmentSeriesEntity } from '../../domain/entities/establishment-series.entity';
import { FacturacionAdapter } from '../adapters/facturacion.adapter';
import { EstablishmentsService } from '../../domain/services/establishments.service';
import { EstablishmentsController } from '../controllers/establishments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CompanySettingsEntity,
      EstablishmentEntity,
      EstablishmentSeriesEntity,
    ]),
    HttpModule,
  ],
  controllers: [EstablishmentsController],
  providers: [EstablishmentsService, FacturacionAdapter],
  exports: [EstablishmentsService],
})
export class EstablishmentsModule {}
