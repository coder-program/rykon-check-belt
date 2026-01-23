import { PartialType } from '@nestjs/mapped-types';
import { CreateAlunoDto } from './create-aluno.dto';
import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

// DTO para atualização de aluno - herda todos os campos do CreateAlunoDto como opcionais
export class UpdateAlunoDto extends PartialType(CreateAlunoDto) {
  // Campos de graduação (compatibilidade com frontend antigo)
  @IsOptional()
  @IsString()
  faixa_atual?: string;

  @IsOptional()
  @IsNumber()
  graus?: number;

  @IsOptional()
  @IsString()
  data_ultima_graduacao?: string;

  // Campos de endereço (para atualização de perfil)
  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  // ===== CONSENTIMENTOS LGPD =====
  @IsOptional()
  @IsBoolean()
  consent_lgpd?: boolean;

  @IsOptional()
  @IsBoolean()
  consent_imagem?: boolean;
}
