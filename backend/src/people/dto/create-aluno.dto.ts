import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsUUID,
  Min,
  Max,
  Matches,
  Length,
  ValidateIf,
  IsInt,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Genero, StatusAluno, FaixaEnum } from '../entities/aluno.entity';
import { IsValidName } from '../../common/decorators/is-valid-name.decorator';

// DTO para unidades do aluno
export class AlunoUnidadeDto {
  @ApiProperty({
    description: 'ID da unidade onde o aluno será matriculado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'ID de unidade inválido' })
  @IsNotEmpty({ message: 'ID da unidade é obrigatório' })
  unidade_id: string;

  @ApiPropertyOptional({
    description: 'Data de matrícula do aluno nesta unidade',
    example: '2024-01-15',
  })
  @IsDateString({}, { message: 'Data de matrícula inválida' })
  @IsOptional()
  data_matricula?: string;

  @ApiPropertyOptional({
    description:
      'Define se esta é a unidade principal do aluno (apenas uma pode ser principal)',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'Is principal deve ser um booleano' })
  @IsOptional()
  is_principal?: boolean;

  @ApiPropertyOptional({
    description: 'Observações sobre a matrícula nesta unidade',
    example: 'Aluno transferido da unidade X',
  })
  @IsString()
  @IsOptional()
  observacoes?: string;
}

export class CreateAlunoDto {
  // ===== ID DO USUÁRIO (OPCIONAL) =====
  @ApiPropertyOptional({
    description:
      'ID do usuário associado ao aluno (opcional - será criado automaticamente se não fornecido)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'ID de usuário inválido' })
  @IsOptional()
  usuario_id?: string;

  // ===== DADOS PESSOAIS =====
  @IsString()
  @IsValidName()
  nome_completo: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos',
  })
  cpf?: string;

  @IsDateString({}, { message: 'Data de nascimento inválida' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  data_nascimento: string;

  @IsEnum(Genero, { message: 'Gênero inválido' })
  @IsNotEmpty({ message: 'Gênero é obrigatório' })
  genero: Genero;

  // ===== CONTATO =====
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsString()
  @IsOptional()
  telefone_emergencia?: string;

  @IsString()
  @IsOptional()
  @Length(3, 255)
  @IsValidName()
  nome_contato_emergencia?: string;

  // ===== ENDEREÇO =====
  @IsUUID('4', { message: 'ID de endereço inválido' })
  @IsOptional()
  endereco_id?: string;

  // ===== DADOS DE MATRÍCULA =====
  @IsString()
  @IsOptional()
  @Length(1, 20)
  numero_matricula?: string;

  @IsDateString({}, { message: 'Data de matrícula inválida' })
  @IsOptional()
  data_matricula?: string;

  // ===== UNIDADES (NOVO SISTEMA) =====
  @ApiPropertyOptional({
    description:
      'Lista de unidades onde o aluno será matriculado. Se não especificado, usar unidade_id',
    type: [AlunoUnidadeDto],
    example: [
      {
        unidade_id: '123e4567-e89b-12d3-a456-426614174000',
        data_matricula: '2024-01-15',
        is_principal: true,
        observacoes: 'Unidade principal',
      },
      {
        unidade_id: '456e7890-e89b-12d3-a456-426614174111',
        data_matricula: '2024-02-01',
        is_principal: false,
        observacoes: 'Unidade secundária para treinos especiais',
      },
    ],
  })
  @IsArray({ message: 'Unidades deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => AlunoUnidadeDto)
  @IsOptional()
  unidades?: AlunoUnidadeDto[];

  // ===== COMPATIBILIDADE (SISTEMA ANTIGO) =====
  @ApiPropertyOptional({
    description:
      'ID da unidade (sistema legado). Use apenas se não especificar o array "unidades"',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'ID de unidade inválido' })
  @ValidateIf((obj) => !obj.unidades || obj.unidades.length === 0)
  @IsNotEmpty({
    message: 'Unidade é obrigatória se não especificar array de unidades',
  })
  unidade_id?: string;

  @IsEnum(StatusAluno, { message: 'Status inválido' })
  @IsOptional()
  status?: StatusAluno;

  // ===== GRADUAÇÃO =====
  // NOTA: faixa_atual e graus removidos - usar sistema de graduação (aluno_faixa)

  @IsDateString({}, { message: 'Data de última graduação inválida' })
  @IsOptional()
  data_ultima_graduacao?: string;

  // ===== DADOS MÉDICOS =====
  @IsString()
  @IsOptional()
  observacoes_medicas?: string;

  @IsString()
  @IsOptional()
  alergias?: string;

  @IsString()
  @IsOptional()
  medicamentos_uso_continuo?: string;

  // ===== RESPONSÁVEL (obrigatório para menores) =====
  @IsString()
  @IsOptional()
  @Length(3, 255)
  @IsValidName()
  responsavel_nome?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{11}$/, {
    message: 'CPF do responsável deve conter exatamente 11 dígitos numéricos',
  })
  responsavel_cpf?: string;

  @IsString()
  @IsOptional()
  responsavel_telefone?: string;

  @IsString()
  @IsOptional()
  @Length(2, 50)
  responsavel_parentesco?: string;

  @ApiPropertyOptional({
    description: 'ID do responsável vinculado ao aluno',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'ID de responsável inválido' })
  @IsOptional()
  responsavel_id?: string;

  // ===== DADOS FINANCEIROS =====
  @IsInt({ message: 'Dia de vencimento deve ser um número inteiro' })
  @Min(1, { message: 'Dia de vencimento deve ser entre 1 e 31' })
  @Max(31, { message: 'Dia de vencimento deve ser entre 1 e 31' })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : parseInt(value),
  )
  dia_vencimento?: number;

  @IsNumber({}, { message: 'Valor da mensalidade deve ser um número' })
  @Min(0, { message: 'Valor da mensalidade deve ser positivo' })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : parseFloat(value),
  )
  valor_mensalidade?: number;

  @IsNumber({}, { message: 'Desconto percentual deve ser um número' })
  @Min(0, { message: 'Desconto deve ser no mínimo 0' })
  @Max(100, { message: 'Desconto deve ser no máximo 100' })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? 0 : parseFloat(value),
  )
  desconto_percentual?: number;

  // ===== METADADOS =====
  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsString()
  @IsOptional()
  foto_url?: string;
}

// DTO para responsável cadastrando dependente (CPF opcional)
export class CreateDependenteDto {
  // ===== DADOS PESSOAIS =====
  @IsString()
  @IsNotEmpty({ message: 'Nome completo é obrigatório' })
  @Length(3, 255, { message: 'Nome deve ter entre 3 e 255 caracteres' })
  nome_completo: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos',
  })
  cpf?: string;

