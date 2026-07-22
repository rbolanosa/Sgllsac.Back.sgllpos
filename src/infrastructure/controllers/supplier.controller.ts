import {
  Controller, Get, Post, Put, Delete,
  Body, Param, ParseIntPipe, Query, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { CreateSupplierDto, UpdateSupplierDto } from '../../application/dtos/supplier.dto';

@ApiTags('Suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers')
export class SupplierController {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly supplierRepo: Repository<SupplierEntity>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List suppliers with pagination and search' })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const qb = this.supplierRepo
      .createQueryBuilder('s')
      .where('s.isActive = true')
      .orderBy('s.name', 'ASC')
      .skip((+page - 1) * +limit)
      .take(+limit);

    if (search) {
      qb.andWhere('(s.name LIKE :q OR s.nit LIKE :q OR s.contactName LIKE :q OR s.email LIKE :q)', {
        q: `%${search}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: +page, limit: +limit };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const sup = await this.supplierRepo.findOne({ where: { id } });
    if (!sup) throw new NotFoundException(`Supplier #${id} not found`);
    return sup;
  }

  @Post()
  @ApiOperation({ summary: 'Create supplier' })
  async create(@Body() dto: CreateSupplierDto) {
    const sup = this.supplierRepo.create(dto);
    return this.supplierRepo.save(sup);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update supplier' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSupplierDto) {
    const sup = await this.supplierRepo.findOne({ where: { id } });
    if (!sup) throw new NotFoundException(`Supplier #${id} not found`);
    Object.assign(sup, dto);
    return this.supplierRepo.save(sup);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete supplier' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const sup = await this.supplierRepo.findOne({ where: { id } });
    if (!sup) throw new NotFoundException(`Supplier #${id} not found`);
    sup.isActive = false;
    return this.supplierRepo.save(sup);
  }
}
