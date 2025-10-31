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
import { IsValidPhone } from '../../common/decorators/is-valid-phone.decorator';

export type SituacaoFranqueado = 'ATIVA' | 'INATIVA' | 'EM_HOMOLOGACAO';

export class RedesSociaisDto {
  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  youtube?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  tiktok?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  linkedin?: string;
}

export class CreateFranqueadoDto {
  // Identificação
  @ApiProperty({
    description:
      'Nome da franquia (apenas letras, espaços e caracteres especiais)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @Length(1, 150, { message: 'Nome deve ter entre 1 e 150 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'&.()]+$/, {
    message:
      'Nome deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  @IsValidName()
  nome!: string;

  @ApiProperty({
    description: 'CNPJ da franquia (apenas números)',
  })
  @IsString()
  @IsNotEmpty({ message: 'CNPJ é obrigatório' })
  @Matches(/^\d{14}$/, {
    message: 'CNPJ deve conter exatamente 14 dígitos',
  })
  cnpj!: string;

  @ApiProperty({
    description: 'Razão social (apenas letras, espaços e caracteres especiais)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Razão social é obrigatória' })
  @Length(1, 200, { message: 'Razão social deve ter entre 1 e 200 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'&.()]+$/, {
    message:
      'Razão social deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  razao_social!: string;

  @ApiPropertyOptional({
    description:
      'Nome fantasia (apenas letras, espaços e caracteres especiais)',
  })
  @IsOptional()
  @IsString({ message: 'Nome fantasia deve ser uma string' })
  @Length(1, 150, {
    message: 'Nome fantasia deve ter entre 1 e 150 caracteres',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'&.()]+$/, {
    message:
      'Nome fantasia deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  nome_fantasia?: string;

  @ApiPropertyOptional({
    description: 'Inscrição estadual (apenas números)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20, {
    message: 'Inscrição estadual deve ter entre 1 e 20 caracteres',
  })
  @Matches(/^\d+$/, {
    message: 'Inscrição estadual deve conter apenas números',
  })
  inscricao_estadual?: string;

  @ApiPropertyOptional({
    description: 'Inscrição municipal (apenas números)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20, {
    message: 'Inscrição municipal deve ter entre 1 e 20 caracteres',
  })
  @Matches(/^\d+$/, {
    message: 'Inscrição municipal deve conter apenas números',
  })
  inscricao_municipal?: string;

  // Contato
  @ApiProperty({})
  @IsEmail({}, { message: 'Email institucional deve ser válido' })
  @IsNotEmpty({ message: 'Email institucional é obrigatório' })
  email!: string;

  @ApiPropertyOptional({
    description: 'Telefone fixo (10 dígitos com DDD)',
    example: '1134567890',
  })
  @IsOptional()
  @IsString()
  @IsValidPhone({ message: 'Telefone fixo inválido' })
  telefone_fixo?: string;

  @ApiProperty({
    description:
      'Telefone celular/WhatsApp (11 dígitos com DDD, começando com 9)',
    example: '11999887766',
  })
  @IsString()
  @IsNotEmpty({ message: 'Telefone celular/WhatsApp é obrigatório' })
  @IsValidPhone({ message: 'Telefone celular inválido' })
  telefone_celular!: string;

  @ApiPropertyOptional({})
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

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  cep?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  pais?: string;

  // Responsável Legal
  @ApiProperty({
    description:
      'Nome completo do responsável legal (apenas letras, espaços e caracteres especiais)',
  })
  @IsString({ message: 'Nome do responsável deve ser uma string' })
  @IsNotEmpty({ message: 'Nome do responsável legal é obrigatório' })
  @Length(1, 150, {
    message: 'Nome do responsável deve ter entre 1 e 150 caracteres',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, {
    message:
      'Nome do responsável deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  @IsValidName()
  responsavel_nome!: string;

  @ApiProperty({
    description: 'CPF do responsável legal (apenas números)',
  })
  @IsString({ message: 'CPF deve ser uma string' })
  @IsNotEmpty({ message: 'CPF do responsável legal é obrigatório' })
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos',
  })
  responsavel_cpf!: string;

  @ApiPropertyOptional({
    description: 'Cargo/Função (apenas letras, espaços e caracteres especiais)',
  })
  @IsOptional()
  @IsString({ message: 'Cargo deve ser uma string' })
  @Length(1, 100, { message: 'Cargo deve ter entre 1 e 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'\/&.()]+$/, {
    message:
      'Cargo deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  responsavel_cargo?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  @IsString()
  responsavel_email?: string;

  @ApiPropertyOptional({
    description: 'Telefone do responsável (10 ou 11 dígitos com DDD)',
    example: '11999887766',
  })
  @IsOptional()
  @IsString()
  @IsValidPhone({ message: 'Telefone do responsável inválido' })
  responsavel_telefone?: string;

  // Informações da Franquia
  @ApiPropertyOptional({})
  @IsOptional()
  @IsInt({ message: 'Ano de fundação deve ser um número inteiro' })
  @Min(1900, { message: 'Ano de fundação deve ser maior que 1900' })
  @Max(new Date().getFullYear(), {
    message: 'Ano de fundação não pode ser no futuro',
  })
  ano_fundacao?: number;

  @ApiPropertyOptional({
    description: 'Missão da franquia',
  })
  @IsOptional()
  @IsString()
  missao?: string;

  @ApiPropertyOptional({
    description: 'Visão da franquia',
  })
  @IsOptional()
  @IsString()
  visao?: string;

  @ApiPropertyOptional({
    description: 'Valores da franquia',
  })
  @IsOptional()
  @IsString()
  valores?: string;

  @ApiPropertyOptional({
    description: 'Histórico/Descrição',
  })
  @IsOptional()
  @IsString()
  historico?: string;

  @ApiPropertyOptional({
    description: 'URL ou nome do arquivo do logotipo',
  })
  @IsOptional()
  @IsString()
  logotipo_url?: string;

  // Dados Financeiros
  @ApiPropertyOptional({
    description: 'Data do contrato',
  })
  @IsOptional()
  @IsString()
  data_contrato?: string;

  @ApiPropertyOptional({})
  @IsOptional()
  taxa_franquia?: number;

  @ApiPropertyOptional({})
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
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'&.()]+$/, {
    message:
      'Nome deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
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
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'&.()]+$/, {
    message:
      'Razão social deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  razao_social?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 150)
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'&.()]+$/, {
    message:
      'Nome fantasia deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  nome_fantasia?: string;

  @ApiPropertyOptional({
    description: 'Inscrição estadual (apenas números)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20, {
    message: 'Inscrição estadual deve ter entre 1 e 20 caracteres',
  })
  @Matches(/^\d+$/, {
    message: 'Inscrição estadual deve conter apenas números',
  })
  inscricao_estadual?: string;

  @ApiPropertyOptional({
    description: 'Inscrição municipal (apenas números)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 20, {
    message: 'Inscrição municipal deve ter entre 1 e 20 caracteres',
  })
  @Matches(/^\d+$/, {
    message: 'Inscrição municipal deve conter apenas números',
  })
  inscricao_municipal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Telefone fixo (10 dígitos com DDD)',
    example: '1134567890',
  })
  @IsOptional()
  @IsString()
  @IsValidPhone({ message: 'Telefone fixo inválido' })
  telefone_fixo?: string;

  @ApiPropertyOptional({
    description:
      'Telefone celular/WhatsApp (11 dígitos com DDD, começando com 9)',
    example: '11999887766',
  })
  @IsOptional()
  @IsString()
  @IsValidPhone({ message: 'Telefone celular inválido' })
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
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, {
    message:
      'Nome do responsável deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  @IsValidName()
  responsavel_nome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel_cpf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-ZÀ-ÿ\s\-'\/&.()]+$/, {
    message:
      'Cargo deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  responsavel_cargo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  responsavel_email?: string;

  @ApiPropertyOptional({
    description: 'Telefone do responsável (10 ou 11 dígitos com DDD)',
    example: '11999887766',
  })
  @IsOptional()
  @IsString()
  @IsValidPhone({ message: 'Telefone do responsável inválido' })
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
  })
  @IsOptional()
  @IsString()
  usuario_id?: string;
}
