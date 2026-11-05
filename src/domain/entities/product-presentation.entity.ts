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

/**
 * Presentación adicional de un producto (ej: Kilo, Paquete).
 * El stock sigue siendo uno solo, en la unidad base del producto: `factor` indica
 * cuántas unidades base descuenta vender una presentación.
 * La unidad base y el empaque principal (hasBoxPresentation) viven en ProductEntity.
 */
@Entity('product_presentations')
export class ProductPresentationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => ProductEntity, (product) => product.presentations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  factor: number;

  @Column({ name: 'sale_price', type: 'decimal', precision: 10, scale: 4 })
  salePrice: number;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode: string | null;

  /** Catálogo Nº 3 SUNAT */
  @Column({ name: 'sunat_unit', type: 'varchar', length: 10, default: 'NIU' })
  sunatUnit: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
