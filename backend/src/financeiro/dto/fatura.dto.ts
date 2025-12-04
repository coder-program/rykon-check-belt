import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import { StatusFatura } from '../entities/fatura.entity';
import { MetodoPagamento } from '../entities/assinatura.entity';

export class CreateFaturaDto {
  @IsUUID()
  aluno_id: string;

  @IsOptional()
  @IsUUID()
  assinatura_id?: string;

  @IsString()
  descricao: string;

  @IsNumber()
  valor_original: number;

  @IsOptional()
  @IsNumber()
  valor_desconto?: number;

  @IsOptional()
  @IsNumber()
  valor_acrescimo?: number;

  @IsDateString()
  data_vencimento: string;

  @IsOptional()
  @IsEnum(MetodoPagamento)
  metodo_pagamento?: MetodoPagamento;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class UpdateFaturaDto {
  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  valor_original?: number;

  @IsOptional()
  @IsNumber()
  valor_desconto?: number;

  @IsOptional()
  @IsNumber()
  valor_acrescimo?: number;

  @IsOptional()
  @IsDateString()
  data_vencimento?: string;

  @IsOptional()
  @IsEnum(StatusFatura)
  status?: StatusFatura;

  @IsOptional()
  @IsEnum(MetodoPagamento)
  metodo_pagamento?: MetodoPagamento;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class BaixarFaturaDto {
  @IsEnum(MetodoPagamento)
  metodo_pagamento: MetodoPagamento;

  @IsOptional()
  @IsNumber()
  valor_pago?: number;

  @IsOptional()
  @IsDateString()
  data_pagamento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class GerarLinkPagamentoDto {
  @IsEnum(MetodoPagamento)
  metodo_pagamento: MetodoPagamento;
}
