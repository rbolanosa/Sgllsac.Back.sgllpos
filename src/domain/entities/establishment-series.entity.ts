import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import type { EstablishmentEntity } from './establishment.entity';

@Entity('establishment_series')
@Unique(['establishmentId', 'tipo'])
@Unique(['serie'])
export class EstablishmentSeriesEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'establishment_id', type: 'int' })
  establishmentId: number;

  @ManyToOne('EstablishmentEntity', 'series', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: EstablishmentEntity;

  @Column({ type: 'varchar', length: 50, comment: 'factura, boleta, nota_credito, etc.' })
  tipo: string;

  @Column({ type: 'varchar', length: 10, comment: 'F001, B001, FC01, etc.' })
  serie: string;

  @Column({ name: 'correlativo_actual', type: 'int', default: 1 })
  correlativoActual: number;

  @Column({ name: 'correlativo_inicial', type: 'int', default: 1 })
  correlativoInicial: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
