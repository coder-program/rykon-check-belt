import {
  IsString,
  IsDate,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoPeriodoGraduacao } from '../entities/graduacao-parametro.entity';

export class CreateGraduacaoParametroDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @Type(() => Date)
  @IsDate()
  data_inicio: Date;

  @Type(() => Date)
  @IsDate()
  data_fim: Date;

  @IsEnum(TipoPeriodoGraduacao)
  tipo_periodo: TipoPeriodoGraduacao;

  @IsInt()
  @Min(1)
  graus_minimos: number;

  @IsInt()
  @Min(1)
  presencas_minimas: number;

  @IsBoolean()
  ativo: boolean;

  @IsOptional()
  @IsUUID()
  unidade_id?: string;
}

export class UpdateGraduacaoParametroDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  data_inicio?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  data_fim?: Date;

  @IsOptional()
  @IsEnum(TipoPeriodoGraduacao)
  tipo_periodo?: TipoPeriodoGraduacao;

  @IsOptional()
  @IsInt()
  @Min(1)
  graus_minimos?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  presencas_minimas?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsUUID()
  unidade_id?: string;
}

export class AprovarGraduacaoDto {
  @IsUUID()
  aluno_id: string;

  @IsUUID()
  faixa_origem_id: string;

  @IsUUID()
  faixa_destino_id: string;

  @IsOptional()
  @IsUUID()
  parametro_id?: string;

  @IsOptional()
  @IsString()
  observacao_aprovacao?: string;
}

export class SolicitarGraduacaoDto {
  @IsUUID()
  aluno_id: string;

  @IsUUID()
  parametro_id: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}
