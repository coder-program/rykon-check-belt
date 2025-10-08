import {
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  IsBoolean,
  IsOptional,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { TipoAula, DiaSemana } from '../entities/aula.entity';

export class CreateAulaDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsUUID()
  unidade_id: string;

  @IsOptional()
  @IsUUID()
  turma_id?: string;

  @IsOptional()
  @IsUUID()
  professor_id?: string;

  @IsOptional()
  @IsEnum(TipoAula)
  tipo?: TipoAula;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dia_semana?: number;

  @IsOptional()
  @IsString()
  data_hora_inicio?: string; // ISO string

  @IsOptional()
  @IsString()
  data_hora_fim?: string; // ISO string

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidade_maxima?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsObject()
  configuracoes?: {
    permite_checkin_antecipado_minutos?: number;
    permite_checkin_atrasado_minutos?: number;
    requer_aprovacao_professor?: boolean;
  };
}

export class UpdateAulaDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsUUID()
  unidade_id?: string;

  @IsOptional()
  @IsUUID()
  professor_id?: string;

  @IsOptional()
  @IsEnum(TipoAula)
  tipo?: TipoAula;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dia_semana?: number;

  @IsOptional()
  @IsString()
  data_hora_inicio?: string;

  @IsOptional()
  @IsString()
  data_hora_fim?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacidade_maxima?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsObject()
  configuracoes?: {
    permite_checkin_antecipado_minutos?: number;
    permite_checkin_atrasado_minutos?: number;
    requer_aprovacao_professor?: boolean;
  };
}
