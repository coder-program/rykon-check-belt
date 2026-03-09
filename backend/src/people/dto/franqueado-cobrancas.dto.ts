import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
  IsDateString,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

const STATUS_COBRANCA = ['PENDENTE', 'PAGA', 'ATRASADA', 'NEGOCIADA', 'ISENTA', 'CANCELADA'] as const;
const ORIGEM_COBRANCA = ['AUTOMATICA', 'MANUAL'] as const;
const STATUS_PARCELA = ['PENDENTE', 'PAGA', 'ATRASADA', 'NEGOCIADA', 'ISENTA', 'CANCELADA'] as const;
const TIPO_ITEM = ['MENSALIDADE_BASE', 'MODULO_EXTRA', 'SETUP', 'DESCONTO', 'AJUSTE'] as const;

// ── Item de cobrança ──────────────────────────────────────────
export class CreateCobrancaItemDto {
  @ApiPropertyOptional({ enum: TIPO_ITEM })
  @IsOptional()
  @IsIn(TIPO_ITEM)
  tipo_item?: string;

  @ApiPropertyOptional({ example: 'Mensalidade base — Março/2026' })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referencia_id?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantidade?: number;

  @ApiProperty({ example: 299.9 })
  @IsNumber()
  @Min(0)
  valor_unitario: number;

  @ApiProperty({ example: 299.9 })
  @IsNumber()
  @Min(0)
  valor_total: number;
}

// ── Create cobrança ───────────────────────────────────────────
export class CreateFranqueadoCobrancaDto {
  @ApiProperty({ example: 'uuid-do-contrato' })
  @IsUUID()
  contrato_id: string;

  @ApiPropertyOptional({ example: '2026-03' })
  @IsOptional()
  @IsString()
  competencia?: string;

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  data_emissao?: string;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  data_vencimento?: string;

  @ApiProperty({ example: 599.8 })
  @IsNumber()
  @Min(0)
  valor_total: number;

  @ApiPropertyOptional({ enum: STATUS_COBRANCA, default: 'PENDENTE' })
  @IsOptional()
  @IsIn(STATUS_COBRANCA)
  status?: string;

  @ApiPropertyOptional({ enum: ORIGEM_COBRANCA, default: 'MANUAL' })
  @IsOptional()
  @IsIn(ORIGEM_COBRANCA)
  origem?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  carencia_aplicada?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional({ type: [CreateCobrancaItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCobrancaItemDto)
  itens?: CreateCobrancaItemDto[];
}

export class UpdateFranqueadoCobrancaDto extends PartialType(CreateFranqueadoCobrancaDto) {}

export class ListFranqueadoCobrancasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contrato_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  competencia?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  pageSize?: number;
}

// ── Registrar pagamento ───────────────────────────────────────
export class RegistrarPagamentoDto {
  @ApiProperty({ enum: STATUS_COBRANCA })
  @IsIn(STATUS_COBRANCA)
  status: string;

  @ApiPropertyOptional({ example: '2026-03-08' })
  @IsOptional()
  @IsDateString()
  data_pagamento?: string;

  @ApiPropertyOptional({ example: 'PIX' })
  @IsOptional()
  @IsString()
  forma_pagamento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

// ── Setup parcela ─────────────────────────────────────────────
export class CreateSetupParcelaDto {
  @ApiProperty({ example: 'uuid-do-contrato' })
  @IsUUID()
  contrato_id: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  numero_parcela: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  total_parcelas?: number;

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsDateString()
  data_vencimento?: string;

  @ApiProperty({ example: 333.33 })
  @IsNumber()
  @Min(0)
  valor_parcela: number;

  @ApiPropertyOptional({ enum: STATUS_PARCELA, default: 'PENDENTE' })
  @IsOptional()
  @IsIn(STATUS_PARCELA)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class UpdateSetupParcelaDto extends PartialType(CreateSetupParcelaDto) {}

export class RegistrarPagamentoParcelaDto {
  @ApiProperty({ enum: STATUS_PARCELA })
  @IsIn(STATUS_PARCELA)
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  data_pagamento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;
}

// ── Geração automática de cobranças ──────────────────────────
export class GerarCobrancasDto {
  @ApiProperty({ example: '2026-03' })
  @IsString()
  competencia: string;

  @ApiPropertyOptional({ description: 'Se vazio, gera para todos os contratos ativos' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  contrato_ids?: string[];
}
