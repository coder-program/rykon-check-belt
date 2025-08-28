import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreatePermissaoDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsUUID()
  tipoId?: string;

  @IsOptional()
  @IsUUID()
  nivelId?: string;

  @IsOptional()
  @IsString()
  modulo?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
