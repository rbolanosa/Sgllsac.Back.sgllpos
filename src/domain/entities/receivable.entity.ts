import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany, ManyToOne, JoinColumn,
} from 'typeorm';

export type ReceivableStatus = 'PENDIENTE' | 'PAGADA' | 'ANULADA';

/**
 * Deuda de una venta al crédito (factura con cuotas o nota de venta "fiada").
 * El saldo es total - pagado; ANULADA cuando la venta se anula o se le hace nota de crédito.
 */
@Entity('receivables')
@Index('UQ_receivables_sale', ['saleId'], { unique: true })
export class ReceivableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sale_id', type: 'int' })
  saleId: number;

  @Column({ name: 'customer_id', type: 'int' })
  customerId: number;

  @Column({ name: 'document_number', type: 'varchar', length: 30 })
  documentNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paid: number;

  @Column({ type: 'varchar', length: 12, default: 'PENDIENTE' })
  status: ReceivableStatus;

  @OneToMany(() => ReceivableInstallmentEntity, (i) => i.receivable)
  installments: ReceivableInstallmentEntity[];

  @OneToMany(() => ReceivablePaymentEntity, (p) => p.receivable)
  payments: ReceivablePaymentEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/** Cuota con su fecha de pago (las que van en la factura a SUNAT) */
@Entity('receivable_installments')
export class ReceivableInstallmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'receivable_id', type: 'int' })
  receivableId: number;

  @ManyToOne(() => ReceivableEntity, (r) => r.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receivable_id' })
  receivable: ReceivableEntity;

  @Column({ type: 'int' })
  number: number;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidAmount: number;

  /** Texto si la cuota no salió de la venta (p. ej. una nota de débito) */
  @Column({ type: 'varchar', length: 120, nullable: true })
  note: string | null;
}

/** Abono del cliente */
@Entity('receivable_payments')
export class ReceivablePaymentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'receivable_id', type: 'int' })
  receivableId: number;

  @ManyToOne(() => ReceivableEntity, (r) => r.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receivable_id' })
  receivable: ReceivableEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  method: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  note: string | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
