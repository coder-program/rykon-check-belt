import {
  IsEnum,
  IsNumber,
  IsDateString,
  IsString,
  IsOptional,
  IsUUID,
} from 'class-validator';
import {
  TipoTransacao,
  OrigemTransacao,
  CategoriaTransacao,
  StatusTransacao,
} from '../entities/transacao.entity';
import { MetodoPagamento } from '../entities/assinatura.entity';

export class CreateTransacaoDto {
  @IsEnum(TipoTransacao)
  tipo: TipoTransacao;

  @IsEnum(OrigemTransacao)
  origem: OrigemTransacao;

  @IsEnum(CategoriaTransacao)
  categoria: CategoriaTransacao;

  @IsString()
  descricao: string;

  @IsNumber()
  valor: number;

  @IsDateString()
  data: string;

  @IsOptional()
  @IsUUID()
  aluno_id?: string;

  @IsOptional()
  @IsUUID()
  unidade_id?: string;

  @IsOptional()
  @IsUUID()
  fatura_id?: string;

  @IsOptional()
  @IsUUID()
  despesa_id?: string;

  @IsOptional()
  @IsEnum(MetodoPagamento)
  metodo_pagamento?: MetodoPagamento;

  @IsOptional()
  @IsString()
  comprovante?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class FiltroTransacoesDto {
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @IsOptional()
  @IsEnum(TipoTransacao)
  tipo?: TipoTransacao;

  @IsOptional()
  @IsEnum(OrigemTransacao)
  origem?: OrigemTransacao;

  @IsOptional()
  @IsEnum(CategoriaTransacao)
  categoria?: CategoriaTransacao;

  @IsOptional()
  @IsUUID()
  unidade_id?: string;

  @IsOptional()
  @IsUUID()
  aluno_id?: string;
}
