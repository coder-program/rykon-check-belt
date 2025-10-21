import {
  IsUUID,
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { TurnoTrabalho } from '../entities/recepcionista-unidade.entity';

export class CreateRecepcionistaUnidadeDto {
  @IsUUID()
  usuario_id: string;

  @IsUUID()
  unidade_id: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsEnum(TurnoTrabalho)
  turno?: TurnoTrabalho;

  @IsOptional()
  @IsString()
  horario_entrada?: string; // formato: "HH:mm:ss" ou "HH:mm"

  @IsOptional()
  @IsString()
  horario_saida?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dias_semana?: string[]; // Ex: ['SEG', 'TER', 'QUA', 'QUI', 'SEX']

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateRecepcionistaUnidadeDto {
  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsEnum(TurnoTrabalho)
  turno?: TurnoTrabalho;

  @IsOptional()
  @IsString()
  horario_entrada?: string;

  @IsOptional()
  @IsString()
  horario_saida?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dias_semana?: string[];

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
