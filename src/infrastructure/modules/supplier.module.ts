import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { SupplierController } from '../controllers/supplier.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierEntity])],
  controllers: [SupplierController],
  exports: [TypeOrmModule],
})
export class SupplierModule {}
