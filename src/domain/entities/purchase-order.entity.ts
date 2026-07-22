import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { SupplierEntity } from './supplier.entity';
import { PurchaseOrderItemEntity } from './purchase-order-item.entity';

export enum PurchaseOrderStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
}

@Entity('purchase_orders')
@Index('IDX_purchase_orders_order_number', ['orderNumber'], { unique: true })
export class PurchaseOrderEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_number', type: 'varchar', length: 20, unique: true })
  orderNumber: string;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number | null;

  @ManyToOne(() => SupplierEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierEntity;

  @Column({ name: 'ordered_by', nullable: true })
  orderedBy: number | null;

  @Column({ name: 'received_by', nullable: true })
  receivedBy: number | null;

  @Column({ name: 'order_date', type: 'timestamp' })
  orderDate: Date;

  @Column({ name: 'received_date', type: 'timestamp', nullable: true })
  receivedDate: Date | null;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.PENDING })
  status: PurchaseOrderStatus;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 4, default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => PurchaseOrderItemEntity, (item) => item.purchaseOrder, { cascade: true })
  items: PurchaseOrderItemEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
