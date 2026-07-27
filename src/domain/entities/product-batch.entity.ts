import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductEntity } from './product.entity';
import { SupplierEntity } from './supplier.entity';

@Entity('product_batches')
@Index('IDX_batches_product_id', ['productId'])
export class ProductBatchEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number | null;

  @ManyToOne(() => SupplierEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierEntity | null;

  @Column({ name: 'document_ref', type: 'varchar', length: 100, nullable: true })
  documentRef: string | null;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  costPrice: number;

  @Column({ name: 'initial_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 })
  initialQuantity: number;

  @Column({ name: 'current_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 })
  currentQuantity: number;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
