import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrderEntity } from './purchase-order.entity';
import { ProductEntity } from './product.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @ManyToOne(() => PurchaseOrderEntity, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrderEntity;

  @Column({ name: 'product_id', nullable: true })
  productId: number | null;

  @ManyToOne(() => ProductEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ name: 'quantity_ordered', type: 'decimal', precision: 10, scale: 3 })
  quantityOrdered: number;

  @Column({ name: 'quantity_received', type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantityReceived: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 4 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  subtotal: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
