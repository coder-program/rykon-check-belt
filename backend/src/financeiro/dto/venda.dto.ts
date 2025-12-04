import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { MetodoPagamentoVenda, StatusVenda } from '../entities/venda.entity';

export class CreateVendaDto {
  @IsNotEmpty()
  @IsUUID()
  aluno_id: string;

  @IsOptional()
  @IsUUID()
  unidade_id?: string;

  @IsOptional()
  @IsUUID()
  fatura_id?: string;

  @IsNotEmpty()
  @IsString()
  descricao: string;

  @IsNotEmpty()
  @IsNumber()
  valor: number;

  @IsNotEmpty()
  @IsEnum(MetodoPagamentoVenda)
  metodo_pagamento: MetodoPagamentoVenda;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateVendaDto {
  @IsOptional()
  @IsEnum(StatusVenda)
  status?: StatusVenda;

  @IsOptional()
  @IsString()
  gateway_payment_id?: string;

  @IsOptional()
  @IsString()
  link_pagamento?: string;

  @IsOptional()
  @IsString()
  qr_code_pix?: string;

  @IsOptional()
  @IsString()
  codigo_barras_boleto?: string;

  @IsOptional()
  dados_gateway?: any;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class FiltroVendasDto {
  @IsOptional()
  @IsUUID()
  unidadeId?: string;

  @IsOptional()
  @IsUUID()
  alunoId?: string;

  @IsOptional()
  @IsEnum(StatusVenda)
  status?: StatusVenda;

  @IsOptional()
  @IsEnum(MetodoPagamentoVenda)
  metodo?: MetodoPagamentoVenda;

  @IsOptional()
  @IsString()
  dataInicio?: string;

  @IsOptional()
  @IsString()
  dataFim?: string;
}

export class ReenviarLinkDto {
  @IsNotEmpty()
  @IsUUID()
  vendaId: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}
