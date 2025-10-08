import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Matches,
  Min,
} from 'class-validator';
import {
  StatusUnidade,
  PapelResponsavel,
  HorariosFuncionamento,
  Modalidade,
} from '../entities/unidade.entity';

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

  @ApiProperty({ example: '12.345.678/0001-90' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX',
  })
  cnpj!: string;

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

  @ApiPropertyOptional({ example: '9876543' })
  @IsOptional()
  @IsString()
  inscricao_municipal?: string;

  @ApiPropertyOptional({
    example: 'TCR001',
    description: 'Código interno (gerado automaticamente se não fornecido)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  codigo_interno?: string;

  // Contato
  @ApiPropertyOptional({ example: '(11) 3456-7890' })
  @IsOptional()
  @IsString()
  @Matches(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, {
    message: 'Telefone deve estar no formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX',
  })
  telefone_fixo?: string;

  @ApiProperty({ example: '(11) 98765-4321' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\(\d{2}\)\s\d{5}-\d{4}$/, {
    message: 'Telefone celular deve estar no formato (XX) XXXXX-XXXX',
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

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  responsavel_nome!: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  @Length(11, 14)
  responsavel_cpf!: string;

  @ApiProperty({
    enum: ['PROPRIETARIO', 'GERENTE', 'INSTRUTOR', 'ADMINISTRATIVO'],
  })
  @IsEnum(['PROPRIETARIO', 'GERENTE', 'INSTRUTOR', 'ADMINISTRATIVO'])
  responsavel_papel!: PapelResponsavel;

  @ApiProperty({ example: '(11) 99999-9999' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  responsavel_contato!: string;

  // Estrutura
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtde_tatames?: number;

  @ApiPropertyOptional({ example: 120.5, description: 'Área do tatame em m²' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area_tatame_m2?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacidade_max_alunos?: number;

  @ApiPropertyOptional({ example: 5, description: 'Quantidade de instrutores' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtde_instrutores?: number;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_plano_padrao?: number;

  @ApiPropertyOptional({
    example: { seg: '06:00-22:00', ter: '06:00-22:00', sab: '08:00-16:00' },
    description: 'Horários por dia da semana',
  })
  @IsOptional()
  horarios_funcionamento?: HorariosFuncionamento;

  @ApiPropertyOptional({
    example: ['INFANTIL', 'ADULTO', 'COMPETICAO'],
    enum: [
      'INFANTIL',
      'ADULTO',
      'NO-GI',
      'COMPETICAO',
      'FEMININO',
      'AUTODEFESA',
      'CONDICIONAMENTO',
    ],
    isArray: true,
  })
  @IsOptional()
  modalidades?: Modalidade[];

  @ApiPropertyOptional({ description: 'ID do endereço da unidade' })
  @IsOptional()
  @IsString()
  endereco_id?: string;

  // Responsável Técnico
  @ApiPropertyOptional({
    description: 'ID do instrutor principal (faixa-preta)',
  })
  @IsOptional()
  @IsUUID()
  instrutor_principal_id?: string;
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
  @IsNotEmpty()
  @Length(14, 18)
  cnpj?: string;

  @ApiPropertyOptional({ enum: ['ATIVA', 'INATIVA', 'HOMOLOGACAO'] })
  @IsOptional()
  @IsEnum(['ATIVA', 'INATIVA', 'HOMOLOGACAO'])
  status?: StatusUnidade;

  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  responsavel_nome?: string;

  @ApiPropertyOptional({ example: '123.456.789-00' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(11, 14)
  responsavel_cpf?: string;

  @ApiPropertyOptional({
    enum: ['PROPRIETARIO', 'GERENTE', 'INSTRUTOR', 'ADMINISTRATIVO'],
  })
  @IsOptional()
  @IsEnum(['PROPRIETARIO', 'GERENTE', 'INSTRUTOR', 'ADMINISTRATIVO'])
  responsavel_papel?: PapelResponsavel;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  responsavel_contato?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  qtde_tatames?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacidade_max_alunos?: number;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  valor_plano_padrao?: number;

  @ApiPropertyOptional({
    example: { seg: '06:00-22:00', ter: '06:00-22:00', sab: '08:00-16:00' },
    description: 'Horários por dia da semana',
  })
  @IsOptional()
  horarios_funcionamento?: HorariosFuncionamento;

  @ApiPropertyOptional({
    example: ['INFANTIL', 'ADULTO', 'COMPETICAO'],
    enum: [
      'INFANTIL',
      'ADULTO',
      'NO-GI',
      'COMPETICAO',
      'FEMININO',
      'AUTODEFESA',
      'CONDICIONAMENTO',
    ],
    isArray: true,
  })
  @IsOptional()
  modalidades?: Modalidade[];

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

  @ApiPropertyOptional({ example: '1', default: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '20', default: '20' })
  @IsOptional()
  @IsString()
  pageSize?: string;
}
