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
  Length,
  Matches,
} from 'class-validator';
import { TipoAula, DiaSemana } from '../entities/aula.entity';

export class CreateAulaDto {
  @IsString()
  @Length(3, 80, { message: 'Nome deve ter entre 3 e 80 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-\(\)0-9]+$/, {
    message:
      'Nome deve conter apenas letras, números, espaços, hífens e parênteses',
  })
  nome: string;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-\(\)\.\,\;0-9]*$/, {
    message:
      'Descrição deve conter apenas letras, números, espaços e pontuação básica',
  })
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
  @Length(3, 80, { message: 'Nome deve ter entre 3 e 80 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-\(\)0-9]+$/, {
    message:
      'Nome deve conter apenas letras, números, espaços, hífens e parênteses',
  })
  nome?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Descrição deve ter no máximo 500 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-\(\)\.\,\;0-9]*$/, {
    message:
      'Descrição deve conter apenas letras, números, espaços e pontuação básica',
  })
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
