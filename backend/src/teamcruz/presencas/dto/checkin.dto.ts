import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNumberString,
} from 'class-validator';
import { OrigemRegistro } from '../entities/presenca.entity';

export class CheckinDto {
  @IsUUID()
  alunoId: string;

  @IsUUID()
  unidadeId: string;

  @IsEnum(OrigemRegistro)
  origemRegistro: OrigemRegistro;

  @IsOptional()
  @IsNumberString()
  latitude?: string;

  @IsOptional()
  @IsNumberString()
  longitude?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class CheckinManualDto {
  @IsString()
  cpfOuTelefone: string;

  @IsUUID()
  unidadeId: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

export class CheckinQrCodeDto {
  @IsUUID()
  alunoId: string;

  @IsString()
  tokenUnidade: string;

  @IsOptional()
  @IsNumberString()
  latitude?: string;

  @IsOptional()
  @IsNumberString()
  longitude?: string;
}

export class ProgressoResponseDto {
  alunoId: string;
  nome: string;
  faixaAtual: string;
  grauAtual: number;
  aulasRealizadas: number;
  aulasFaltantes: number;
  proximaGraduacao: string;
  porcentagemProgresso: number;
}
