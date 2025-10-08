import {
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CompleteProfileDto {
  // ===== DADOS OBRIGATÓRIOS =====
  @ApiProperty({
    description: 'ID da unidade onde o usuário vai atuar/treinar',
  })
  @IsNotEmpty()
  @IsUUID()
  unidade_id: string;

  @ApiProperty({ description: 'Data de nascimento (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Data de nascimento é obrigatória' })
  @IsDateString()
  data_nascimento: string;

  @ApiProperty({
    description: 'Gênero',
    enum: ['MASCULINO', 'FEMININO', 'OUTRO'],
  })
  @IsNotEmpty({ message: 'Gênero é obrigatório' })
  @IsEnum(['MASCULINO', 'FEMININO', 'OUTRO'])
  genero: string;

  // ===== DADOS DE GRADUAÇÃO (ALUNO) =====
  @ApiPropertyOptional({
    description: 'Faixa atual (para alunos)',
    enum: [
      'BRANCA',
      'CINZA_BRANCA',
      'CINZA',
      'CINZA_PRETA',
      'AMARELA_BRANCA',
      'AMARELA',
      'AMARELA_PRETA',
      'LARANJA_BRANCA',
      'LARANJA',
      'LARANJA_PRETA',
      'VERDE_BRANCA',
      'VERDE',
      'VERDE_PRETA',
      'AZUL',
      'ROXA',
      'MARROM',
      'PRETA',
      'CORAL',
      'VERMELHA',
    ],
  })
  @IsOptional()
  faixa_atual?: string;

  @ApiPropertyOptional({ description: 'Graus na faixa atual (0-4)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(4)
  @Type(() => Number)
  @Transform(({ value }) =>
    value === '' || value === null ? 0 : parseInt(value),
  )
  graus?: number;

  // ===== DADOS DE CONTATO =====
  @ApiPropertyOptional({ description: 'Telefone de emergência' })
  @IsOptional()
  @IsString()
  telefone_emergencia?: string;

  @ApiPropertyOptional({ description: 'Nome do contato de emergência' })
  @IsOptional()
  @IsString()
  nome_contato_emergencia?: string;

  // ===== DADOS MÉDICOS =====
  @ApiPropertyOptional({ description: 'Observações médicas' })
  @IsOptional()
  @IsString()
  observacoes_medicas?: string;

  @ApiPropertyOptional({ description: 'Alergias' })
  @IsOptional()
  @IsString()
  alergias?: string;

  @ApiPropertyOptional({ description: 'Medicamentos de uso contínuo' })
  @IsOptional()
  @IsString()
  medicamentos_uso_continuo?: string;

  @ApiPropertyOptional({ description: 'Plano de saúde' })
  @IsOptional()
  @IsString()
  plano_saude?: string;

  @ApiPropertyOptional({
    description: 'Validade do atestado médico (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : value,
  )
  atestado_medico_validade?: string;

  @ApiPropertyOptional({ description: 'Restrições médicas' })
  @IsOptional()
  @IsString()
  restricoes_medicas?: string;

  // ===== DADOS DO RESPONSÁVEL (para menores de 18 anos) =====
  @ApiPropertyOptional({ description: 'Nome do responsável' })
  @IsOptional()
  @IsString()
  responsavel_nome?: string;

  @ApiPropertyOptional({ description: 'CPF do responsável' })
  @IsOptional()
  @IsString()
  responsavel_cpf?: string;

  @ApiPropertyOptional({ description: 'Telefone do responsável' })
  @IsOptional()
  @IsString()
  responsavel_telefone?: string;

  @ApiPropertyOptional({ description: 'Parentesco do responsável' })
  @IsOptional()
  @IsString()
  responsavel_parentesco?: string;

  // ===== DADOS FINANCEIROS (ALUNO) =====
  @ApiPropertyOptional({
    description: 'Dia de vencimento da mensalidade (1-31)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : parseInt(value),
  )
  dia_vencimento?: number;

  @ApiPropertyOptional({ description: 'Valor da mensalidade' })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : parseFloat(value),
  )
  valor_mensalidade?: number;

  @ApiPropertyOptional({ description: 'Desconto percentual (0-100)' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  @Transform(({ value }) =>
    value === '' || value === null ? 0 : parseFloat(value),
  )
  desconto_percentual?: number;

  // ===== CONSENTIMENTOS LGPD =====
  @ApiPropertyOptional({ description: 'Consentimento LGPD' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  consent_lgpd?: boolean;

  @ApiPropertyOptional({ description: 'Consentimento uso de imagem' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  consent_imagem?: boolean;

  // ===== DADOS PARA PROFESSORES =====
  @ApiPropertyOptional({
    description: 'Especialidades do professor (JSON array)',
  })
  @IsOptional()
  especialidades?: string[];

  // ===== OUTROS =====
  @ApiPropertyOptional({ description: 'Observações adicionais' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ description: 'URL da foto de perfil' })
  @IsOptional()
  @IsString()
  foto_url?: string;
}
