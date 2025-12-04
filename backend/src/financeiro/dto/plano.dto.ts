import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { TipoPlano } from '../entities/plano.entity';

export class CreatePlanoDto {
  @IsString()
  nome: string;

  @IsEnum(TipoPlano)
  tipo: TipoPlano;

  @IsNumber()
  valor: number;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  beneficios?: string;

  @IsNumber()
  duracao_meses: number;

  @IsOptional()
  @IsNumber()
  numero_aulas?: number;

  @IsOptional()
  @IsBoolean()
  recorrencia_automatica?: boolean;

  @IsOptional()
  @IsUUID()
  unidade_id?: string;
}

export class UpdatePlanoDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEnum(TipoPlano)
  tipo?: TipoPlano;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  beneficios?: string;

  @IsOptional()
  @IsNumber()
  duracao_meses?: number;

  @IsOptional()
  @IsNumber()
  numero_aulas?: number;

  @IsOptional()
  @IsBoolean()
  recorrencia_automatica?: boolean;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
