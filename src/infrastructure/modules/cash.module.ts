import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashSessionEntity } from '../../domain/entities/cash-session.entity';
import { CashMovementEntity } from '../../domain/entities/cash-movement.entity';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { CashService } from '../../domain/services/cash.service';
import { CashController } from '../controllers/cash.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashSessionEntity,
      CashMovementEntity,
      SaleEntity,
      UserEntity,
    ]),
  ],
  controllers: [CashController],
  providers: [CashService],
  exports: [CashService],
})
export class CashModule {}
