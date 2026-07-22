import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CustomerController } from '../controllers/customer.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerEntity])],
  controllers: [CustomerController],
  exports: [TypeOrmModule],
})
export class CustomerModule {}
