import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { CategoryController } from '../controllers/category.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryEntity])],
  controllers: [CategoryController],
  exports: [TypeOrmModule],
})
export class CategoryModule {}
