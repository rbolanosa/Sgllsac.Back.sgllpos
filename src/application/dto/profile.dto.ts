import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** { modulo: { ver, crear, editar, eliminar } }; lo desconocido se descarta */
  @IsObject()
  permissions: Record<string, any>;
}
