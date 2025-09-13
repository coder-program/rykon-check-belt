import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ConcederGrauDto {
  @ApiProperty({ required: false, description: 'Observação sobre a concessão do grau' })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiProperty({ required: false, description: 'ID do usuário que concedeu o grau' })
  @IsOptional()
  @IsUUID()
  concedidoPor?: string;
}

export class GraduarFaixaDto {
  @ApiProperty({ description: 'ID da faixa de destino' })
  @IsUUID()
  faixaDestinoId: string;

  @ApiProperty({ required: false, description: 'Observação sobre a graduação' })
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiProperty({ required: false, description: 'ID do usuário que concedeu a graduação' })
  @IsOptional()
  @IsUUID()
  concedidoPor?: string;
}

export class CriarFaixaAlunoDto {
  @ApiProperty({ description: 'ID da faixa' })
  @IsUUID()
  faixaDefId: string;

  @ApiProperty({ required: false, description: 'Data de início da faixa' })
  @IsOptional()
  dtInicio?: Date;

  @ApiProperty({ required: false, description: 'Graus iniciais (usado para migração)' })
  @IsOptional()
  grausInicial?: number;
}
