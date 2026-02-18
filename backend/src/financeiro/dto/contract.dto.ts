import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsNumber, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContractDto {
  @ApiProperty({ description: 'ID da unidade', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  unidadeId: string;

  @ApiPropertyOptional({ description: 'Tipo do contrato', enum: ['rykon-pay', 'franquia', 'adesao'], default: 'rykon-pay' })
  @IsString()
  @IsOptional()
  @IsIn(['rykon-pay', 'franquia', 'adesao'])
  tipo?: string;

  @ApiProperty({ description: 'Título do contrato', example: 'Contrato de Prestação de Serviços Rykon-Pay' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @ApiPropertyOptional({ description: 'Conteúdo do contrato (HTML)', type: 'string' })
  @IsString()
  @IsOptional()
  conteudo?: string;

  @ApiPropertyOptional({ description: 'Versão do contrato', example: '1.0', default: '1.0' })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  versao?: string;

  @ApiProperty({ description: 'Data de início do contrato', example: '2026-02-16' })
  @IsDateString()
  @IsNotEmpty()
  dataInicio: string;

  @ApiPropertyOptional({ description: 'Data de fim do contrato', example: '2027-02-16' })
  @IsDateString()
  @IsOptional()
  dataFim?: string;

  @ApiPropertyOptional({ description: 'Valor mensal (em reais)', example: 199.90 })
  @IsNumber()
  @IsOptional()
  valorMensal?: number;

  @ApiPropertyOptional({ description: 'Taxa de transação (%)', example: 2.5 })
  @IsNumber()
  @IsOptional()
  taxaTransacao?: number;

  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsString()
  @IsOptional()
  observacoes?: string;
}

export class UpdateContractDto {
  @ApiPropertyOptional({ description: 'Título do contrato' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional({ description: 'Conteúdo do contrato (HTML)' })
  @IsString()
  @IsOptional()
  conteudo?: string;

  @ApiPropertyOptional({ description: 'Status do contrato', enum: ['PENDENTE', 'ATIVO', 'CANCELADO', 'EXPIRADO'] })
  @IsString()
  @IsOptional()
  @IsIn(['PENDENTE', 'ATIVO', 'CANCELADO', 'EXPIRADO'])
  status?: 'PENDENTE' | 'ATIVO' | 'CANCELADO' | 'EXPIRADO';

  @ApiPropertyOptional({ description: 'Data de fim do contrato' })
  @IsDateString()
  @IsOptional()
  dataFim?: string;

  @ApiPropertyOptional({ description: 'Valor mensal (em reais)' })
  @IsNumber()
  @IsOptional()
  valorMensal?: number;

  @ApiPropertyOptional({ description: 'Taxa de transação (%)' })
  @IsNumber()
  @IsOptional()
  taxaTransacao?: number;

  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsString()
  @IsOptional()
  observacoes?: string;
}

export class SignContractDto {
  @ApiProperty({ description: 'Nome do signatário', example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  assinadoPorNome: string;

  @ApiProperty({ description: 'CPF do signatário', example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(14)
  assinadoPorCpf: string;
}
