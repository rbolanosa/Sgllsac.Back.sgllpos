import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';

export enum MovementType {
  IN = 'in',
  OUT = 'out',
  ADJUSTMENT = 'adjustment',
  LOSS = 'loss',
}

export enum MovementReferenceType {
  SALE = 'sale',
  PURCHASE_ORDER = 'purchase_order',
  MANUAL = 'manual',
  INITIAL = 'initial',
}

@Entity('inventory_movements')
export class InventoryMovementEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ name: 'movement_type', type: 'enum', enum: MovementType })
  movementType: MovementType;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ name: 'reference_type', type: 'enum', enum: MovementReferenceType })
  referenceType: MovementReferenceType;

  @Column({ name: 'reference_id', nullable: true })
  referenceId: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'performed_by', nullable: true })
  performedBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
