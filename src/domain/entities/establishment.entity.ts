import {
  Entity, PrimaryGeneratedColumn, Column, Unique,
  CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { CompanySettingsEntity } from './company-settings.entity';
import type { EstablishmentSeriesEntity } from './establishment-series.entity';

@Entity('establishments')
@Unique('UQ_establishment_company_cod_local', ['companySettingsId', 'codLocal'])
export class EstablishmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_settings_id', type: 'int', default: 1 })
  companySettingsId: number;

  @ManyToOne(() => CompanySettingsEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_settings_id' })
  companySettings: CompanySettingsEntity;

  @Column({ type: 'varchar', length: 150 })
  nombre: string;

  @Column({ name: 'cod_local', type: 'varchar', length: 10, default: '0000' })
  codLocal: string;

  @Column({ type: 'text', nullable: true })
  direccion: string;

  @Column({ type: 'varchar', length: 6, nullable: true })
  ubigeo: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  departamento: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provincia: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  distrito: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string;

  @Column({ name: 'es_principal', type: 'boolean', default: false })
  esPrincipal: boolean;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @OneToMany('EstablishmentSeriesEntity', 'establishment')
  series: EstablishmentSeriesEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
