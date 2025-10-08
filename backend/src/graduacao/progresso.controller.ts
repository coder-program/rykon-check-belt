import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProgressoService } from './progresso.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export interface ProgressoAlunoDto {
  graduacaoAtual: {
    faixa: string;
    grau: number;
    aulasNaFaixa: number;
    aulasParaProximoGrau: number;
    progressoPercentual: number;
  };
  historicoGraus: Array<{
    id: string;
    faixa: string;
    grau: number;
    dataConcessao: string;
    origemGrau: string;
    aulasAcumuladas?: number;
    justificativa?: string;
  }>;
  historicoFaixas: Array<{
    id: string;
    faixaOrigem?: string;
    faixaDestino: string;
    dataPromocao: string;
    evento?: string;
    observacoes?: string;
  }>;
}

@ApiTags('Progresso do Aluno')
@Controller('progresso')
export class ProgressoController {
  constructor(private readonly progressoService: ProgressoService) {}

  @Get('meu-historico')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Busca o histórico completo de graduações do aluno logado',
  })
  @ApiResponse({
    status: 200,
    description: 'Histórico de graduações encontrado',
  })
  async getMeuHistorico(@Request() req: any): Promise<ProgressoAlunoDto> {
    try {
      const usuarioId = req.user.sub;
      return await this.progressoService.getHistoricoCompleto(usuarioId);
    } catch (error) {
      console.error('Erro no controller progresso:', error);
      throw error;
    }
  }

  @Post('adicionar-grau')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Adiciona um novo grau ao histórico do aluno',
  })
  async adicionarGrau(
    @Request() req: any,
    @Body()
    dadosGrau: {
      faixaId: string;
      grauNumero: number;
      dataConcessao: string;
      origemGrau: string;
      aulasAcumuladas?: number;
      justificativa?: string;
    },
  ) {
    const usuarioId = req.user.sub;
    return await this.progressoService.adicionarGrau(usuarioId, dadosGrau);
  }

  @Post('adicionar-faixa')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Adiciona uma nova faixa ao histórico do aluno',
  })
  async adicionarFaixa(
    @Request() req: any,
    @Body()
    dadosFaixa: {
      faixaOrigemId?: string;
      faixaDestinoId: string;
      dataPromocao: string;
      evento?: string;
      observacoes?: string;
    },
  ) {
    const usuarioId = req.user.sub;
    return await this.progressoService.adicionarFaixa(usuarioId, dadosFaixa);
  }

  @Get('faixas-disponiveis')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista todas as faixas disponíveis para seleção',
  })
  async listarFaixas() {
    return await this.progressoService.listarFaixas();
  }

  // Rota de teste simples
  @Get('test')
  testRoute() {
    return { message: 'Progresso controller está funcionando!' };
  }
}
