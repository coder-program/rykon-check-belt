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
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Genero, StatusAluno, FaixaEnum } from '../entities/aluno.entity';

export class CreateAlunoDto {
  // ===== DADOS PESSOAIS =====
  @IsString()
  @IsNotEmpty({ message: 'Nome completo é obrigatório' })
  @Length(3, 255, { message: 'Nome deve ter entre 3 e 255 caracteres' })
  nome_completo: string;

  @IsString()
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos',
  })
  cpf: string;

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
  @Matches(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (00) 00000-0000',
  })
  telefone?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, {
    message: 'Telefone de emergência deve estar no formato (00) 00000-0000',
  })
  telefone_emergencia?: string;

  @IsString()
  @IsOptional()
  @Length(3, 255)
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

  @IsUUID('4', { message: 'ID de unidade inválido' })
  @IsNotEmpty({ message: 'Unidade é obrigatória' })
  unidade_id: string;

  @IsEnum(StatusAluno, { message: 'Status inválido' })
  @IsOptional()
  status?: StatusAluno;

  // ===== GRADUAÇÃO =====
  @IsEnum(FaixaEnum, { message: 'Faixa inválida' })
  @IsOptional()
  faixa_atual?: FaixaEnum;

  @IsInt({ message: 'Graus deve ser um número inteiro' })
  @Min(0, { message: 'Graus deve ser no mínimo 0' })
  @Max(4, { message: 'Graus deve ser no máximo 4' })
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? 0 : parseInt(value),
  )
  graus?: number;

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
  responsavel_nome?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{11}$/, {
    message: 'CPF do responsável deve conter exatamente 11 dígitos numéricos',
  })
  responsavel_cpf?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, {
    message: 'Telefone do responsável deve estar no formato (00) 00000-0000',
  })
  responsavel_telefone?: string;

  @IsString()
  @IsOptional()
  @Length(2, 50)
  responsavel_parentesco?: string;

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
  @Length(1, 500)
  foto_url?: string;
}
