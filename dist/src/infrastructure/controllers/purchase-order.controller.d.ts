import { PurchaseOrderService } from '../../domain/services/purchase-order.service';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from '../../application/dtos/purchase-order.dto';
import { PurchaseOrderStatus } from '../../domain/entities/purchase-order.entity';
export declare class PurchaseOrderController {
    private readonly poService;
    constructor(poService: PurchaseOrderService);
    findAll(page?: number, limit?: number, status?: PurchaseOrderStatus): Promise<{
        data: import("../../domain/entities/purchase-order.entity").PurchaseOrderEntity[];
        total: number;
        page: number;
        limit: number;
    }>;
    findOne(id: number): Promise<import("../../domain/entities/purchase-order.entity").PurchaseOrderEntity>;
    create(dto: CreatePurchaseOrderDto): Promise<import("../../domain/entities/purchase-order.entity").PurchaseOrderEntity>;
    receive(id: number, dto: ReceivePurchaseOrderDto): Promise<import("../../domain/entities/purchase-order.entity").PurchaseOrderEntity>;
    cancel(id: number): Promise<import("../../domain/entities/purchase-order.entity").PurchaseOrderEntity>;
}
