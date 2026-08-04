import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum TaxRegime {
  GENERAL       = 'general',         // Régimen General
  MYPE          = 'mype_tributaria',  // Mype Tributaria
  ESPECIAL      = 'especial',         // Régimen Especial
  NO_DOMICILIADO = 'no_domiciliado',
}

export enum InvoiceType {
  FACTURA = '01',
  BOLETA  = '03',
}

/**
 * Stores the company / issuer information required for SUNAT electronic billing.
 * Only one record exists (id=1). Use upsert to update.
 */
@Entity('company_settings')
export class CompanySettingsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // ── Datos del Emisor ─────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 11, default: '' })
  ruc: string;

  @Column({ name: 'razon_social', type: 'varchar', length: 200, default: '' })
  razonSocial: string;

  @Column({ name: 'nombre_comercial', type: 'varchar', length: 200, nullable: true })
  nombreComercial: string | null;

  // ── Dirección Fiscal ─────────────────────────────────────────────────────
  @Column({ type: 'text', default: '' })
  direccion: string;

  @Column({ type: 'varchar', length: 6, nullable: true, comment: 'Código INEI/SUNAT' })
  ubigeo: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  distrito: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  provincia: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  departamento: string | null;

  @Column({ type: 'varchar', length: 100, default: 'PE', comment: 'ISO 3166-1 alpha-2' })
  pais: string;

  // ── Régimen tributario ───────────────────────────────────────────────────
  @Column({ name: 'regimen_tributario', type: 'enum', enum: TaxRegime, default: TaxRegime.MYPE })
  regimenTributario: TaxRegime;

  // ── Credenciales SOL SUNAT ───────────────────────────────────────────────
  @Column({ name: 'usuario_sol', type: 'varchar', length: 50, nullable: true })
  usuarioSol: string | null;

  @Column({ name: 'clave_sol', type: 'varchar', length: 200, nullable: true, comment: 'Stored encrypted' })
  claveSol: string | null;

  // ── Series de comprobantes ───────────────────────────────────────────────
  @Column({ name: 'serie_factura', type: 'varchar', length: 4, default: 'F001' })
  serieFactura: string;

  @Column({ name: 'serie_boleta', type: 'varchar', length: 4, default: 'B001' })
  serieBoleta: string;

  @Column({ name: 'serie_nota_venta', type: 'varchar', length: 4, default: 'NV01' })
  serieNotaVenta: string;

  @Column({ name: 'correlativo_factura', type: 'int', default: 1 })
  correlativoFactura: number;

  @Column({ name: 'correlativo_boleta', type: 'int', default: 1 })
  correlativoBoleta: number;

  @Column({ name: 'correlativo_nota_venta', type: 'int', default: 1 })
  correlativoNotaVenta: number;

  // ── Configuración de impuestos ───────────────────────────────────────────
  @Column({ name: 'igv_rate', type: 'decimal', precision: 5, scale: 2, default: 18.00, comment: 'IGV rate in %, default 18' })
  igvRate: number;

  @Column({ name: 'moneda', type: 'varchar', length: 3, default: 'PEN' })
  moneda: string;

  // ── Contacto / Logo ──────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 20, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ name: 'website', type: 'varchar', length: 200, nullable: true })
  website: string | null;

  // ── API Facturación Electrónica ──────────────────────────────────────────
  @Column({ name: 'sunat_api_url', type: 'varchar', length: 300, nullable: true, comment: 'Beta o producción' })
  sunatApiUrl: string | null;

  @Column({ name: 'production_mode', type: 'boolean', default: false, comment: 'false=beta, true=producción' })
  productionMode: boolean;

  @Column({ name: 'sunat_api_key', type: 'varchar', length: 255, nullable: true })
  sunatApiKey: string | null;

  @Column({ name: 'sunat_api_secret', type: 'varchar', length: 255, nullable: true })
  sunatApiSecret: string | null;

  @Column({ name: 'sunat_client_id', type: 'varchar', length: 255, nullable: true })
  sunatClientId: string | null;

  @Column({ name: 'sunat_client_secret', type: 'varchar', length: 255, nullable: true })
  sunatClientSecret: string | null;

  @Column({ name: 'certificado_url', type: 'varchar', length: 500, nullable: true })
  certificadoUrl: string | null;

  @Column({ name: 'certificado_password', type: 'varchar', length: 255, nullable: true })
  certificadoPassword: string | null;

  // ── WhatsApp Multi-Empresa API ───────────────────────────────────────────
  @Column({ name: 'whatsapp_company_id', type: 'varchar', length: 100, default: 'empresa_demo' })
  whatsappCompanyId: string;

  @Column({ name: 'whatsapp_api_url', type: 'varchar', length: 300, default: 'https://apiwatsapp-production.up.railway.app' })
  whatsappApiUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
