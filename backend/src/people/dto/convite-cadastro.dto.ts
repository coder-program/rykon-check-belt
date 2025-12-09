import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsUUID } from 'class-validator';

export class CriarConviteDto {
  @ApiProperty({
    description: 'Tipo de cadastro',
    enum: ['ALUNO', 'RESPONSAVEL'],
  })
  @IsEnum(['ALUNO', 'RESPONSAVEL'])
  tipo_cadastro: 'ALUNO' | 'RESPONSAVEL';

  @ApiProperty({ description: 'ID da unidade' })
  @IsUUID()
  unidade_id: string;

  @ApiProperty({ description: 'Email do convidado', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Telefone do convidado', required: false })
  @IsString()
  @IsOptional()
  telefone?: string;

  @ApiProperty({ description: 'Nome para pré-cadastro', required: false })
  @IsString()
  @IsOptional()
  nome_pre_cadastro?: string;

  @ApiProperty({ description: 'CPF para pré-cadastro', required: false })
  @IsString()
  @IsOptional()
  cpf?: string;

  @ApiProperty({ description: 'Observações', required: false })
  @IsString()
  @IsOptional()
  observacoes?: string;
}

export class CompletarCadastroDto {
  @ApiProperty({ description: 'Token do convite' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Nome completo' })
  @IsString()
  nome_completo: string;

  @ApiProperty({ description: 'CPF' })
  @IsString()
  cpf: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Telefone' })
  @IsString()
  telefone: string;

  @ApiProperty({ description: 'Data de nascimento' })
  @IsString()
  data_nascimento: string;

  @ApiProperty({ description: 'Gênero', required: false })
  @IsString()
  @IsOptional()
  genero?: string;

  @ApiProperty({ description: 'CEP', required: false })
  @IsString()
  @IsOptional()
  cep?: string;

  @ApiProperty({ description: 'Logradouro', required: false })
  @IsString()
  @IsOptional()
  logradouro?: string;

  @ApiProperty({ description: 'Número', required: false })
  @IsString()
  @IsOptional()
  numero?: string;

  @ApiProperty({ description: 'Complemento', required: false })
  @IsString()
  @IsOptional()
  complemento?: string;

  @ApiProperty({ description: 'Bairro', required: false })
  @IsString()
  @IsOptional()
  bairro?: string;

  @ApiProperty({ description: 'Cidade', required: false })
  @IsString()
  @IsOptional()
  cidade?: string;

  @ApiProperty({ description: 'Estado', required: false })
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiProperty({ description: 'Senha', required: false })
  @IsString()
  @IsOptional()
  senha?: string;

  @ApiProperty({ description: 'Faixa atual', required: false })
  @IsString()
  @IsOptional()
  faixa_atual?: string;

  @ApiProperty({ description: 'Grau atual', required: false })
  @IsString()
  @IsOptional()
  grau_atual?: string;

  @ApiProperty({
    description: 'Nome do responsável (se menor)',
    required: false,
  })
  @IsString()
  @IsOptional()
  responsavel_nome?: string;

  @ApiProperty({
    description: 'CPF do responsável (se menor)',
    required: false,
  })
  @IsString()
  @IsOptional()
  responsavel_cpf?: string;

  @ApiProperty({
    description: 'Telefone do responsável (se menor)',
    required: false,
  })
  @IsString()
  @IsOptional()
  responsavel_telefone?: string;
}
