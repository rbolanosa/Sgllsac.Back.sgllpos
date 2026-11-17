import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** Factura de compra cargada desde texto. Evita cargar dos veces la misma factura. */
@Entity('stock_entries')
@Index('UQ_stock_entries_invoice', ['supplierRuc', 'invoiceNumber'], { unique: true })
export class StockEntryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number | null;

  @Column({ name: 'supplier_ruc', type: 'varchar', length: 11 })
  supplierRuc: string;

  @Column({ name: 'supplier_name', type: 'varchar', length: 200 })
  supplierName: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 30 })
  invoiceNumber: string;

  @Column({ name: 'invoice_date', type: 'date', nullable: true })
  invoiceDate: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'purchase_order_id', nullable: true })
  purchaseOrderId: number | null;

  @Column({ name: 'lines_count', type: 'int', default: 0 })
  linesCount: number;

  @Column({ name: 'new_products', type: 'int', default: 0 })
  newProducts: number;

  @Column({ name: 'created_by', nullable: true })
  createdBy: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
