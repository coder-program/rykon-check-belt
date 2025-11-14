import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
  Matches,
  Length,
  ArrayMinSize,
} from 'class-validator';
import {
  Genero,
  StatusCadastro,
  FaixaProfessor,
} from '../entities/person.entity';
import { IsValidName } from '../../common/decorators/is-valid-name.decorator';
import { IsMinimumAge } from '../../common/decorators/is-minimum-age.decorator';

export class CreateProfessorDto {
  // ===== DADOS PESSOAIS =====
  @IsString()
  @IsNotEmpty({ message: 'Nome completo é obrigatório' })
  @Length(3, 255)
  @IsValidName()
  nome_completo: string;

  @IsString()
  @IsNotEmpty({ message: 'CPF é obrigatório' })
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos',
  })
  cpf: string;

  @IsDateString({}, { message: 'Data de nascimento inválida' })
  @IsOptional()
  @IsMinimumAge(18, { message: 'Professor deve ter pelo menos 18 anos de idade' })
  data_nascimento?: string;

  @IsEnum(Genero, { message: 'Gênero inválido' })
  @IsOptional()
  genero?: Genero;

  // ===== CONTATO =====
  @IsEmail({}, { message: 'Email inválido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (00) 00000-0000',
  })
  telefone_whatsapp?: string;

  // ===== ENDEREÇO =====
  @IsString()
  @IsOptional()
  @Matches(/^\d{5}-\d{3}$/, {
    message: 'CEP deve estar no formato 00000-000',
  })
  cep?: string;

  @IsString()
  @IsOptional()
  logradouro?: string;

  @IsString()
  @IsOptional()
  numero?: string;

  @IsString()
  @IsOptional()
  complemento?: string;

  @IsString()
  @IsOptional()
  bairro?: string;

  @IsString()
  @IsOptional()
  cidade?: string;

  @IsString()
  @IsOptional()
  @Length(2, 2, { message: 'UF deve ter 2 caracteres' })
  uf?: string;

  // ===== UNIDADE PRINCIPAL =====
  @IsUUID('4', { message: 'ID de unidade inválido' })
  @IsNotEmpty({ message: 'Unidade principal é obrigatória' })
  unidade_id: string;

  // ===== USUARIO_ID (para complete-profile) =====
  @IsUUID('4', { message: 'ID de usuário inválido' })
  @IsOptional()
  usuario_id?: string;

  // ===== UNIDADES ADICIONAIS =====
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true, message: 'IDs de unidades inválidos' })
  unidades_adicionais?: string[];

  // ===== DADOS PROFISSIONAIS =====
  @IsEnum(FaixaProfessor, { message: 'Faixa ministrante inválida' })
  @IsNotEmpty({ message: 'Faixa ministrante é obrigatória' })
  faixa_ministrante: FaixaProfessor;

  @IsDateString({}, { message: 'Data de início de docência inválida' })
  @IsOptional()
  data_inicio_docencia?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100)
  registro_profissional?: string;

  // ===== STATUS =====
  @IsEnum(StatusCadastro, { message: 'Status inválido' })
  @IsOptional()
  status?: StatusCadastro;

  // ===== OBSERVAÇÕES =====
  @IsString()
  @IsOptional()
  observacoes?: string;
}
