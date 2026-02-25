import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsUUID,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TIPOS_GRADUACAO = ['FAIXA', 'GRAU', 'KYU_DAN', 'CORDAO', 'LIVRE', 'NENHUM'] as const;
export type TipoGraduacao = typeof TIPOS_GRADUACAO[number];

export class CreateModalidadeDto {
  @ApiProperty({
    description: 'Nome da modalidade (Jiu-Jitsu, Muay Thai, MMA, etc.)',
    example: 'Jiu-Jitsu',
  })
  @IsString()
  @Length(3, 100)
  nome!: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da modalidade',
    example: 'Brazilian Jiu-Jitsu - Arte marcial focada em técnicas de solo',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiPropertyOptional({
    description: 'Cor identificadora da modalidade em formato hex',
    example: '#1E3A8A',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/i, {
    message: 'Cor deve estar no formato hex (#FF5733)',
  })
  cor?: string;

  @ApiPropertyOptional({
    description: 'Tipo de sistema de graduação desta modalidade',
    example: 'FAIXA',
    enum: TIPOS_GRADUACAO,
    default: 'NENHUM',
  })
  @IsOptional()
  @IsIn(TIPOS_GRADUACAO, {
    message: `tipo_graduacao deve ser um dos valores: ${TIPOS_GRADUACAO.join(', ')}`,
  })
  tipo_graduacao?: TipoGraduacao;

  @ApiPropertyOptional({
    description: 'Identificador de ícone (ex: boxing-glove, karate)',
    example: 'boxing-glove',
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icone?: string;

  @ApiPropertyOptional({
    description: 'Se a modalidade está ativa',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

export class VincularModalidadeDto {
  @ApiProperty({ description: 'ID da unidade', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  unidade_id!: string;
}
