import { Repository } from 'typeorm';
import { ProductEntity } from '../../domain/entities/product.entity';
import { InventoryMovementEntity, MovementType } from '../../domain/entities/inventory-movement.entity';
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
export declare class ProductService {
    private readonly productRepo;
    private readonly movementRepo;
    constructor(productRepo: Repository<ProductEntity>, movementRepo: Repository<InventoryMovementEntity>);
    findAll(filters?: ProductFilters): Promise<{
        data: ProductEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: number): Promise<ProductEntity>;
    findByBarcode(barcode: string): Promise<ProductEntity>;
    create(dto: CreateProductDto): Promise<ProductEntity>;
    update(id: number, dto: UpdateProductDto): Promise<ProductEntity>;
    remove(id: number): Promise<void>;
    adjustStock(id: number, dto: StockAdjustmentDto, type: MovementType, performedBy?: number): Promise<ProductEntity>;
    getLowStockProducts(): Promise<ProductEntity[]>;
}
