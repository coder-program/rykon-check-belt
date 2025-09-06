import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { FinalidadeEndereco, TipoDonoEndereco } from './enderecos.service';

export class CreateEnderecoDto {
  @ApiProperty({ example: '01001000' })
  @IsString()
  @Length(8, 8)
  cep!: string;

  @ApiProperty({ example: 'Praça da Sé' })
  @IsString()
  logradouro!: string;

  @ApiProperty({ example: '100' })
  @IsString()
  numero!: string;

  @ApiPropertyOptional({ example: 'Apto 12' })
  @IsOptional()
  @IsString()
  complemento?: string | null;

  @ApiPropertyOptional({ example: 'Sé' })
  @IsOptional()
  @IsString()
  bairro?: string | null;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  cidade_nome?: string | null;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  estado?: string | null;

  @ApiPropertyOptional({ example: 'BR', default: 'BR' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  codigo_pais?: string;
}

export class UpdateEnderecoDto {
  @ApiPropertyOptional({ example: '01001000' })
  @IsOptional()
  @IsString()
  @Length(8, 8)
  cep?: string;

  @ApiPropertyOptional({ example: 'Praça da Sé' })
  @IsOptional()
  @IsString()
  logradouro?: string;

  @ApiPropertyOptional({ example: '100' })
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional({ example: 'Apto 12' })
  @IsOptional()
  @IsString()
  complemento?: string | null;

  @ApiPropertyOptional({ example: 'Sé' })
  @IsOptional()
  @IsString()
  bairro?: string | null;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  cidade_nome?: string | null;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  estado?: string | null;

  @ApiPropertyOptional({ example: 'BR', default: 'BR' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  codigo_pais?: string;
}

export class VincularEnderecoDto {
  @ApiProperty({
    enum: ['ALUNO', 'PROFESSOR', 'UNIDADE', 'FRANQUEADO', 'FUNCIONARIO'],
  })
  @IsEnum(['ALUNO', 'PROFESSOR', 'UNIDADE', 'FRANQUEADO', 'FUNCIONARIO'] as any)
  tipo_dono!: TipoDonoEndereco;

  @ApiProperty()
  @IsString()
  dono_id!: string;

  @ApiPropertyOptional({
    enum: ['RESIDENCIAL', 'COMERCIAL', 'COBRANCA', 'ENTREGA', 'OUTRO'],
    default: 'RESIDENCIAL',
  })
  @IsOptional()
  @IsEnum(['RESIDENCIAL', 'COMERCIAL', 'COBRANCA', 'ENTREGA', 'OUTRO'] as any)
  finalidade?: FinalidadeEndereco;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  principal?: boolean;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsString()
  valido_de?: string | null;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsString()
  valido_ate?: string | null;
}

export class DefinirPrincipalDto {
  @ApiProperty({
    enum: ['RESIDENCIAL', 'COMERCIAL', 'COBRANCA', 'ENTREGA', 'OUTRO'],
  })
  @IsEnum(['RESIDENCIAL', 'COMERCIAL', 'COBRANCA', 'ENTREGA', 'OUTRO'] as any)
  finalidade!: FinalidadeEndereco;

  @ApiProperty()
  @IsString()
  endereco_id!: string;
}

export class ViaCepQueryDto {
  @ApiProperty({ example: '01001-000' })
  @IsString()
  cep!: string;
}
