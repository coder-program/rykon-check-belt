import {
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
  IsEmail,
  IsNumber,
  Min,
  Max,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  TipoCadastro,
  StatusCadastro,
  Genero,
  FaixaAluno,
  FaixaProfessor,
} from '../entities/person.entity';

export class CreatePersonDto {
  @IsEnum(TipoCadastro)
  @IsNotEmpty()
  tipo_cadastro: TipoCadastro;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsNotEmpty()
  nome_completo: string;

  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos',
  })
  @IsNotEmpty()
  cpf: string;

  @IsDateString()
  @IsNotEmpty()
  data_nascimento: string;

  @IsEnum(Genero)
  @IsOptional()
  genero?: Genero;

  @IsString()
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (99) 99999-9999',
  })
  @IsNotEmpty()
  telefone_whatsapp: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  // Endereço (opcional)
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, {
    message: 'CEP deve estar no formato 00000-000',
  })
  @IsOptional()
  cep?: string;

  @IsString()
  @MaxLength(255)
  @IsOptional()
  logradouro?: string;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  numero?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  complemento?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  bairro?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  cidade?: string;

  @IsString()
  @MaxLength(2)
  @IsOptional()
  uf?: string;

  @IsString()
  @IsOptional()
  unidade_id?: string;

  @IsEnum(StatusCadastro)
  @IsOptional()
  status?: StatusCadastro = StatusCadastro.ATIVO;

  // ===== CAMPOS ESPECÍFICOS DE ALUNO =====
  @ValidateIf((o) => o.tipo_cadastro === TipoCadastro.ALUNO)
  @IsString()
  @IsNotEmpty()
  faixa_atual?: string;

  @ValidateIf((o) => o.tipo_cadastro === TipoCadastro.ALUNO)
  @IsNumber()
  @Min(0)
  @Max(4)
  @IsOptional()
  grau_atual?: number;

  // Responsável (obrigatório para menores de 18 anos)
  @ValidateIf(
    (o) => o.tipo_cadastro === TipoCadastro.ALUNO && isMinor(o.data_nascimento),
  )
  @IsString()
  @IsNotEmpty()
  responsavel_nome?: string;

  @ValidateIf(
    (o) => o.tipo_cadastro === TipoCadastro.ALUNO && isMinor(o.data_nascimento),
  )
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'CPF do responsável deve conter exatamente 11 dígitos numéricos',
  })
  @IsNotEmpty()
  responsavel_cpf?: string;

  @ValidateIf(
    (o) => o.tipo_cadastro === TipoCadastro.ALUNO && isMinor(o.data_nascimento),
  )
  @IsString()
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, {
    message: 'Telefone do responsável deve estar no formato (99) 99999-9999',
  })
  @IsNotEmpty()
  responsavel_telefone?: string;

  // ===== CAMPOS ESPECÍFICOS DE PROFESSOR =====
  @ValidateIf((o) => o.tipo_cadastro === TipoCadastro.PROFESSOR)
  @IsString()
  @IsNotEmpty()
  faixa_ministrante?: string;

  @ValidateIf((o) => o.tipo_cadastro === TipoCadastro.PROFESSOR)
  @IsDateString()
  @IsOptional()
  data_inicio_docencia?: string;

  @ValidateIf((o) => o.tipo_cadastro === TipoCadastro.PROFESSOR)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  registro_profissional?: string;

  @IsString()
  @IsOptional()
  observacoes?: string;
}

// Função auxiliar para verificar se é menor de idade
function isMinor(dataNascimento: string): boolean {
  if (!dataNascimento) return false;

  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();

  if (
    mesAtual < mesNascimento ||
    (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())
  ) {
    idade--;
  }

  return idade < 18;
}
