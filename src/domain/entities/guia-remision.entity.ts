import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum ModTraslado {
  PUBLICO  = '01',
  PRIVADO  = '02',
}

export enum CodTraslado {
  VENTA                    = '01',
  COMPRA                   = '02',
  TRASLADO_ALMACEN_PROPIO  = '03',
  ENTRE_ESTABLECIMIENTOS   = '04',
  IMPORTACION              = '08',
  EXPORTACION              = '09',
  OTROS                    = '13',
}

@Entity('guias_remision')
export class GuiaRemisionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  /** Serie de la GRR — siempre empieza por T */
  @Column({ type: 'varchar', length: 10, default: 'T001' })
  serie: string;

  /** Número correlativo asignado por APISUNAT */
  @Column({ name: 'correlativo', type: 'varchar', length: 15, nullable: true })
  correlativo: string | null;

  /** Número completo: T001-00000001 */
  @Column({ name: 'numero_completo', type: 'varchar', length: 30, nullable: true })
  numeroCompleto: string | null;

  @Column({ name: 'fecha_emision', type: 'date' })
  fechaEmision: string;

  @Column({ name: 'fecha_traslado', type: 'date' })
  fechaTraslado: string;

  // ── Destinatario ─────────────────────────────────────────────────────────
  @Column({ name: 'dest_tipo_doc', type: 'varchar', length: 2 })
  destTipoDoc: string;

  @Column({ name: 'dest_num_doc', type: 'varchar', length: 20 })
  destNumDoc: string;

  @Column({ name: 'dest_razon_social', type: 'varchar', length: 200 })
  destRazonSocial: string;

  // ── Traslado ─────────────────────────────────────────────────────────────
  @Column({ name: 'cod_traslado', type: 'varchar', length: 5 })
  codTraslado: string;

  @Column({ name: 'mod_traslado', type: 'varchar', length: 2 })
  modTraslado: string;

  @Column({ name: 'peso_total', type: 'decimal', precision: 10, scale: 3 })
  pesoTotal: number;

  @Column({ name: 'und_peso_total', type: 'varchar', length: 5, default: 'KGM' })
  undPesoTotal: string;

  @Column({ name: 'num_bultos', type: 'int', nullable: true })
  numBultos: number | null;

  // ── Partida / Llegada ────────────────────────────────────────────────────
  @Column({ name: 'partida_ubigeo', type: 'varchar', length: 10 })
  partidaUbigeo: string;

  @Column({ name: 'partida_direccion', type: 'varchar', length: 300 })
  partidaDireccion: string;

  @Column({ name: 'llegada_ubigeo', type: 'varchar', length: 10 })
  llegadaUbigeo: string;

  @Column({ name: 'llegada_direccion', type: 'varchar', length: 300 })
  llegadaDireccion: string;

  // ── Transporte Público (mod_traslado=01) ─────────────────────────────────
  @Column({ name: 'transportista_json', type: 'text', nullable: true,
    comment: 'JSON: {tipo_doc, num_doc, razon_social, nro_mtc}' })
  transportistaJson: string | null;

  @Column({ name: 'fecha_entrega_transportista', type: 'date', nullable: true })
  fechaEntregaTransportista: string | null;

  // ── Transporte Privado (mod_traslado=02) ─────────────────────────────────
  @Column({ name: 'vehiculo_json', type: 'text', nullable: true,
    comment: 'JSON: {placa, secundarios[]}' })
  vehiculoJson: string | null;

  @Column({ name: 'conductor_json', type: 'text', nullable: true,
    comment: 'JSON: {tipo, tipo_doc, num_doc, nombres, apellidos, licencia}' })
  conductorJson: string | null;

  // ── Items ────────────────────────────────────────────────────────────────
  @Column({ name: 'items_json', type: 'text',
    comment: 'JSON: [{codigo, descripcion, cantidad, unidad}]' })
  itemsJson: string;

  // ── SUNAT / APISUNAT ─────────────────────────────────────────────────────
  @Column({ name: 'sunat_status', type: 'varchar', length: 30, default: 'PENDIENTE' })
  sunatStatus: string;

  @Column({ name: 'sunat_message', type: 'varchar', length: 500, nullable: true })
  sunatMessage: string | null;

  @Column({ name: 'xml_url', type: 'varchar', length: 500, nullable: true })
  xmlUrl: string | null;

  @Column({ name: 'pdf_url', type: 'varchar', length: 500, nullable: true })
  pdfUrl: string | null;

  @Column({ name: 'cdr_url', type: 'varchar', length: 500, nullable: true })
  cdrUrl: string | null;

  /** ID del registro en APISUNAT (para reenvío manual) */
  @Column({ name: 'apisunat_id', type: 'int', nullable: true })
  apisunatId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
