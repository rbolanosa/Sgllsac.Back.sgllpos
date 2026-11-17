import { Entity, PrimaryGeneratedColumn, Column, Index, UpdateDateColumn } from 'typeorm';

/**
 * Recuerda qué producto del catálogo corresponde a cada línea de un proveedor
 * (por su código o, si no trae código, por la descripción normalizada).
 */
@Entity('supplier_product_maps')
@Index('UQ_supplier_product_maps_key', ['supplierRuc', 'matchKey'], { unique: true })
export class SupplierProductMapEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_ruc', type: 'varchar', length: 11 })
  supplierRuc: string;

  /** 'C:<codigo>' o 'D:<descripcion normalizada>' */
  @Column({ name: 'match_key', type: 'varchar', length: 255 })
  matchKey: string;

  @Column({ name: 'product_id' })
  productId: number;

  /** Unidades por empaque de esa línea del proveedor */
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  factor: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
