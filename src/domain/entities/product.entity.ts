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
import { CategoryEntity } from './category.entity';
import { SupplierEntity } from './supplier.entity';

export enum ProductUnit {
  PIECE = 'piece',
  KG = 'kg',
  LITER = 'liter',
  BOX = 'box',
  DOZEN = 'dozen',
  PACK = 'pack',
}

@Entity('products')
@Index('IDX_products_barcode', ['barcode'], { unique: true, where: 'barcode IS NOT NULL' })
@Index('IDX_products_sku', ['sku'], { unique: true, where: 'sku IS NOT NULL' })
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => CategoryEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number | null;

  @ManyToOne(() => SupplierEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierEntity;

  @Column({ type: 'enum', enum: ProductUnit, default: ProductUnit.PIECE })
  unit: ProductUnit;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  costPrice: number;

  @Column({ name: 'sale_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  salePrice: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 12.0 })
  taxRate: number;

  @Column({ name: 'stock_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 })
  stockQuantity: number;

  @Column({ name: 'min_stock_level', type: 'decimal', precision: 10, scale: 3, default: 0 })
  minStockLevel: number;

  @Column({ name: 'max_stock_level', type: 'decimal', precision: 10, scale: 3, nullable: true })
  maxStockLevel: number | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
