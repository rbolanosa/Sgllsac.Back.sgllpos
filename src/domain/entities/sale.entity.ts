import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomerEntity } from './customer.entity';
import { SaleItemEntity } from './sale-item.entity';
import { UserEntity } from './user.entity';

export enum PaymentMethod {
  CASH     = 'cash',
  CARD     = 'card',
  TRANSFER = 'transfer',
  MIXED    = 'mixed',
  YAPE     = 'yape',
  PLIN     = 'plin',
  DEPOSIT  = 'deposit',
}

export enum SaleStatus {
  COMPLETED = 'completed',
  VOIDED = 'voided',
  REFUNDED = 'refunded',
}

export enum DocumentType {
  FACTURA      = 'factura',       // Serie F001 - clientes con RUC
  BOLETA       = 'boleta',        // Serie B001 - consumidor final / DNI
  NOTA_VENTA   = 'nota_venta',    // Control interno - no va a SUNAT
  NOTA_CREDITO = 'nota_credito',  // Anula o reduce factura/boleta
  NOTA_DEBITO  = 'nota_debito',   // Aumenta factura/boleta
}

@Entity('sales')
@Index('IDX_sales_invoice_number', ['invoiceNumber'], { unique: true })
export class SaleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'invoice_number', type: 'varchar', length: 20, unique: true })
  invoiceNumber: string;

  @Column({ name: 'document_type', type: 'enum', enum: DocumentType, default: DocumentType.BOLETA })
  documentType: DocumentType;

  @Column({ name: 'related_document_id', type: 'int', nullable: true })
  relatedDocumentId: number | null;

  @Column({ name: 'credit_note_reason', type: 'varchar', length: 300, nullable: true })
  creditNoteReason: string | null;

  @Column({ name: 'customer_id', nullable: true })
  customerId: number | null;

  @ManyToOne(() => CustomerEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: CustomerEntity;

  @Column({ name: 'cashier_id', nullable: true })
  cashierId: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'cashier_id' })
  cashier: UserEntity;

  @Column({ name: 'sale_date', type: 'timestamp' })
  saleDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  subtotal: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 12, scale: 4, default: 0 })
  taxAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 4, default: 0 })
  discountAmount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 12, scale: 4, default: 0 })
  totalAmount: number;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod: PaymentMethod;

  @Column({ name: 'amount_tendered', type: 'decimal', precision: 12, scale: 4, nullable: true })
  amountTendered: number | null;

  @Column({ name: 'change_given', type: 'decimal', precision: 12, scale: 4, nullable: true })
  changeGiven: number | null;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'dte_number', type: 'varchar', length: 100, nullable: true })
  dteNumber: string | null;

  @Column({ name: 'sunat_status', type: 'varchar', length: 50, nullable: true })
  sunatStatus: string | null;

  @Column({ name: 'sunat_message', type: 'text', nullable: true })
  sunatMessage: string | null;

  @Column({ name: 'xml_url', type: 'varchar', length: 500, nullable: true })
  xmlUrl: string | null;

  @Column({ name: 'cdr_url', type: 'varchar', length: 500, nullable: true })
  cdrUrl: string | null;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl: string | null;

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode: string | null;

  @OneToMany(() => SaleItemEntity, (item) => item.sale, { cascade: true, eager: false })
  items: SaleItemEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
