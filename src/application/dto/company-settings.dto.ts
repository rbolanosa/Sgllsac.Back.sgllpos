import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, MaxLength, MinLength, Matches } from 'class-validator';
import { TaxRegime } from '../../domain/entities/company-settings.entity';

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  @Matches(/^\d{11}$/, { message: 'El RUC debe tener exactamente 11 dígitos numéricos' })
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  razonSocial?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombreComercial?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  ubigeo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  distrito?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  provincia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departamento?: string;

  @IsOptional()
  @IsEnum(TaxRegime)
  regimenTributario?: TaxRegime;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  usuarioSol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  claveSol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  serieFactura?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  serieBoleta?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  serieNotaVenta?: string;

  @IsOptional()
  @IsNumber()
  correlativoFactura?: number;

  @IsOptional()
  @IsNumber()
  correlativoBoleta?: number;

  @IsOptional()
  @IsNumber()
  correlativoNotaVenta?: number;

  @IsOptional()
  @IsNumber()
  igvRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  moneda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  sunatApiUrl?: string;

  @IsOptional()
  @IsBoolean()
  productionMode?: boolean;

  @IsOptional()
  @IsString()
  sunatApiKey?: string;

  @IsOptional()
  @IsString()
  sunatApiSecret?: string;

  @IsOptional()
  @IsString()
  certificadoUrl?: string;

  @IsOptional()
  @IsString()
  certificadoPassword?: string;
}
