import { Repository } from 'typeorm';
import { ProductEntity } from '../entities/product.entity';
import { InventoryMovementEntity, MovementType } from '../entities/inventory-movement.entity';
import { CategoryEntity } from '../entities/category.entity';
import { SupplierEntity } from '../entities/supplier.entity';
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
export interface ImportResult {
    total: number;
    created: number;
    updated: number;
    errors: {
        row: number;
        sku: string;
        message: string;
    }[];
    results: {
        row: number;
        sku: string;
        name: string;
        status: 'created' | 'updated' | 'error';
        message?: string;
    }[];
}
export declare class ProductService {
    private readonly productRepo;
    private readonly movementRepo;
    private readonly categoryRepo;
    private readonly supplierRepo;
    constructor(productRepo: Repository<ProductEntity>, movementRepo: Repository<InventoryMovementEntity>, categoryRepo: Repository<CategoryEntity>, supplierRepo: Repository<SupplierEntity>);
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
    generateExcelTemplate(): Promise<Buffer>;
    importFromExcel(fileBuffer: Buffer): Promise<ImportResult>;
}
