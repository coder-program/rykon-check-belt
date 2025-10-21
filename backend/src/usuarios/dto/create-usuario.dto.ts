import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsEnum,
  IsDateString,
} from 'class-validator';

export enum GeneroEnum {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
  OUTRO = 'OUTRO',
}

export enum TurnoEnum {
  MANHA = 'MANHA',
  TARDE = 'TARDE',
  NOITE = 'NOITE',
  INTEGRAL = 'INTEGRAL',
}

export enum FaixaMinistrante {
  AZUL = 'AZUL',
  ROXA = 'ROXA',
  MARROM = 'MARROM',
  PRETA = 'PRETA',
  CORAL = 'CORAL',
  VERMELHA = 'VERMELHA',
}

export class CreateUsuarioDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  nome: string;

  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsBoolean()
  cadastro_completo?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  perfil_ids?: string[];

  @IsOptional()
  @IsUUID()
  unidade_id?: string;

  // ===== Campos específicos para PROFESSOR/INSTRUTOR =====
  @IsOptional()
  @IsDateString()
  data_nascimento?: string;

  @IsOptional()
  @IsEnum(GeneroEnum)
  genero?: GeneroEnum;

  @IsOptional()
  @IsEnum(FaixaMinistrante)
  faixa_ministrante?: FaixaMinistrante;

  // ===== Campos específicos para RECEPCIONISTA =====
  @IsOptional()
  @IsEnum(TurnoEnum)
  turno?: TurnoEnum;

  @IsOptional()
  @IsString()
  horario_entrada?: string;

  @IsOptional()
  @IsString()
  horario_saida?: string;
}
