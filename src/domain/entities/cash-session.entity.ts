import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { EstablishmentEntity } from './establishment.entity';
import type { CashMovementEntity } from './cash-movement.entity';

export enum CashSessionStatus {
  OPEN   = 'open',
  CLOSED = 'closed',
}

@Entity('cash_sessions')
export class CashSessionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'cashier_id', type: 'int' })
  cashierId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cashier_id' })
  cashier: UserEntity;

  @Column({ name: 'establishment_id', type: 'int', nullable: true })
  establishmentId: number | null;

  @ManyToOne(() => EstablishmentEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'establishment_id' })
  establishment: EstablishmentEntity;

  @Column({ name: 'status', type: 'enum', enum: CashSessionStatus, default: CashSessionStatus.OPEN })
  status: CashSessionStatus;

  @Column({ name: 'opening_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  openingAmount: number;

  @Column({ name: 'expected_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  expectedAmount: number;

  @Column({ name: 'closing_amount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  closingAmount: number | null;

  @Column({ name: 'difference', type: 'decimal', precision: 12, scale: 2, nullable: true })
  difference: number | null;

  @Column({ name: 'closing_notes', type: 'text', nullable: true })
  closingNotes: string | null;

  @Column({ name: 'opened_at', type: 'timestamp' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @OneToMany('CashMovementEntity', 'session')
  movements: CashMovementEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
