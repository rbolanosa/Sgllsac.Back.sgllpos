import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../domain/entities/product.entity';
import { InventoryMovementEntity, MovementType, MovementReferenceType } from '../../domain/entities/inventory-movement.entity';
import { CreateProductDto, UpdateProductDto, StockAdjustmentDto } from '../../application/dtos/product.dto';

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  supplierId?: number;
  isActive?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly movementRepo: Repository<InventoryMovementEntity>,
  ) {}

  async findAll(filters: ProductFilters = {}) {
    const { search, categoryId, supplierId, isActive, lowStock, page = 1, limit = 50 } = filters;
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.supplier', 's');

    if (search) {
      qb.andWhere('(p.name LIKE :s OR p.barcode LIKE :s OR p.sku LIKE :s)', { s: `%${search}%` });
    }
    if (categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId });
    if (supplierId) qb.andWhere('p.supplierId = :supplierId', { supplierId });
    if (isActive !== undefined) qb.andWhere('p.isActive = :isActive', { isActive });
    if (lowStock) qb.andWhere('p.stockQuantity <= p.minStockLevel');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('p.name', 'ASC')
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(id: number): Promise<ProductEntity> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException(`Product #${id} not found`);
    return product;
  }

  async findByBarcode(barcode: string): Promise<ProductEntity> {
    const product = await this.productRepo.findOne({
      where: { barcode, isActive: true },
      relations: { category: true },
    });
    if (!product) throw new NotFoundException(`Product with barcode "${barcode}" not found`);
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductEntity> {
    if (dto.barcode) {
      const exists = await this.productRepo.findOne({ where: { barcode: dto.barcode } });
      if (exists) throw new ConflictException(`Barcode "${dto.barcode}" already registered`);
    }
    if (dto.sku) {
      const exists = await this.productRepo.findOne({ where: { sku: dto.sku } });
      if (exists) throw new ConflictException(`SKU "${dto.sku}" already registered`);
    }
    const product = this.productRepo.create(dto);
    return this.productRepo.save(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.findById(id);
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findById(id);
    product.isActive = false;
    await this.productRepo.save(product);
  }

  async adjustStock(
    id: number,
    dto: StockAdjustmentDto,
    type: MovementType,
    performedBy?: number,
  ): Promise<ProductEntity> {
    const product = await this.findById(id);

    if (type === MovementType.OUT && product.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stockQuantity}, requested: ${dto.quantity}`,
      );
    }

    const delta = type === MovementType.IN ? dto.quantity : -dto.quantity;
    product.stockQuantity = Number(product.stockQuantity) + delta;
    await this.productRepo.save(product);

    await this.movementRepo.save(
      this.movementRepo.create({
        productId: id,
        movementType: type,
        quantity: dto.quantity,
        referenceType: MovementReferenceType.MANUAL,
        notes: dto.notes,
        performedBy,
      }),
    );

    return product;
  }

  async getLowStockProducts() {
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.stockQuantity <= p.minStockLevel')
      .leftJoinAndSelect('p.category', 'c')
      .orderBy('p.stockQuantity', 'ASC')
      .getMany();
  }
}
