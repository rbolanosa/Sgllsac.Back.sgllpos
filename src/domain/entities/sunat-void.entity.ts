import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Comunicación de baja (RA) de una factura. SUNAT la procesa aparte: la venta se anula
 * en el sistema (stock de vuelta) recién cuando SUNAT la acepta.
 */
@Entity('sunat_voids')
@Index('IDX_sunat_voids_sale', ['saleId'])
export class SunatVoidEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sale_id', type: 'int' })
  saleId: number;

  @Column({ name: 'apisunat_id', type: 'int', nullable: true })
  apisunatId: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  identifier: string | null;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  /** PENDIENTE (en SUNAT), ACEPTADO, RECHAZADO */
  @Column({ type: 'varchar', length: 12, default: 'PENDIENTE' })
  status: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
