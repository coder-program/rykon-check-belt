import { IsString, IsEmail, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  perfil_ids?: string[];
}
