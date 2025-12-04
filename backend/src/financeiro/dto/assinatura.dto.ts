import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import {
  StatusAssinatura,
  MetodoPagamento,
} from '../entities/assinatura.entity';

export class CreateAssinaturaDto {
  @IsUUID()
  aluno_id: string;

  @IsUUID()
  plano_id: string;

  @IsUUID()
  unidade_id: string;

  @IsEnum(MetodoPagamento)
  metodo_pagamento: MetodoPagamento;

  @IsNumber()
  valor: number;

  @IsDateString()
  data_inicio: string;

  @IsOptional()
  @IsNumber()
  dia_vencimento?: number;

  @IsOptional()
  @IsString()
  token_cartao?: string;

  @IsOptional()
  dados_pagamento?: any;
}

export class UpdateAssinaturaDto {
  @IsOptional()
  @IsEnum(StatusAssinatura)
  status?: StatusAssinatura;

  @IsOptional()
  @IsEnum(MetodoPagamento)
  metodo_pagamento?: MetodoPagamento;

  @IsOptional()
  @IsNumber()
  valor?: number;

  @IsOptional()
  @IsDateString()
  data_fim?: string;

  @IsOptional()
  @IsDateString()
  proxima_cobranca?: string;

  @IsOptional()
  @IsNumber()
  dia_vencimento?: number;

  @IsOptional()
  @IsString()
  token_cartao?: string;

  @IsOptional()
  dados_pagamento?: any;
}

export class CancelarAssinaturaDto {
  @IsString()
  motivo_cancelamento: string;
}

export class AlterarPlanoDto {
  @IsUUID()
  novo_plano_id: string;

  @IsOptional()
  @IsNumber()
  novo_valor?: number;
}
