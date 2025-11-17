import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {
  StatusUnidade,
  HorariosFuncionamento,
} from '../entities/unidade.entity';

// Função auxiliar para validar CNPJ
function isValidCNPJ(cnpj: string): boolean {
  // Remove formatação
  const cleaned = cnpj.replace(/\D/g, '');

  // CNPJ deve ter 14 dígitos
  if (cleaned.length !== 14) {
    return false;
  }

  // Elimina CNPJs inválidos conhecidos
  if (/^(\d)\1+$/.test(cleaned)) {
    return false;
  }

  // Valida DVs (dígitos verificadores)
  let tamanho = cleaned.length - 2;
  let numeros = cleaned.substring(0, tamanho);
  const digitos = cleaned.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) {
    return false;
  }

  tamanho = tamanho + 1;
  numeros = cleaned.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) {
    return false;
  }

  return true;
}

// Decorador customizado para validar CNPJ
function IsCNPJ(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCNPJ',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return true; // Se vazio, deixa o IsOptional decidir
          const cleaned = value.replace(/\D/g, '');
          if (cleaned.length < 14) {
            return false; // CNPJ incompleto
          }
          return isValidCNPJ(value);
        },
        defaultMessage(args: ValidationArguments) {
          const value = args.value;
          if (value) {
            const cleaned = value.replace(/\D/g, '');
            if (cleaned.length < 14) {
              return 'CNPJ incompleto (14 dígitos necessários)';
            }
          }
          return 'CNPJ inválido';
        },
      },
    });
  };
}

export class CreateUnidadeDto {
  @ApiProperty({ description: 'ID do franqueado responsável' })
  @IsString()
  @IsNotEmpty()
  franqueado_id!: string;

  // Identificação
  @ApiProperty({ example: 'TeamCruz Barueri - Matriz' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  nome!: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  @IsCNPJ({ message: 'CNPJ inválido ou incompleto' })
  cnpj?: string;

  @ApiProperty({ example: 'TeamCruz Barueri Ltda' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  razao_social!: string;

  @ApiPropertyOptional({ example: 'TeamCruz Barueri' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nome_fantasia?: string;

  @ApiPropertyOptional({ example: '123.456.789.012' })
  @IsOptional()
  @IsString()
  inscricao_estadual?: string;

  @ApiPropertyOptional({
    example: '9876543',
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
  @ApiPropertyOptional({ example: '(11) 3456-7890' })
  @IsOptional()
  @IsString()
  @Matches(/^(\(\d{2}\)\s?\d{4,5}-?\d{4}|\d{10,11})$/, {
    message: 'Telefone fixo deve ter 10 ou 11 dígitos (com ou sem formatação)',
  })
  telefone_fixo?: string;

  @ApiProperty({ example: '(11) 98765-4321' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\(\d{2}\)\s?\d{5}-?\d{4}|\d{10,11})$/, {
    message:
      'Telefone celular deve ter 10 ou 11 dígitos (com ou sem formatação)',
  })
  telefone_celular!: string;

  @ApiProperty({ example: 'contato@teamcruz.com.br' })
  @IsEmail({}, { message: 'Email deve ser válido' })
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: 'https://www.lojateamcruz.com.br/' })
  @IsOptional()
  @IsUrl({}, { message: 'Website deve ser uma URL válida' })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  redes_sociais?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
  };

  @ApiPropertyOptional({
    enum: ['ATIVA', 'INATIVA', 'HOMOLOGACAO'],
    default: 'HOMOLOGACAO',
  })
  @IsOptional()
  @IsEnum(['ATIVA', 'INATIVA', 'HOMOLOGACAO'])
  status?: StatusUnidade;

  @ApiPropertyOptional({
    example: { seg: '06:00-22:00', ter: '06:00-22:00', sab: '08:00-16:00' },
    description: 'Horários por dia da semana',
  })
  @IsOptional()
  horarios_funcionamento?: HorariosFuncionamento;

  @ApiPropertyOptional({ description: 'ID do endereço da unidade' })
  @IsOptional()
  @IsString()
  endereco_id?: string;
}

export class UpdateUnidadeDto {
  @ApiPropertyOptional({ description: 'ID do franqueado responsável' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  franqueado_id?: string;

  @ApiPropertyOptional({ example: 'TeamCruz Barueri - Matriz' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  nome?: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsOptional()
  @IsString()
  @IsCNPJ({ message: 'CNPJ inválido ou incompleto' })
  cnpj?: string;

  @ApiPropertyOptional({ example: 'TeamCruz Barueri Ltda' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  razao_social?: string;

  @ApiPropertyOptional({ example: 'TeamCruz Barueri' })
  @IsOptional()
  @IsString()
  @Length(1, 150)
  nome_fantasia?: string;

  @ApiPropertyOptional({ example: '123.456.789.012' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  inscricao_estadual?: string;

  @ApiPropertyOptional({
    example: '9876543',
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

  @ApiPropertyOptional({ enum: ['ATIVA', 'INATIVA', 'HOMOLOGACAO'] })
  @IsOptional()
  @IsEnum(['ATIVA', 'INATIVA', 'HOMOLOGACAO'])
  status?: StatusUnidade;

  @ApiPropertyOptional({
    description: 'Define se check-ins da unidade precisam de aprovação',
    default: false,
  })
  @IsOptional()
  requer_aprovacao_checkin?: boolean;

  @ApiPropertyOptional({
    example: { seg: '06:00-22:00', ter: '06:00-22:00', sab: '08:00-16:00' },
    description: 'Horários por dia da semana',
  })
  @IsOptional()
  horarios_funcionamento?: HorariosFuncionamento;

  @ApiPropertyOptional({ description: 'ID do endereço da unidade' })
  @IsOptional()
  @IsString()
  endereco_id?: string;
}

export class UnidadeQueryDto {
  @ApiPropertyOptional({ example: 'TeamCruz' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['ATIVA', 'INATIVA', 'HOMOLOGACAO'] })
  @IsOptional()
  @IsEnum(['ATIVA', 'INATIVA', 'HOMOLOGACAO'])
  status?: StatusUnidade;

  @ApiPropertyOptional({ description: 'ID do franqueado para filtrar' })
  @IsOptional()
  @IsString()
  franqueado_id?: string;

  @ApiPropertyOptional({ example: '1', default: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '20', default: '20' })
  @IsOptional()
  @IsString()
  pageSize?: string;
}
