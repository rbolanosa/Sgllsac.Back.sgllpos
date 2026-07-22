import {
  Controller, Get, Post, Put, Delete,
  Body, Param, ParseIntPipe, Query, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from '../../domain/entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../../application/dtos/category.dto';

@ApiTags('Categories')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
export class CategoryController {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List categories with optional pagination' })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // No pagination params → return full list (used by dropdowns)
    if (!page && !limit) {
      const qb = this.categoryRepo.createQueryBuilder('c').orderBy('c.name', 'ASC');
      if (search) qb.where('c.name LIKE :q', { q: `%${search}%` });
      const data = await qb.getMany();
      return data;
    }

    const p = +(page || 1);
    const l = +(limit || 20);
    const qb = this.categoryRepo
      .createQueryBuilder('c')
      .orderBy('c.name', 'ASC')
      .skip((p - 1) * l)
      .take(l);

    if (search) qb.where('c.name LIKE :q', { q: `%${search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: p, limit: l };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category #${id} not found`);
    return cat;
  }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  async create(@Body() dto: CreateCategoryDto) {
    const cat = this.categoryRepo.create(dto);
    return this.categoryRepo.save(cat);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category #${id} not found`);
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete category' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category #${id} not found`);
    cat.isActive = false;
    return this.categoryRepo.save(cat);
  }
}
