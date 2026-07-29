import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { CashSessionEntity } from './cash-session.entity';
import { UserEntity } from './user.entity';

export enum CashMovementType {
  OPENING        = 'opening',        // Monto inicial al abrir
  SALE_CASH      = 'sale_cash',      // Ingreso por venta en efectivo
  SALE_CARD      = 'sale_card',      // Venta con tarjeta (referencial)
  SALE_TRANSFER  = 'sale_transfer',  // Venta con transferencia (referencial)
  SALE_YAPE      = 'sale_yape',      // Venta con Yape
  SALE_PLIN      = 'sale_plin',      // Venta con Plin
  SALE_MIXED     = 'sale_mixed',     // Venta mixta
  WITHDRAWAL     = 'withdrawal',     // Retiro de efectivo (para depósito)
  DEPOSIT        = 'deposit',        // Depósito/ingreso adicional
  EXPENSE        = 'expense',        // Gasto menor (taxi, propina, etc.)
  REFUND         = 'refund',         // Devolución al cliente
  CLOSING        = 'closing',        // Cierre de sesión
}

@Entity('cash_movements')
export class CashMovementEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId: number;

  @ManyToOne(() => CashSessionEntity, (s) => s.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: CashSessionEntity;

  @Column({ name: 'type', type: 'enum', enum: CashMovementType })
  type: CashMovementType;

  @Column({ name: 'amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'description', type: 'varchar', length: 300, nullable: true })
  description: string | null;

  @Column({ name: 'reference_id', type: 'int', nullable: true })
  referenceId: number | null;  // sale_id cuando viene de una venta

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
