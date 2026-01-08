import { PartialType } from '@nestjs/mapped-types';
import { CreateAlunoDto } from './create-aluno.dto';
import { IsOptional, IsString, IsNumber } from 'class-validator';

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
}
