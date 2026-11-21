import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceivableEntity, ReceivableInstallmentEntity, ReceivablePaymentEntity } from '../../domain/entities/receivable.entity';
import { ReceivableService } from '../../domain/services/receivable.service';
import { ReceivableController } from '../controllers/receivable.controller';
import { CashModule } from './cash.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReceivableEntity, ReceivableInstallmentEntity, ReceivablePaymentEntity]),
    CashModule,
  ],
  controllers: [ReceivableController],
  providers: [ReceivableService],
  exports: [ReceivableService],
})
export class ReceivableModule {}
