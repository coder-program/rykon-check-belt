import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsEnum,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SituacaoFranqueado } from '../entities/franqueado.entity';

export class CreateFranqueadoSimplifiedDto {
  // ==============================================
  // DADOS PESSOAIS DO RESPONSÁVEL (OBRIGATÓRIOS)
  // ==============================================

  @ApiProperty({
    description: 'Nome completo do responsável pela franquia',
    example: 'João Silva Santos',
    minLength: 3,
    maxLength: 150,
  })
  @IsString()
  @Length(3, 150, { message: 'Nome deve ter entre 3 e 150 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, {
    message:
      'Nome deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  nome: string;

  @ApiProperty({
    description: 'CPF do responsável (apenas números)',
    example: '12345678901',
    minLength: 11,
    maxLength: 11,
  })
  @IsString()
  @Length(11, 11, { message: 'CPF deve ter exatamente 11 dígitos' })
  @Matches(/^\d{11}$/, { message: 'CPF deve conter apenas números' })
  cpf: string;

  @ApiProperty({
    description: 'Email principal de contato',
    example: 'joao.silva@franquia.com',
  })
  @IsEmail({}, { message: 'Email deve ter formato válido' })
  @Length(5, 120, { message: 'Email deve ter entre 5 e 120 caracteres' })
  email: string;

  @ApiProperty({
    description: 'Telefone/WhatsApp principal (apenas números)',
    example: '11999887766',
    minLength: 10,
    maxLength: 11,
  })
  @IsString()
  @Length(10, 11, { message: 'Telefone deve ter 10 ou 11 dígitos' })
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve conter apenas números' })
  telefone: string;

  // ==============================================
  // CAMPOS OPCIONAIS
  // ==============================================

  @ApiPropertyOptional({
    description: 'ID do usuário vinculado a este franqueado',
    example: 'uuid-do-usuario',
  })
  @IsOptional()
  @IsUUID(4, { message: 'usuario_id deve ser um UUID válido' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'ID do endereço do franqueado',
    example: 'uuid-do-endereco',
  })
  @IsOptional()
  @IsUUID(4, { message: 'endereco_id deve ser um UUID válido' })
  endereco_id?: string;

  @ApiPropertyOptional({
    description: 'Array com IDs das unidades que este franqueado gerencia',
    example: ['uuid-unidade-1', 'uuid-unidade-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'unidades_gerencia deve ser um array' })
  @IsUUID(4, {
    each: true,
    message: 'Cada ID de unidade deve ser um UUID válido',
  })
  unidades_gerencia?: string[];

  @ApiPropertyOptional({
    description: 'Situação atual da franquia',
    enum: ['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'],
    example: 'EM_HOMOLOGACAO',
  })
  @IsOptional()
  @IsEnum(['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'], {
    message: 'Situação deve ser ATIVA, INATIVA ou EM_HOMOLOGACAO',
  })
  situacao?: SituacaoFranqueado;

  @ApiPropertyOptional({
    description: 'Se o franqueado está ativo no sistema',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'ativo deve ser true ou false' })
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Se o franqueado aceitou o contrato',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'contrato_aceito deve ser true ou false' })
  contrato_aceito?: boolean;

  @ApiPropertyOptional({
    description: 'Versão do contrato aceito',
    example: 'v1.0',
  })
  @IsOptional()
  @IsString()
  contrato_versao?: string;

  @ApiPropertyOptional({
    description: 'IP de onde o contrato foi aceito',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  contrato_ip?: string;
}

export class UpdateFranqueadoSimplifiedDto {
  @ApiPropertyOptional({
    description: 'Nome completo do responsável pela franquia',
    example: 'João Silva Santos',
    minLength: 3,
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @Length(3, 150, { message: 'Nome deve ter entre 3 e 150 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, {
    message:
      'Nome deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  nome?: string;

  @ApiPropertyOptional({
    description: 'CPF do responsável (apenas números)',
    example: '12345678901',
    minLength: 11,
    maxLength: 11,
  })
  @IsOptional()
  @IsString()
  @Length(11, 11, { message: 'CPF deve ter exatamente 11 dígitos' })
  @Matches(/^\d{11}$/, { message: 'CPF deve conter apenas números' })
  cpf?: string;

  @ApiPropertyOptional({
    description: 'Email principal de contato',
    example: 'joao.silva@franquia.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email deve ter formato válido' })
  @Length(5, 120, { message: 'Email deve ter entre 5 e 120 caracteres' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Telefone/WhatsApp principal (apenas números)',
    example: '11999887766',
    minLength: 10,
    maxLength: 11,
  })
  @IsOptional()
  @IsString()
  @Length(10, 11, { message: 'Telefone deve ter 10 ou 11 dígitos' })
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve conter apenas números' })
  telefone?: string;

  @ApiPropertyOptional({
    description: 'ID do usuário vinculado a este franqueado',
    example: 'uuid-do-usuario',
  })
  @IsOptional()
  @IsUUID(4, { message: 'usuario_id deve ser um UUID válido' })
  usuario_id?: string;

  @ApiPropertyOptional({
    description: 'ID do endereço do franqueado',
    example: 'uuid-do-endereco',
  })
  @IsOptional()
  @IsUUID(4, { message: 'endereco_id deve ser um UUID válido' })
  endereco_id?: string;

  @ApiPropertyOptional({
    description: 'Array com IDs das unidades que este franqueado gerencia',
    example: ['uuid-unidade-1', 'uuid-unidade-2'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'unidades_gerencia deve ser um array' })
  @IsUUID(4, {
    each: true,
    message: 'Cada ID de unidade deve ser um UUID válido',
  })
  unidades_gerencia?: string[];

  @ApiPropertyOptional({
    description: 'Situação atual da franquia',
    enum: ['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'],
    example: 'ATIVA',
  })
  @IsOptional()
  @IsEnum(['ATIVA', 'INATIVA', 'EM_HOMOLOGACAO'], {
    message: 'Situação deve ser ATIVA, INATIVA ou EM_HOMOLOGACAO',
  })
  situacao?: SituacaoFranqueado;

  @ApiPropertyOptional({
    description: 'Se o franqueado está ativo no sistema',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'ativo deve ser true ou false' })
  ativo?: boolean;

  @ApiPropertyOptional({
    description: 'Se o franqueado aceitou o contrato',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'contrato_aceito deve ser true ou false' })
  contrato_aceito?: boolean;

  @ApiPropertyOptional({
    description: 'Versão do contrato aceito',
    example: 'v1.0',
  })
  @IsOptional()
  @IsString()
  contrato_versao?: string;

  @ApiPropertyOptional({
    description: 'IP de onde o contrato foi aceito',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsString()
  contrato_ip?: string;
}
