import { IsOptional, IsEnum, IsString, IsNumberString } from 'class-validator';
import { TipoCadastro, StatusCadastro } from '../entities/person.entity';

export class FilterPersonDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  pageSize?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(TipoCadastro)
  tipo_cadastro?: TipoCadastro;

  @IsOptional()
  @IsEnum(StatusCadastro)
  status?: StatusCadastro;

  @IsOptional()
  @IsString()
  unidade_id?: string;

  @IsOptional()
  @IsString()
  faixa?: string;
}
