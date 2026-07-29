import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CategoryEntity } from './category.entity';
import { SupplierEntity } from './supplier.entity';

/**
 * Catálogo Nº 3 SUNAT - Unidades de Medida
 * Obligatorio en el XML de comprobantes electrónicos (campo "unidad")
 */
export enum ProductUnit {
  // ─── Bienes ─────────────────────────────────────────
  NIU = 'NIU',   // Unidad (pieza, unidad genérica) ← más común
  KGM = 'KGM',   // Kilogramo
  GRM = 'GRM',   // Gramo
  LTR = 'LTR',   // Litro
  MLT = 'MLT',   // Mililitro
  MTR = 'MTR',   // Metro lineal
  CMT = 'CMT',   // Centímetro
  MTK = 'MTK',   // Metro cuadrado
  MTQ = 'MTQ',   // Metro cúbico
  TNE = 'TNE',   // Tonelada métrica
  GLL = 'GLL',   // Galón
  BX  = 'BX',    // Caja
  DZN = 'DZN',   // Docena
  PK  = 'PK',    // Paquete
  BG  = 'BG',    // Bolsa
  BO  = 'BO',    // Botella
  CJ  = 'CJ',    // Caja pequeña
  SA  = 'SA',    // Saco
  SET = 'SET',   // Juego / Set
  // ─── Servicios ──────────────────────────────────────
  ZZ  = 'ZZ',    // Unidad de servicio (genérico)
  HUR = 'HUR',   // Hora de servicio
  DAY = 'DAY',   // Día de servicio
  MON = 'MON',   // Mes de servicio
}

/**
 * Catálogo Nº 7 SUNAT - Tipo de Afectación del IGV
 * Obligatorio en cada ítem del XML (campo "tip_afe_igv")
 * Gravado Oneroso: 10 | Exonerado: 20 | Inafecto: 30 | Exportación: 40
 */
export enum TipAfeIgv {
  GRAVADO_ONEROSA           = '10', // Gravado – Operación Onerosa (más común)
  GRAVADO_RETIRO_PREMIO     = '11', // Gravado – Retiro por premio
  GRAVADO_RETIRO_DONACION   = '12', // Gravado – Retiro por donación
  GRAVADO_RETIRO            = '13', // Gravado – Retiro
  GRAVADO_RETIRO_PUBLICIDAD = '14', // Gravado – Retiro por publicidad
  GRAVADO_BONIFICACIONES    = '15', // Gravado – Bonificaciones
  GRAVADO_RETIRO_TRABAJADOR = '16', // Gravado – Retiro por entrega a trabajadores
  GRAVADO_IVAP              = '17', // Gravado – IVAP (Arroz Pilado, tasa 4%)
  EXONERADO_ONEROSA         = '20', // Exonerado – Operación Onerosa
  EXONERADO_TRANSFERENCIA   = '21', // Exonerado – Transferencia Gratuita
  INAFECTO_ONEROSA          = '30', // Inafecto – Operación Onerosa
  INAFECTO_RETIRO_BONIF     = '31', // Inafecto – Retiro por Bonificación
  INAFECTO_RETIRO           = '32', // Inafecto – Retiro
  INAFECTO_RETIRO_MUESTRAS  = '33', // Inafecto – Retiro por Muestras Médicas
  INAFECTO_RETIRO_CONVENIO  = '34', // Inafecto – Retiro por Convenio Colectivo
  INAFECTO_RETIRO_PREMIO    = '35', // Inafecto – Retiro por Premio
  INAFECTO_RETIRO_PUBLICIDAD= '36', // Inafecto – Retiro por Publicidad
  EXPORTACION               = '40', // Exportación de Bienes o Servicios
}

@Entity('products')
@Index('IDX_products_barcode', ['barcode'], { unique: true, where: 'barcode IS NOT NULL' })
@Index('IDX_products_sku', ['sku'], { unique: true, where: 'sku IS NOT NULL' })
export class ProductEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sku: string | null;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null;

  @ManyToOne(() => CategoryEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity;

  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number | null;

  @ManyToOne(() => SupplierEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierEntity;

  /**
   * Catálogo Nº 3 SUNAT - Unidad de Medida (campo "unidad" en el XML del comprobante)
   * Usar los códigos del enum ProductUnit: NIU, KGM, ZZ, LTR, etc.
   */
  @Column({
    type: 'varchar',
    length: 10,
    default: ProductUnit.NIU,
    comment: 'Catálogo Nº 3 SUNAT - Código de Unidad de Medida',
  })
  unit: string;

  /**
   * Catálogo Nº 7 SUNAT - Tipo de Afectación del IGV (campo "tip_afe_igv" en el XML)
   * 10=Gravado Oneroso, 20=Exonerado, 30=Inafecto, 40=Exportación
   */
  @Column({
    name: 'tip_afe_igv',
    type: 'varchar',
    length: 5,
    default: TipAfeIgv.GRAVADO_ONEROSA,
    comment: 'Catálogo Nº 7 SUNAT - Tipo de Afectación del IGV',
  })
  tipAfeIgv: string;

  @Column({ name: 'cost_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  costPrice: number;

  @Column({ name: 'sale_price', type: 'decimal', precision: 10, scale: 4, default: 0 })
  salePrice: number;

  /**
   * Porcentaje de IGV. Por defecto 18% (tasa general peruana).
   * Usar 4 para IVAP (Arroz Pilado, tip_afe_igv=17). 0 para exonerados/inafectos.
   */
  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 18.0 })
  taxRate: number;

  @Column({ name: 'stock_quantity', type: 'decimal', precision: 10, scale: 3, default: 0 })
  stockQuantity: number;

  @Column({ name: 'min_stock_level', type: 'decimal', precision: 10, scale: 3, default: 0 })
  minStockLevel: number;

  @Column({ name: 'max_stock_level', type: 'decimal', precision: 10, scale: 3, nullable: true })
  maxStockLevel: number | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  // ─── Presentación en Caja ─────────────────────────────────────────────────
  /**
   * Indica si el producto maneja presentación dual (caja + unidades sueltas).
   * Cuando es true, se habilita la lógica de cajas en compras y ventas.
   */
  @Column({ name: 'has_box_presentation', type: 'boolean', default: false })
  hasBoxPresentation: boolean;

  /**
   * Cantidad de unidades que contiene una caja.
   * Ej: Leche Gloria → 24 unidades por caja.
   * Solo aplica cuando hasBoxPresentation = true.
   */
  @Column({ name: 'units_per_box', type: 'decimal', precision: 10, scale: 3, nullable: true })
  unitsPerBox: number | null;

  /**
   * Precio de venta de UNA CAJA COMPLETA (independiente del precio unitario).
   * Ej: Una caja de 24 unidades puede venderse a S/.58 (más barato que 24×S/.2.80=S/.67.20)
   * Si es null, se calcula como (unitsPerBox × salePrice).
   */
  @Column({ name: 'box_sale_price', type: 'decimal', precision: 10, scale: 4, nullable: true })
  boxSalePrice: number | null;

  /**
   * Nombre de la presentación mayorista / empaque.
   * Ej: 'Caja', 'Paquete', 'Tira', 'Blíster', 'Saco', 'Fardo', 'Palet', etc.
   * Por defecto: 'Caja'.
   */
  @Column({ name: 'box_unit_name', type: 'varchar', length: 50, nullable: true, default: 'Caja' })
  boxUnitName: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
