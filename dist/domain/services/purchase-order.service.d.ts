import { Repository, DataSource } from 'typeorm';
import { PurchaseOrderEntity, PurchaseOrderStatus } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../../domain/entities/purchase-order-item.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import { InventoryMovementEntity } from '../../domain/entities/inventory-movement.entity';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from '../../application/dtos/purchase-order.dto';
export declare class PurchaseOrderService {
    private readonly poRepo;
    private readonly poItemRepo;
    private readonly productRepo;
    private readonly movementRepo;
    private readonly dataSource;
    constructor(poRepo: Repository<PurchaseOrderEntity>, poItemRepo: Repository<PurchaseOrderItemEntity>, productRepo: Repository<ProductEntity>, movementRepo: Repository<InventoryMovementEntity>, dataSource: DataSource);
    findAll(filters?: {
        page?: number;
        limit?: number;
        status?: PurchaseOrderStatus;
    }): Promise<{
        data: PurchaseOrderEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    findById(id: number): Promise<PurchaseOrderEntity>;
    create(dto: CreatePurchaseOrderDto, orderedBy?: number): Promise<PurchaseOrderEntity>;
    receive(id: number, dto: ReceivePurchaseOrderDto, receivedBy?: number): Promise<PurchaseOrderEntity>;
    cancel(id: number): Promise<PurchaseOrderEntity>;
    private generateOrderNumber;
}
