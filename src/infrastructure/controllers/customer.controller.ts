import {
  Controller, Get, Post, Put, Delete,
  Body, Param, ParseIntPipe, Query, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from '../../application/dtos/customer.dto';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@Controller('customers')
export class CustomerController {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepo: Repository<CustomerEntity>,
  ) { }

  @Get()
  @ApiOperation({ summary: 'List customers with pagination and search' })
  async findAll(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const qb = this.customerRepo
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .orderBy('c.name', 'ASC')
      .skip((+page - 1) * +limit)
      .take(+limit);

    if (search) {
      qb.andWhere('(c.name LIKE :q OR c.nit LIKE :q OR c.phone LIKE :q OR c.email LIKE :q)', {
        q: `%${search}%`,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: +page, limit: +limit };
  }

  @Get('lookup/:doc')
  @ApiOperation({ summary: 'Lookup RENIEC/SUNAT by DNI (8 digits) or RUC (11 digits)' })
  async lookupDoc(@Param('doc') doc: string) {
    const clean = doc.trim();

    // 1. Check local DB first
    const existing = await this.customerRepo.findOne({ where: { nit: clean } });
    if (existing) {
      return { source: 'db', data: existing };
    }

    const token = process.env.APISPERU_TOKEN || '';

    // 2. DNI → RENIEC
    if (clean.length === 8) {
      try {
        let res = await fetch(
          `https://dniruc.apisperu.com/api/v1/dni/${clean}?token=${token}`,
          { headers: { 'Accept': 'application/json' } },
        );
        let json = await res.json().catch(() => null);

        // Fallback retry if token limits reached or missing result
        if (!json || (!json.nombres && !json.apellidoPaterno)) {
          res = await fetch(`https://api.perudevs.com/api/v1/dni/complete?document=${clean}&key=cGVydWRldnMucHJvZHVjdGlvbi5zdW5hdC5jb2RleS42NjQ1MWJmZjEwNjI2YTE1NTE2ZDMwOGY`).catch(() => null) as any;
          if (res && res.ok) {
            json = await res.json().catch(() => null);
            if (json && json.resultado) {
              const name = `${json.resultado.apellido_paterno || ''} ${json.resultado.apellido_materno || ''} ${json.resultado.nombres || ''}`.trim();
              if (name) {
                return {
                  source: 'api',
                  data: { nit: clean, name, address: '' },
                };
              }
            }
          }
        } else if (json.nombres || json.apellidoPaterno) {
          const name = `${json.apellidoPaterno || ''} ${json.apellidoMaterno || ''} ${json.nombres || ''}`.trim();
          return {
            source: 'api',
            data: { nit: clean, name, address: '' },
          };
        }
      } catch (e) { }
    }

    // 3. RUC → SUNAT
    if (clean.length === 11) {
      try {
        const res = await fetch(
          `https://dniruc.apisperu.com/api/v1/ruc/${clean}?token=${token}`,
          { headers: { 'Accept': 'application/json' } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // Response: { razonSocial, direccion, ruc, ... }
        if (json.razonSocial) {
          return {
            source: 'api',
            data: {
              nit: clean,
              name: json.razonSocial,
              address: json.direccion || '',
            },
          };
        }
      } catch (e) { }
    }

    return { source: 'not_found', data: null };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const cust = await this.customerRepo.findOne({ where: { id } });
    if (!cust) throw new NotFoundException(`Customer #${id} not found`);
    return cust;
  }

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  create(@Body() dto: CreateCustomerDto) {
    const cust = this.customerRepo.create(dto);
    return this.customerRepo.save(cust);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update customer' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    const cust = await this.customerRepo.findOne({ where: { id } });
    if (!cust) throw new NotFoundException(`Customer #${id} not found`);
    Object.assign(cust, dto);
    return this.customerRepo.save(cust);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete customer' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const cust = await this.customerRepo.findOne({ where: { id } });
    if (!cust) throw new NotFoundException(`Customer #${id} not found`);
    cust.isActive = false;
    return this.customerRepo.save(cust);
  }
}
