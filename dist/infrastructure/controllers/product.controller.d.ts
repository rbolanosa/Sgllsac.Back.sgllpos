import { ProductService } from '../../domain/services/product.service';
import { CreateProductDto, UpdateProductDto, StockAdjustmentDto } from '../../application/dtos/product.dto';
export declare class ProductController {
    private readonly productService;
    constructor(productService: ProductService);
    findAll(search?: string, categoryId?: number, supplierId?: number, isActive?: boolean, lowStock?: boolean, page?: number, limit?: number): Promise<{
        data: import("../../domain/entities/product.entity").ProductEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    getLowStock(): Promise<import("../../domain/entities/product.entity").ProductEntity[]>;
    findByBarcode(barcode: string): Promise<import("../../domain/entities/product.entity").ProductEntity>;
    findOne(id: number): Promise<import("../../domain/entities/product.entity").ProductEntity>;
    create(dto: CreateProductDto): Promise<import("../../domain/entities/product.entity").ProductEntity>;
    update(id: number, dto: UpdateProductDto): Promise<import("../../domain/entities/product.entity").ProductEntity>;
    remove(id: number): Promise<void>;
    addStock(id: number, dto: StockAdjustmentDto): Promise<import("../../domain/entities/product.entity").ProductEntity>;
    subtractStock(id: number, dto: StockAdjustmentDto): Promise<import("../../domain/entities/product.entity").ProductEntity>;
}
