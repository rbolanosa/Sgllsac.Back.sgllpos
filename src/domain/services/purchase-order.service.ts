import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrderEntity, PurchaseOrderStatus } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../../domain/entities/purchase-order-item.entity';
import { ProductEntity } from '../../domain/entities/product.entity';
import {
  InventoryMovementEntity,
  MovementType,
  MovementReferenceType,
} from '../../domain/entities/inventory-movement.entity';
import { CreatePurchaseOrderDto, ReceivePurchaseOrderDto } from '../../application/dtos/purchase-order.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @InjectRepository(PurchaseOrderEntity)
    private readonly poRepo: Repository<PurchaseOrderEntity>,
    @InjectRepository(PurchaseOrderItemEntity)
    private readonly poItemRepo: Repository<PurchaseOrderItemEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly movementRepo: Repository<InventoryMovementEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters: { page?: number; limit?: number; status?: PurchaseOrderStatus } = {}) {
    const { page = 1, limit = 30, status } = filters;
    const qb = this.poRepo
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 's')
      .leftJoinAndSelect('po.items', 'i')
      .leftJoinAndSelect('i.product', 'p');

    if (status) qb.andWhere('po.status = :status', { status });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('po.orderDate', 'DESC')
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findById(id: number): Promise<PurchaseOrderEntity> {
    const po = await this.poRepo.findOne({
      where: { id },
      relations: { supplier: true, items: { product: true } },
    });
    if (!po) throw new NotFoundException(`Purchase Order #${id} not found`);
    return po;
  }

  async create(dto: CreatePurchaseOrderDto, orderedBy?: number): Promise<PurchaseOrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      const orderNumber = await this.generateOrderNumber(manager);
      let totalAmount = 0;

      const po = manager.create(PurchaseOrderEntity, {
        orderNumber,
        supplierId: dto.supplierId ?? null,
        orderedBy: orderedBy ?? null,
        orderDate: new Date(),
        status: PurchaseOrderStatus.PENDING,
        notes: dto.notes ?? null,
        totalAmount: 0,
      });
      const savedPo = await manager.save(po);

      for (const item of dto.items) {
        const product = await manager.findOne(ProductEntity, { where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Product #${item.productId} not found`);

        const subtotal = item.quantityOrdered * item.unitCost;
        totalAmount += subtotal;

        await manager.save(
          manager.create(PurchaseOrderItemEntity, {
            purchaseOrderId: savedPo.id,
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: 0,
            unitCost: item.unitCost,
            subtotal,
          }),
        );
      }

      savedPo.totalAmount = totalAmount;
      return manager.save(savedPo);
    });
  }

  async receive(id: number, dto: ReceivePurchaseOrderDto, receivedBy?: number): Promise<PurchaseOrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      const po = await manager.findOne(PurchaseOrderEntity, {
        where: { id },
        relations: { items: true },
      });
      if (!po) throw new NotFoundException(`Purchase Order #${id} not found`);
      if (po.status === PurchaseOrderStatus.RECEIVED) {
        throw new BadRequestException('This purchase order has already been fully received');
      }
      if (po.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException('Cannot receive a cancelled purchase order');
      }

      for (const recv of dto.items) {
        const poItem = po.items.find((i) => i.id === recv.itemId);
        if (!poItem) throw new NotFoundException(`PO Item #${recv.itemId} not found`);

        const remaining = Number(poItem.quantityOrdered) - Number(poItem.quantityReceived);
        const toReceive = Math.min(recv.quantityReceived, remaining);
        if (toReceive <= 0) continue;

        poItem.quantityReceived = Number(poItem.quantityReceived) + toReceive;
        await manager.save(poItem);

        if (poItem.productId) {
          const product = await manager.findOne(ProductEntity, { where: { id: poItem.productId } });
          if (product) {
            product.stockQuantity = Number(product.stockQuantity) + toReceive;
            product.costPrice = Number(poItem.unitCost);
            await manager.save(product);

            await manager.save(
              manager.create(InventoryMovementEntity, {
                productId: product.id,
                movementType: MovementType.IN,
                quantity: toReceive,
                referenceType: MovementReferenceType.PURCHASE_ORDER,
                referenceId: po.id,
                notes: `Received from PO ${po.orderNumber}`,
                performedBy: receivedBy,
              }),
            );
          }
        }
      }

      // Determine new status
      const allReceived = po.items.every(
        (i) => Number(i.quantityReceived) >= Number(i.quantityOrdered),
      );
      po.status = allReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIAL;
      po.receivedDate = new Date();
      po.receivedBy = receivedBy ?? null;
      if (dto.notes) po.notes = dto.notes;

      return manager.save(po);
    });
  }

  async cancel(id: number): Promise<PurchaseOrderEntity> {
    const po = await this.findById(id);
    if (po.status !== PurchaseOrderStatus.PENDING) {
      throw new BadRequestException('Only pending purchase orders can be cancelled');
    }
    po.status = PurchaseOrderStatus.CANCELLED;
    return this.poRepo.save(po);
  }

  private async generateOrderNumber(manager: any): Promise<string> {
    const last = await manager
      .createQueryBuilder(PurchaseOrderEntity, 'po')
      .orderBy('po.id', 'DESC')
      .getOne();
    const nextNum = last ? last.id + 1 : 1;
    return `PO-${String(nextNum).padStart(6, '0')}`;
  }
}
