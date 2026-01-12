import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { TipoContrato } from '../entities/contrato-unidade.entity';

export class CreateContratoUnidadeDto {
  @IsUUID()
  @IsNotEmpty({ message: 'Unidade é obrigatória' })
  unidade_id: string;

  @IsString()
  @IsNotEmpty({ message: 'Título é obrigatório' })
  @MaxLength(255)
  titulo: string;

  @IsString()
  @IsNotEmpty({ message: 'Conteúdo é obrigatório' })
  conteudo: string;

  @IsEnum(TipoContrato)
  @IsOptional()
  tipo_contrato?: TipoContrato;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean;
}

export class UpdateContratoUnidadeDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  titulo?: string;

  @IsString()
  @IsOptional()
  conteudo?: string;

  @IsEnum(TipoContrato)
  @IsOptional()
  tipo_contrato?: TipoContrato;

  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsBoolean()
  @IsOptional()
  obrigatorio?: boolean;
}

export class AssinarContratoDto {
  @IsUUID()
  @IsNotEmpty({ message: 'ID do contrato é obrigatório' })
  contrato_id: string;

  @IsBoolean()
  @IsNotEmpty({ message: 'Aceite é obrigatório' })
  aceito: boolean;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  user_agent?: string;
}

export class ContratoStatusDto {
  contrato_pendente: boolean;
  contrato?: {
    id: string;
    titulo: string;
    conteudo: string;
    tipo_contrato: string;
    versao: number;
  };
  ultima_assinatura?: {
    data: Date;
    versao: number;
  };
}
