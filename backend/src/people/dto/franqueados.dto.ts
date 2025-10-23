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
import { IsValidName } from '../../common/decorators/is-valid-name.decorator';

export type SituacaoFranqueado = 'ATIVA' | 'INATIVA' | 'EM_HOMOLOGACAO';

export class RedesSociaisDto {
  @ApiPropertyOptional({
    example: '@franquia ou https://instagram.com/franquia',
  })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({
    example: '@franquia ou https://facebook.com/franquia',
  })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional({
    example: '@franquia ou https://youtube.com/@franquia',
  })
  @IsOptional()
  @IsString()
  youtube?: string;

  @ApiPropertyOptional({ example: '@franquia ou https://tiktok.com/@franquia' })
  @IsOptional()
  @IsString()
  tiktok?: string;

  @ApiPropertyOptional({
    example: '@franquia ou https://linkedin.com/company/franquia',
  })
  @IsOptional()
  @IsString()
  linkedin?: string;
}

export class CreateFranqueadoDto {
  // Identificação
  @ApiProperty({
    example: 'TeamCruz São Paulo',
    description: 'Nome da franquia',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @Length(1, 150, { message: 'Nome deve ter entre 1 e 150 caracteres' })
  @IsValidName()
  nome!: string;

  @ApiProperty({
    example: '12345678000190',
    description: 'CNPJ da franquia (apenas números)',
  })
  @IsString()
  @IsNotEmpty({ message: 'CNPJ é obrigatório' })
  @Matches(/^\d{14}$/, {
    message: 'CNPJ deve conter exatamente 14 dígitos',
  })
  cnpj!: string;

  @ApiProperty({
    example: 'TeamCruz São Paulo Ltda',
    description: 'Razão social',
  })
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

  @ApiPropertyOptional({ example: '1134567890' })
  @IsOptional()
  @IsString()
  telefone_fixo?: string;

  @ApiProperty({
    example: '11987654321',
    description: 'Telefone celular/WhatsApp (apenas números)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Telefone celular/WhatsApp é obrigatório' })
  telefone_celular!: string;

  @ApiPropertyOptional({ example: 'https://www.teamcruzsp.com.br' })
  @IsOptional()
  @IsString()
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

  @ApiPropertyOptional({ example: '01310-100' })
  @IsOptional()
  @IsString()
  cep?: string;

  @ApiPropertyOptional({ example: 'Av. Paulista' })
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiPropertyOptional({ example: '1000' })
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional({ example: 'Sala 10' })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiPropertyOptional({ example: 'Bela Vista' })
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({ example: 'Brasil' })
  @IsOptional()
  @IsString()
  pais?: string;

  // Responsável Legal
  @ApiProperty({
    example: 'João da Silva',
    description: 'Nome completo do responsável legal',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome do responsável legal é obrigatório' })
  @Length(1, 150)
  @IsValidName()
  responsavel_nome!: string;

  @ApiProperty({
    example: '12345678900',
    description: 'CPF do responsável legal (apenas números)',
  })
  @IsString()
  @IsNotEmpty({ message: 'CPF do responsável legal é obrigatório' })
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos',
  })
  responsavel_cpf!: string;

  @ApiPropertyOptional({ example: 'Diretor', description: 'Cargo/Função' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  responsavel_cargo?: string;

  @ApiPropertyOptional({ example: 'joao@teamcruz.com.br' })
  @IsOptional()
  @IsString()
  responsavel_email?: string;

  @ApiPropertyOptional({ example: '11987654321' })
  @IsOptional()
  @IsString()
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

  @ApiPropertyOptional({
    example: 'Nossa missão é...',
    description: 'Missão da franquia',
  })
  @IsOptional()
  @IsString()
  missao?: string;

  @ApiPropertyOptional({
    example: 'Nossa visão é...',
    description: 'Visão da franquia',
  })
  @IsOptional()
  @IsString()
  visao?: string;

  @ApiPropertyOptional({
    example: 'Nossos valores são...',
    description: 'Valores da franquia',
  })
  @IsOptional()
  @IsString()
  valores?: string;

  @ApiPropertyOptional({
    example: 'https://www.teamcruzsp.com.br',
    description: 'Histórico/Descrição',
  })
  @IsOptional()
  @IsString()
  historico?: string;

  @ApiPropertyOptional({
    example: 'logo.png ou https://cdn.example.com/logo.png',
    description: 'URL ou nome do arquivo do logotipo',
  })
  @IsOptional()
  @IsString()
  logotipo_url?: string;

  // Dados Financeiros
  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Data do contrato',
  })
  @IsOptional()
  @IsString()
  data_contrato?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Taxa de franquia' })
  @IsOptional()
  taxa_franquia?: number;

  @ApiPropertyOptional({
    example: {
      banco: 'Banco do Brasil',
      agencia: '1234-5',
      conta: '12345-6',
      titular: 'João da Silva',
      documento: '12345678900',
    },
  })
  @IsOptional()
  @IsObject()
  dados_bancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    titular: string;
    documento: string;
  };

  @ApiPropertyOptional({ description: 'Array de IDs de unidades gerenciadas' })
  @IsOptional()
  unidades_gerencia?: string[];

  // Relacionamento Hierárquico
  @ApiPropertyOptional({
    description: 'ID da franquia matriz (se for filial). Se NULL = matriz',
  })
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
  @Matches(/^\d{14}$/)
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
  @IsString()
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
  cep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pais?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsValidName()
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
  @IsString()
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
  @IsString()
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
  @IsString()
  data_contrato?: string;

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

  @ApiPropertyOptional({
    description: 'ID do usuário vinculado ao franqueado',
    example: '7dc34c77-a6d0-4565-a0b9-4d47bd711e5a',
  })
  @IsOptional()
  @IsString()
  usuario_id?: string;
}
