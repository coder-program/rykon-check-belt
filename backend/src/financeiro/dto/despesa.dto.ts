import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  IsString,
  IsOptional,
} from 'class-validator';
import {
  CategoriaDespesa,
  RecorrenciaDespesa,
  StatusDespesa,
} from '../entities/despesa.entity';

export class CreateDespesaDto {
  @IsUUID()
  unidade_id: string;

  @IsEnum(CategoriaDespesa)
  categoria: CategoriaDespesa;

  @IsString()
  descricao: string;

  @IsNumber()
  valor: number;

  @IsDateString()
  data_vencimento: string;

  @IsOptional()
  @IsEnum(RecorrenciaDespesa)
  recorrencia?: RecorrenciaDespesa;

  @IsOptional()
  @IsString()
  fornecedor?: string;

  @IsOptional()
  @IsString()
  numero_documento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateDespesaDto {
  @IsOptional()
  @IsEnum(CategoriaDespesa)
  categoria?: CategoriaDespesa;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsDateString()
  data_vencimento?: string;

  @IsOptional()
  @IsEnum(RecorrenciaDespesa)
  recorrencia?: RecorrenciaDespesa;

  @IsOptional()
  @IsEnum(StatusDespesa)
  status?: StatusDespesa;

  @IsOptional()
  @IsString()
  fornecedor?: string;

  @IsOptional()
  @IsString()
  numero_documento?: string;

  @IsOptional()
  @IsString()
  anexo?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class BaixarDespesaDto {
  @IsOptional()
  @IsDateString()
  data_pagamento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
