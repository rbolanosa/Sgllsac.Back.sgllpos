import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SaleEntity } from './sale.entity';
import { ProductEntity } from './product.entity';

@Entity('sale_items')
export class SaleItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sale_id' })
  saleId: number;

  @ManyToOne(() => SaleEntity, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: SaleEntity;

  @Column({ name: 'product_id', nullable: true })
  productId: number | null;

  @ManyToOne(() => ProductEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ name: 'product_name', type: 'varchar', length: 200 })
  productName: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 4 })
  unitPrice: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  subtotal: number;

  @Column({ name: 'presentation_id', type: 'int', nullable: true })
  presentationId: number | null;

  /** Nombre de la presentación vendida (ej: Caja, Kilo). Null = unidad base */
  @Column({ name: 'presentation_name', type: 'varchar', length: 50, nullable: true })
  presentationName: string | null;

  /** Catálogo Nº 3 SUNAT de lo vendido, cuando difiere de la unidad del producto */
  @Column({ name: 'sunat_unit', type: 'varchar', length: 10, nullable: true })
  sunatUnit: string | null;

  /** Unidades base que salieron del stock: es lo que debe volver al anular */
  @Column({ name: 'units_deducted', type: 'decimal', precision: 12, scale: 3, nullable: true })
  unitsDeducted: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
