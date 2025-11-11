import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Matches,
  Length,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateModalidadeDto {
  @ApiProperty({
    description: 'ID da unidade que oferece esta modalidade',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  unidade_id: string;

  @ApiProperty({
    description: 'Nome da modalidade (Jiu-Jitsu, Muay Thai, MMA, etc.)',
    example: 'Jiu-Jitsu',
  })
  @IsString()
  @Length(3, 100)
  nome: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da modalidade',
    example: 'Brazilian Jiu-Jitsu - Arte marcial focada em técnicas de solo',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({
    description: 'Valor da mensalidade para esta modalidade',
    example: 250.0,
  })
  @IsNumber()
  valor_mensalidade: number;

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
    description: 'Se a modalidade está ativa',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
