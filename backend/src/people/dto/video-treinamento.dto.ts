import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CriarVideoTreinamentoDto {
  @ApiProperty({ description: 'Título do vídeo' })
  @IsString()
  @MaxLength(255)
  titulo: string;

  @ApiProperty({ description: 'Descrição do vídeo', required: false })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({ description: 'URL do YouTube (watch ou youtu.be)' })
  @IsString()
  @MaxLength(500)
  youtube_url: string;

  @ApiProperty({ description: 'Tag de modalidade', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  modalidade_tag?: string;

  @ApiProperty({ description: 'Vídeo ativo?', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @ApiProperty({ description: 'Ordem de exibição', required: false, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  ordem?: number;
}

export class AtualizarVideoTreinamentoDto {
  @ApiProperty({ description: 'Título do vídeo', required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  titulo?: string;

  @ApiProperty({ description: 'Descrição', required: false })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiProperty({ description: 'URL do YouTube', required: false })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  youtube_url?: string;

  @ApiProperty({ description: 'Tag de modalidade', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  modalidade_tag?: string;

  @ApiProperty({ description: 'Ativo?', required: false })
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @ApiProperty({ description: 'Ordem', required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  ordem?: number;
}
