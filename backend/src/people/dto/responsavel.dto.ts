import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsEnum,
  IsUUID,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum GeneroResponsavel {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
}

export class CreateResponsavelDto {
  @IsString()
  @MaxLength(255)
  nome_completo: string;

  @IsString()
  @MinLength(11)
  @MaxLength(11)
  cpf: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  rg?: string;

  @IsDateString()
  @IsOptional()
  data_nascimento?: string;

  @IsEnum(GeneroResponsavel)
  @IsOptional()
  genero?: GeneroResponsavel;

  // Contato
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(20)
  telefone: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefone_secundario?: string;

  // Endereço
  @IsString()
  @IsOptional()
  @MaxLength(10)
  cep?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  logradouro?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  numero?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  complemento?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bairro?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  cidade?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  estado?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  pais?: string;

  // Profissional
  @IsString()
  @IsOptional()
  @MaxLength(100)
  profissao?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  empresa?: string;

  @IsNumber()
  @IsOptional()
  renda_familiar?: number;

  // Sistema
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  foto_url?: string;

  // Unidade (obrigatório)
  @IsUUID()
  @IsNotEmpty({ message: 'Unidade é obrigatória para cadastro de responsável' })
  unidade_id: string;

  // Consentimentos LGPD
  @IsBoolean()
  @IsOptional()
  consent_uso_dados_lgpd?: boolean;

  @IsBoolean()
  @IsOptional()
  consent_uso_imagem?: boolean;
}

export class UpdateResponsavelDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  nome_completo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  rg?: string;

  @IsDateString()
  @IsOptional()
  data_nascimento?: string;

  @IsEnum(GeneroResponsavel)
  @IsOptional()
  genero?: GeneroResponsavel;

  // Contato
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  telefone_secundario?: string;

  // Endereço
  @IsString()
  @IsOptional()
  @MaxLength(10)
  cep?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  logradouro?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10)
  numero?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  complemento?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bairro?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  cidade?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  estado?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  pais?: string;

  // Profissional
  @IsString()
  @IsOptional()
  @MaxLength(100)
  profissao?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  empresa?: string;

  @IsNumber()
  @IsOptional()
  renda_familiar?: number;

  // Sistema
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsString()
  @IsOptional()
  observacoes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  foto_url?: string;

  // Consentimentos LGPD
  @IsBoolean()
  @IsOptional()
  consent_uso_dados_lgpd?: boolean;

  @IsBoolean()
  @IsOptional()
  consent_uso_imagem?: boolean;
}
