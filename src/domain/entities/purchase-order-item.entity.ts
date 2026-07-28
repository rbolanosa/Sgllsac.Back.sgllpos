import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PurchaseOrderEntity } from './purchase-order.entity';
import { ProductEntity } from './product.entity';

export enum PurchaseUnit {
  UNIT = 'unit',
  BOX  = 'box',
}

@Entity('purchase_order_items')
export class PurchaseOrderItemEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'purchase_order_id' })
  purchaseOrderId: number;

  @ManyToOne(() => PurchaseOrderEntity, (po) => po.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrderEntity;

  @Column({ name: 'product_id', nullable: true })
  productId: number | null;

  @ManyToOne(() => ProductEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  /**
   * Indica si la compra se hizo por caja o por unidad.
   * 'box'  → boxesOrdered y boxCost son los datos primarios
   * 'unit' → quantityOrdered y unitCost son los datos primarios
   */
  @Column({
    name: 'purchase_unit',
    type: 'enum',
    enum: PurchaseUnit,
    default: PurchaseUnit.UNIT,
  })
  purchaseUnit: PurchaseUnit;

  /**
   * Cajas ordenadas al proveedor (solo cuando purchaseUnit = 'box').
   * La cantidad en unidades se calcula: boxesOrdered × product.unitsPerBox
   */
  @Column({ name: 'boxes_ordered', type: 'decimal', precision: 10, scale: 3, nullable: true })
  boxesOrdered: number | null;

  /**
   * Costo por caja al momento de la compra (solo cuando purchaseUnit = 'box').
   * El costo unitario se calcula: boxCost / product.unitsPerBox
   */
  @Column({ name: 'box_cost', type: 'decimal', precision: 10, scale: 4, nullable: true })
  boxCost: number | null;

  /** Cantidad total en UNIDADES individuales (siempre, independiente de purchaseUnit) */
  @Column({ name: 'quantity_ordered', type: 'decimal', precision: 10, scale: 3 })
  quantityOrdered: number;

  @Column({ name: 'quantity_received', type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantityReceived: number;

  /** Costo por UNIDAD individual (siempre, independiente de purchaseUnit) */
  @Column({ name: 'unit_cost', type: 'decimal', precision: 10, scale: 4 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  subtotal: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

