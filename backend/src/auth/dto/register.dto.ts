import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  IsDateString,
  Matches,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidName } from '../../common/decorators/is-valid-name.decorator';
import { IsValidCPF } from '../../common/decorators/is-valid-cpf.decorator';
import { FaixaEnum } from '../../people/entities/aluno.entity';

export class RegisterDto {
  @ApiProperty({ example: 'João da Silva' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @IsValidName()
  nome: string;

  @ApiProperty({
    example: 'joao.silva',
    description:
      'Username único (letras, números e ponto - sem espaços ou caracteres especiais)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9.]+$/, {
    message: 'Username deve conter apenas letras, números e ponto',
  })
  username: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: '12345678909',
    description: 'CPF com 11 dígitos (sem formatação)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/, {
    message: 'CPF deve conter exatamente 11 dígitos numéricos',
  })
  @IsValidCPF({
    message: 'CPF inválido - verifique os dígitos verificadores',
  })
  cpf: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: '11999999999',
    description: 'Telefone com DDD (apenas números, 10 ou 11 dígitos)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,11}$/, {
    message: 'Telefone deve conter 10 ou 11 dígitos numéricos (com DDD)',
  })
  telefone: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsDateString()
  @IsNotEmpty()
  data_nascimento: string;

  @ApiProperty({
    example: 'uuid-do-perfil',
    required: false,
    description: 'ID do perfil (padrão: aluno)',
  })
  @IsOptional()
  @IsUUID()
  perfil_id?: string;

  @ApiProperty({
    example: 'uuid-da-unidade',
    required: false,
    description: 'ID da unidade (obrigatório para ALUNO e RESPONSAVEL)',
  })
  @IsOptional()
  @IsUUID()
  unidade_id?: string;

  @ApiProperty({
    example: 'BRANCA',
    required: false,
    description: 'Faixa atual do aluno',
  })
  @IsOptional()
  @IsEnum(FaixaEnum, { message: 'Faixa inválida' })
  faixa_atual?: FaixaEnum;

  @ApiProperty({
    example: 0,
    required: false,
    description: 'Graus na faixa atual (0-4)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  graus?: number;

  @ApiProperty({
    example: '2024-01-15',
    required: false,
    description: 'Data da última graduação',
  })
  @IsOptional()
  @IsDateString()
  data_ultima_graduacao?: string;

  @ApiProperty({
    example: 'MASCULINO',
    required: false,
    description: 'Gênero do aluno',
  })
  @IsOptional()
  @IsString()
  genero?: string;

  @ApiProperty({
    example: 'Nome do Responsável',
    required: false,
    description: 'Nome do responsável (obrigatório para menores de 16 anos)',
  })
  @IsOptional()
  @IsString()
  responsavel_nome?: string;

  @ApiProperty({
    example: '12345678909',
    required: false,
    description: 'CPF do responsável (obrigatório para menores de 16 anos)',
  })
  @IsOptional()
  @IsString()
  responsavel_cpf?: string;

  @ApiProperty({
    example: '11999999999',
    required: false,
    description:
      'Telefone do responsável (obrigatório para menores de 16 anos)',
  })
  @IsOptional()
  @IsString()
  responsavel_telefone?: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Consentimento para uso de dados pessoais conforme LGPD',
  })
  @IsOptional()
  @IsBoolean()
  consent_uso_dados_lgpd?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Consentimento para uso de imagem em divulgações',
  })
  @IsOptional()
  @IsBoolean()
  consent_uso_imagem?: boolean;
}
