import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsEnum,
  IsDateString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { IsValidName } from '../../common/decorators/is-valid-name.decorator';

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
  @MinLength(3, { message: 'Username deve ter no mínimo 3 caracteres' })
  @Matches(/^[a-zA-Z0-9.]+$/, {
    message: 'Username deve conter apenas letras, números e ponto',
  })
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  @Length(3, 150, { message: 'Nome deve ter entre 3 e 150 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s\-']+$/, {
    message:
      'Nome deve conter apenas letras, espaços e caracteres especiais permitidos',
  })
  @IsValidName()
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

  @IsOptional()
  @IsString()
  foto?: string;

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

  @IsOptional()
  @IsString()
  especialidades?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

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
