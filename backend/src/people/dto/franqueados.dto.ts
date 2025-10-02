import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type SituacaoFranqueado = 'ATIVA' | 'INATIVA' | 'EM_HOMOLOGACAO';

export class RedesSociaisDto {
  @ApiPropertyOptional({ example: 'https://instagram.com/franquia' })
  @IsOptional()
  @IsUrl({}, { message: 'Instagram deve ser uma URL válida' })
  instagram?: string;

  @ApiPropertyOptional({ example: 'https://facebook.com/franquia' })
  @IsOptional()
  @IsUrl({}, { message: 'Facebook deve ser uma URL válida' })
  facebook?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@franquia' })
  @IsOptional()
  @IsUrl({}, { message: 'YouTube deve ser uma URL válida' })
  youtube?: string;

  @ApiPropertyOptional({ example: 'https://tiktok.com/@franquia' })
  @IsOptional()
  @IsUrl({}, { message: 'TikTok deve ser uma URL válida' })
  tiktok?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/company/franquia' })
  @IsOptional()
  @IsUrl({}, { message: 'LinkedIn deve ser uma URL válida' })
  linkedin?: string;
}

export class CreateFranqueadoDto {
  // Identificação
  @ApiProperty({ example: 'TeamCruz São Paulo', description: 'Nome da franquia' })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @Length(1, 150, { message: 'Nome deve ter entre 1 e 150 caracteres' })
  nome!: string;

  @ApiProperty({ example: '12.345.678/0001-90', description: 'CNPJ da franquia' })
  @IsString()
  @IsNotEmpty({ message: 'CNPJ é obrigatório' })
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX',
  })
  cnpj!: string;

  @ApiProperty({ example: 'TeamCruz São Paulo Ltda', description: 'Razão social' })
  @IsString()
  @IsNotEmpty({ message: 'Razão social é obrigatória' })
  @Length(1, 200, { message: 'Razão social deve ter entre 1 e 200 caracteres' })
  razao_social!: string;

  @ApiPropertyOptional({ example: 'TeamCruz SP', description: 'Nome fantasia' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nome_fantasia?: string;

  @ApiPropertyOptional({ example: '123.456.789.012' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  inscricao_estadual?: string;

  @ApiPropertyOptional({ example: '9876543' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  inscricao_municipal?: string;

  // Contato
  @ApiProperty({ example: 'contato@teamcruz.com.br' })
  @IsEmail({}, { message: 'Email institucional deve ser válido' })
  @IsNotEmpty({ message: 'Email institucional é obrigatório' })
  email!: string;

  @ApiPropertyOptional({ example: '(11) 3456-7890' })
  @IsOptional()
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone fixo deve estar no formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX',
  })
  telefone_fixo?: string;

  @ApiProperty({ example: '(11) 98765-4321', description: 'Telefone celular/WhatsApp' })
  @IsString()
  @IsNotEmpty({ message: 'Telefone celular/WhatsApp é obrigatório' })
  @Matches(/^\(\d{2}\)\s\d{5}-\d{4}$/, {
    message: 'Telefone celular deve estar no formato (XX) XXXXX-XXXX',
  })
  telefone_celular!: string;

  @ApiPropertyOptional({ example: 'https://www.teamcruzsp.com.br' })
  @IsOptional()
  @IsUrl({}, { message: 'Website deve ser uma URL válida' })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RedesSociaisDto)
  redes_sociais?: RedesSociaisDto;

  // Endereço
  @ApiPropertyOptional({ description: 'ID do endereço principal' })
  @IsOptional()
  @IsString()
  endereco_id?: string;

  // Responsável Legal
  @ApiProperty({ example: 'João da Silva', description: 'Nome completo do responsável legal' })
  @IsString()
  @IsNotEmpty({ message: 'Nome do responsável legal é obrigatório' })
  @Length(1, 150)
  responsavel_nome!: string;

  @ApiProperty({ example: '123.456.789-00', description: 'CPF do responsável legal' })
  @IsString()
  @IsNotEmpty({ message: 'CPF do responsável legal é obrigatório' })
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF deve estar no formato XXX.XXX.XXX-XX',
  })
  responsavel_cpf!: string;

  @ApiPropertyOptional({ example: 'Diretor', description: 'Cargo/Função' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  responsavel_cargo?: string;

  @ApiPropertyOptional({ example: 'joao@teamcruz.com.br' })
  @IsOptional()
  @IsEmail({}, { message: 'Email do responsável deve ser válido' })
  responsavel_email?: string;

  @ApiPropertyOptional({ example: '(11) 98765-4321' })
  @IsOptional()
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{5}-\d{4}$/, {
    message: 'Telefone do responsável deve estar no formato (XX) XXXXX-XXXX',
  })
  responsavel_telefone?: string;

  // Informações da Franquia
  @ApiPropertyOptional({ example: 2020, description: 'Ano de fundação' })
  @IsOptional()
  @IsInt({ message: 'Ano de fundação deve ser um número inteiro' })
  @Min(1900, { message: 'Ano de fundação deve ser maior que 1900' })
  @Max(new Date().getFullYear(), {
    message: 'Ano de fundação não pode ser no futuro',
  })
  ano_fundacao?: number;

  @ApiPropertyOptional({ example: 'Nossa missão é...', description: 'Missão da franquia' })
  @IsOptional()
  @IsString()
  missao?: string;

  @ApiPropertyOptional({ example: 'Nossa visão é...', description: 'Visão da franquia' })
  @IsOptional()
  @IsString()
  visao?: string;

  @ApiPropertyOptional({ example: 'Nossos valores são...', description: 'Valores da franquia' })
  @IsOptional()
  @IsString()
  valores?: string;

  @ApiPropertyOptional({ example: 'Histórico da franquia...', description: 'Histórico/Descrição' })
  @IsOptional()
  @IsString()
  historico?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png', description: 'URL do logotipo' })
  @IsOptional()
  @IsUrl({}, { message: 'Logotipo deve ser uma URL válida' })
  logotipo_url?: string;

  // Relacionamento Hierárquico
  @ApiPropertyOptional({ description: 'ID da franquia matriz (se for filial). Se NULL = matriz' })
  @IsOptional()
  @IsString()
  id_matriz?: string;

  // Status
  @ApiPropertyOptional({
    enum: ['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'],
    default: 'EM_HOMOLOGACAO',
  })
  @IsOptional()
  @IsEnum(['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'], {
    message: 'Situação deve ser ATIVA, INATIVA ou EM_HOMOLOGACAO',
  })
  situacao?: SituacaoFranqueado;
}

export class UpdateFranqueadoDto {
  // Todos os campos opcionais para update
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
  cnpj?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 200)
  razao_social?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nome_fantasia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inscricao_estadual?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inscricao_municipal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone_fixo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefone_celular?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  redes_sociais?: RedesSociaisDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endereco_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel_nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel_cpf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel_cargo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  responsavel_email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel_telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  ano_fundacao?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  missao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  valores?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  historico?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logotipo_url?: string;

  @ApiPropertyOptional({ enum: ['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'] })
  @IsOptional()
  @IsEnum(['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'])
  situacao?: SituacaoFranqueado;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id_matriz?: string;

  @ApiPropertyOptional()
  @IsOptional()
  unidades_gerencia?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  taxa_franquia?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dados_bancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    titular: string;
    documento: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  ativo?: boolean;
}
