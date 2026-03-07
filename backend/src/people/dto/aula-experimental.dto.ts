import { IsString, IsOptional, IsBoolean, IsInt, IsUUID, IsDateString, IsIn, Min, Max } from 'class-validator';

export class CriarAgendamentoDto {
  @IsUUID()
  unidade_id: string;

  @IsUUID()
  modalidade_id: string;

  @IsOptional()
  @IsUUID()
  convite_id?: string;

  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  /** YYYY-MM-DD */
  @IsDateString()
  data_aula: string;

  /** HH:mm */
  @IsString()
  horario: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class AtualizarStatusAgendamentoDto {
  @IsIn(['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'REALIZADO'])
  status: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpsertConfigAulaExperimentalDto {
  @IsBoolean()
  ativo: boolean;

  @IsInt()
  @Min(1)
  @Max(99)
  max_aulas: number;

  @IsInt()
  @Min(15)
  duracao_minutos: number;
}
