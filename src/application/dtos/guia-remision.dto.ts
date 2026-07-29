import {
  IsString, IsOptional, IsNumber, IsIn, IsArray,
  ValidateNested, Min, IsNotEmpty, IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Sub-DTOs ──────────────────────────────────────────────────────────────────

export class DestinatarioDto {
  @ApiProperty({ example: '6', description: '1=DNI, 6=RUC' })
  @IsString() @IsNotEmpty()
  tipo_doc: string;

  @ApiProperty({ example: '20000000002' })
  @IsString() @IsNotEmpty()
  num_doc: string;

  @ApiProperty({ example: 'EMPRESA DESTINO SAC' })
  @IsString() @IsNotEmpty()
  razon_social: string;
}

export class TransportistaDto {
  @ApiProperty({ example: '6' })
  @IsString() @IsNotEmpty()
  tipo_doc: string;

  @ApiProperty({ example: '20000000002' })
  @IsString() @IsNotEmpty()
  num_doc: string;

  @ApiProperty({ example: 'TRANSPORTES SAC' })
  @IsString() @IsNotEmpty()
  razon_social: string;

  @ApiPropertyOptional({ example: '0001' })
  @IsOptional() @IsString()
  nro_mtc?: string;
}

export class VehiculoSecundarioDto {
  @ApiProperty({ example: 'XYZ789' })
  @IsString() @IsNotEmpty()
  placa: string;
}

export class VehiculoDto {
  @ApiProperty({ example: 'ABC123' })
  @IsString() @IsNotEmpty()
  placa: string;

  @ApiPropertyOptional({ type: [VehiculoSecundarioDto] })
  @IsOptional() @IsArray()
  @ValidateNested({ each: true }) @Type(() => VehiculoSecundarioDto)
  secundarios?: VehiculoSecundarioDto[];
}

export class ConductorDto {
  @ApiPropertyOptional({ example: 'Principal' })
  @IsOptional() @IsString()
  tipo?: string;

  @ApiProperty({ example: '1', description: '1=DNI' })
  @IsString() @IsNotEmpty()
  tipo_doc: string;

  @ApiProperty({ example: '44004400' })
  @IsString() @IsNotEmpty()
  num_doc: string;

  @ApiProperty({ example: 'ROBERTO' })
  @IsString() @IsNotEmpty()
  nombres: string;

  @ApiProperty({ example: 'RODRIGUEZ VALENCIA' })
  @IsString() @IsNotEmpty()
  apellidos: string;

  @ApiProperty({ example: '0001122020' })
  @IsString() @IsNotEmpty()
  licencia: string;
}

export class GuiaRemisionItemDto {
  @ApiProperty({ example: 'PROD1' })
  @IsString() @IsNotEmpty()
  codigo: string;

  @ApiProperty({ example: 'Producto de prueba' })
  @IsString() @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number) @IsNumber() @Min(0.001)
  cantidad: number;

  @ApiProperty({ example: 'NIU' })
  @IsString() @IsNotEmpty()
  unidad: string;
}

// ── Main DTO ─────────────────────────────────────────────────────────────────

export class CreateGuiaRemisionDto {
  @ApiPropertyOptional({ example: 'T001', description: 'Serie GRR (debe comenzar con T)' })
  @IsOptional() @IsString()
  serie?: string = 'T001';

  @ApiProperty({ example: '2026-07-01' })
  @IsString() @IsNotEmpty()
  fecha_emision: string;

  @ApiProperty({ type: DestinatarioDto })
  @ValidateNested() @Type(() => DestinatarioDto)
  destinatario: DestinatarioDto;

  /**
   * Código motivo de traslado (Catálogo 20 SUNAT):
   * 01=Venta, 02=Compra, 03=Traslado almacén propio,
   * 04=Entre establecimientos, 08=Importación, 09=Exportación, 13=Otros
   */
  @ApiProperty({
    example: '01',
    enum: ['01','02','03','04','05','06','08','09','13'],
  })
  @IsString()
  @IsIn(['01','02','03','04','05','06','08','09','13'], {
    message: 'cod_traslado inválido. Valores: 01=Venta 02=Compra 03=Almacén 04=Establ. 05=Venta a terceros 06=Devolución 08=Import 09=Export 13=Otros',
  })
  cod_traslado: string;

  /**
   * Modalidad de traslado:
   * 01=Público (requiere transportista), 02=Privado (requiere vehículo + conductor)
   */
  @ApiProperty({ example: '01', enum: ['01', '02'] })
  @IsString()
  @IsIn(['01','02'], { message: 'mod_traslado: 01=Público, 02=Privado' })
  mod_traslado: string;

  @ApiProperty({ example: '2026-07-01' })
  @IsString() @IsNotEmpty()
  fecha_traslado: string;

  /** Solo para mod_traslado=01 (transporte público) */
  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional() @IsString()
  fecha_de_entrega_al_transportista?: string;

  @ApiProperty({ example: 12.5 })
  @Type(() => Number) @IsNumber() @Min(0.001)
  peso_total: number;

  @ApiPropertyOptional({ example: 'KGM', enum: ['KGM','TNE'] })
  @IsOptional() @IsString()
  und_peso_total?: string = 'KGM';

  @ApiPropertyOptional({ example: 5 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  num_bultos?: number;

  @ApiProperty({ example: '150203', description: 'Ubigeo INEI 6 dígitos (partida)' })
  @IsString() @IsNotEmpty()
  partida_ubigeo: string;

  @ApiProperty({ example: 'AV ITALIA 123, RIMAC' })
  @IsString() @IsNotEmpty()
  partida_direccion: string;

  @ApiProperty({ example: '150101', description: 'Ubigeo INEI 6 dígitos (llegada)' })
  @IsString() @IsNotEmpty()
  llegada_ubigeo: string;

  @ApiProperty({ example: 'AV LIMA 456, CERCADO' })
  @IsString() @IsNotEmpty()
  llegada_direccion: string;

  /** Requerido si mod_traslado = "01" */
  @ApiPropertyOptional({ type: TransportistaDto })
  @IsOptional() @ValidateNested() @Type(() => TransportistaDto)
  transportista?: TransportistaDto;

  /** Requerido si mod_traslado = "02" */
  @ApiPropertyOptional({ type: VehiculoDto })
  @IsOptional() @ValidateNested() @Type(() => VehiculoDto)
  vehiculo?: VehiculoDto;

  /** Requerido si mod_traslado = "02" */
  @ApiPropertyOptional({ type: ConductorDto })
  @IsOptional() @ValidateNested() @Type(() => ConductorDto)
  conductor?: ConductorDto;

  /** Conductores múltiples (alternativo a conductor) */
  @ApiPropertyOptional({ type: [ConductorDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ConductorDto)
  conductores?: ConductorDto[];

  @ApiPropertyOptional({ type: [String], example: [] })
  @IsOptional() @IsArray()
  indicadores?: string[];

  @ApiProperty({ type: [GuiaRemisionItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => GuiaRemisionItemDto)
  items: GuiaRemisionItemDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  enviar_automatico?: boolean = true;
}
