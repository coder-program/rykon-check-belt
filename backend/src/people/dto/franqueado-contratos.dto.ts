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
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// ── Módulo contratado ─────────────────────────────────────────
export class CreateModuloContratadoDto {
  @ApiProperty({ example: 'FIN' })
  @IsString()
  codigo: string;

  @ApiProperty({ example: 'Financeiro / Assinaturas' })
  @IsString()
  nome_comercial: string;

  @ApiPropertyOptional({ example: 'extra', enum: ['base', 'extra'] })
  @IsOptional()
  @IsIn(['base', 'extra'])
  tipo?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_mensal_contratado?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_setup_contratado?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  data_inicio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;
}

// ── Create contrato ───────────────────────────────────────────
export class CreateFranqueadoContratoDto {
  @ApiProperty({ example: 'uuid-do-franqueado' })
  @IsUUID()
  franqueado_id: string;

  // 6.1
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  codigo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nome_fantasia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnpj_cpf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razao_social?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  segmento?: string;

  @ApiPropertyOptional({ default: 'CONTRATO_FECHADO' })
  @IsOptional()
  @IsString()
  status_comercial?: string;

  // 6.2
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contato_nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contato_cargo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contato_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contato_telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  financeiro_nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  financeiro_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  financeiro_whatsapp?: string;

  // 6.3
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  data_implantacao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  data_go_live?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  data_inicio_cobranca?: string;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  carencia_meses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel_comercial?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel_implantacao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  mensalidade_base?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  desconto_mensal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  desconto_motivo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  setup_valor_total?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  setup_parcelas?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  setup_cobrar_durante_carencia?: boolean;

  @ApiPropertyOptional({ enum: ['MENSAL', 'ANUAL', 'PIX', 'BOLETO', 'TRANSFERENCIA'] })
  @IsOptional()
  @IsString()
  tipo_cobranca?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  dia_vencimento?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  forma_reajuste?: string;

  // 6.5
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  usuarios_ativos_esperados?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  unidades_esperadas?: number;

  @ApiPropertyOptional({ enum: ['baixa', 'media', 'alta'] })
  @IsOptional()
  @IsString()
  familiaridade_tecnologia?: string;

  @ApiPropertyOptional({ enum: ['NAO_INICIADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'PAUSADA'] })
  @IsOptional()
  @IsString()
  status_implantacao?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  integracao_externa?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  integracoes_previstas?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacoes?: string;

  // Módulos (array enviado junto com o contrato)
  @ApiPropertyOptional({ type: [CreateModuloContratadoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateModuloContratadoDto)
  modulos?: CreateModuloContratadoDto[];
}

// ── Update contrato ───────────────────────────────────────────
export class UpdateFranqueadoContratoDto extends PartialType(CreateFranqueadoContratoDto) {}

// ── List query params ────────────────────────────────────────
export class ListFranqueadoContratosDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  franqueado_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status_contrato?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status_implantacao?: string;
}
