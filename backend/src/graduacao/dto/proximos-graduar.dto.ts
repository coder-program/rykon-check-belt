import { ApiProperty } from '@nestjs/swagger';

export class ProximoGraduarDto {
  @ApiProperty()
  alunoId: string;

  @ApiProperty({ example: 'João Silva' })
  nomeCompleto: string;

  @ApiProperty({ example: 'Azul' })
  faixa: string;

  @ApiProperty({ example: '#0066CC' })
  corHex: string;

  @ApiProperty({ example: 3 })
  grausAtual: number;

  @ApiProperty({ example: 4 })
  grausMax: number;

  @ApiProperty({
    example: 2,
    description: 'Número de aulas faltantes para o próximo grau',
  })
  faltamAulas: number;

  @ApiProperty({ example: false })
  prontoParaGraduar: boolean;

  @ApiProperty({ example: 0.95, description: 'Percentual de progresso (0-1)' })
  progressoPercentual: number;

  @ApiProperty({ required: false })
  unidadeId?: string;

  @ApiProperty({ required: false })
  unidadeNome?: string;

  @ApiProperty({ required: false, description: 'Data da última presença' })
  ultimaPresenca?: Date;

  @ApiProperty({
    required: false,
    description: 'Total de presenças na faixa atual',
  })
  presencasTotalFaixa?: number;

  @ApiProperty({
    example: true,
    description: 'Indica se é aluno infantil (kids)',
  })
  kids?: boolean;
}

export class ListaProximosGraduarDto {
  @ApiProperty({ type: [ProximoGraduarDto] })
  items: ProximoGraduarDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  hasNextPage: boolean;
}