  @IsDateString({}, { message: 'Data de nascimento inválida' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  data_nascimento: string;

  @IsEnum(Genero, { message: 'Gênero inválido' })
  @IsNotEmpty({ message: 'Gênero é obrigatório' })
  genero: Genero;

  // ===== CONTATO =====
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  telefone?: string;

  @IsString()
  @IsOptional()
  telefone_emergencia?: string;

  @IsString()
  @IsOptional()
  nome_contato_emergencia?: string;

  // ===== VÍNCULO ACADÊMICO =====
  @IsUUID('4', { message: 'ID da unidade inválido' })
  @IsNotEmpty({ message: 'Unidade é obrigatória' })
  unidade_id: string;

  @IsDateString({}, { message: 'Data de matrícula inválida' })
  @IsOptional()
  data_matricula?: string;

  @IsString()
  @IsOptional()
  numero_matricula?: string;

  @IsEnum(StatusAluno, { message: 'Status inválido' })
  @IsOptional()
  status?: StatusAluno;

  // ===== GRADUAÇÃO =====
  @IsEnum(FaixaEnum, { message: 'Faixa inválida' })
  @IsOptional()
  faixa_atual?: FaixaEnum;

  @IsInt()
  @Min(0, { message: 'Graus não pode ser negativo' })
  @IsOptional()
  graus?: number;

  @IsDateString({}, { message: 'Data de última graduação inválida' })
  @IsOptional()
  data_ultima_graduacao?: string;

  // ===== RESPONSÁVEL =====
  @IsUUID('4', { message: 'ID do responsável inválido' })
  @IsOptional()
  responsavel_id?: string;

  @IsString()
  @IsOptional()
  responsavel_nome?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{11}$/, {
    message: 'CPF do responsável deve conter exatamente 11 dígitos numéricos',
  })
  responsavel_cpf?: string;

  @IsString()
  @IsOptional()
  responsavel_telefone?: string;

  @IsString()
  @IsOptional()
  responsavel_parentesco?: string;

  // ===== INFORMAÇÕES MÉDICAS =====
  @IsString()
  @IsOptional()
  observacoes_medicas?: string;

  @IsString()
  @IsOptional()
  alergias?: string;

  @IsString()
  @IsOptional()
  medicamentos_uso_continuo?: string;

  // ===== FINANCEIRO =====
  @IsInt()
  @Min(1, { message: 'Dia de vencimento deve ser entre 1 e 31' })
  @Max(31, { message: 'Dia de vencimento deve ser entre 1 e 31' })
  @IsOptional()
  dia_vencimento?: number;

  @IsNumber()
  @Min(0, { message: 'Valor da mensalidade deve ser positivo' })
  @IsOptional()
  valor_mensalidade?: number;

  @IsNumber()
  @Min(0, { message: 'Desconto não pode ser negativo' })
  @Max(100, { message: 'Desconto não pode ser superior a 100%' })
  @IsOptional()
  desconto_percentual?: number;

  // ===== METADADOS =====
  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsString()
  @IsOptional()
  @Length(1, 500)
  foto_url?: string;
}
