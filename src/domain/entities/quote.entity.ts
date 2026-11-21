import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type QuoteStatus = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'ANULADA' | 'VENDIDA';
/** Estados que se pueden poner a mano. VENDIDA solo la pone el POS al emitir el comprobante. */
export const QUOTE_STATUSES: QuoteStatus[] = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'ANULADA'];

export interface QuoteItem {
  productId: number | null;
  /** Presentación con la que se cotizó: U unidad, B caja, P<id> otra (como en el POS) */
  optionKey?: string;
  optionLabel?: string;
  /** Unidades base que trae esa presentación */
  factor?: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** Cotización para un cliente. No mueve stock, no genera venta ni comprobante SUNAT. */
@Entity('quotes')
@Index('UQ_quotes_public_token', ['publicToken'], { unique: true })
export class QuoteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  number: string | null;

  @Column({ name: 'customer_id', type: 'int', nullable: true })
  customerId: number | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200 })
  customerName: string;

  @Column({ name: 'customer_doc', type: 'varchar', length: 20, nullable: true })
  customerDoc: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 20, nullable: true })
  customerPhone: string | null;

  @Column({ name: 'customer_address', type: 'varchar', length: 300, nullable: true })
  customerAddress: string | null;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'valid_until', type: 'date' })
  validUntil: string;

  @Column({ type: 'varchar', length: 12, default: 'PENDIENTE' })
  status: QuoteStatus;

  @Column({ name: 'items_json', type: 'longtext' })
  itemsJson: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxable: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Comprobante con el que se vendió */
  @Column({ name: 'sale_ref', type: 'varchar', length: 30, nullable: true })
  saleRef: string | null;

  @Column({ name: 'public_token', type: 'varchar', length: 40 })
  publicToken: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
