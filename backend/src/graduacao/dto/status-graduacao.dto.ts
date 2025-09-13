import { ApiProperty } from '@nestjs/swagger';

export class StatusGraduacaoDto {
  @ApiProperty({ example: 'Azul' })
  faixaAtual: string;

  @ApiProperty({ example: '#0066CC' })
  corHex: string;

  @ApiProperty({ example: 2 })
  grausAtual: number;

  @ApiProperty({ example: 4 })
  grausMax: number;

  @ApiProperty({ example: 40 })
  aulasPorGrau: number;

  @ApiProperty({ example: 31 })
  presencasNoCiclo: number;

  @ApiProperty({ example: 85 })
  presencasTotalFaixa: number;

  @ApiProperty({
    example: 9,
    description: 'Número de aulas faltantes para o próximo grau',
  })
  faltamAulas: number;

  @ApiProperty({ example: false })
  prontoParaGraduar: boolean;

  @ApiProperty({
    example: 0.775,
    description: 'Percentual de progresso para o próximo grau (0-1)',
  })
  progressoPercentual: number;

  @ApiProperty({ required: false })
  proximaFaixa?: string;

  @ApiProperty({ required: false })
  dtInicioFaixa?: Date;

  @ApiProperty({ required: false, description: 'ID da faixa ativa do aluno' })
  alunoFaixaId?: string;
}
