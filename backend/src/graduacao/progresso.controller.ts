import {
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
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
    dt_inicio: string;
    dt_fim?: string;
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
      // Tentar pegar o ID do usuário de diferentes formas
      const usuarioId = req.user?.sub || req.user?.id || req.user?.userId;

      if (!usuarioId) {
        console.error(
          ' Usuario ID não encontrado no token. req.user:',
          req.user,
        );
        throw new Error('ID do usuário não encontrado no token');
      }

      return await this.progressoService.getHistoricoCompleto(usuarioId);
    } catch (error) {
      console.error(' Erro no controller progresso:', error);
      throw error;
    }
  }

  @Get('historico-aluno/:alunoId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Busca o histórico de graduações de um aluno específico (para responsáveis)',
  })
  @ApiParam({ name: 'alunoId', type: String, description: 'ID do aluno' })
  @ApiResponse({
    status: 200,
    description: 'Histórico de graduações encontrado',
  })
  async getHistoricoAluno(
    @Param('alunoId') alunoId: string,
    @Request() req: any,
  ): Promise<ProgressoAlunoDto> {
    // Verificar se o usuário tem permissão para ver esse aluno
    // (deve ser responsável do aluno ou ter perfil adequado)
    return await this.progressoService.getHistoricoCompletoAluno(alunoId, req.user);
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
    const usuarioId = req.user?.sub || req.user?.id || req.user?.userId;
    if (!usuarioId) {
      throw new Error('ID do usuário não encontrado no token');
    }
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
      dt_inicio: string;
      dt_fim?: string;
      evento?: string;
      observacoes?: string;
    },
  ) {
    const usuarioId = req.user?.sub || req.user?.id || req.user?.userId;
    if (!usuarioId) {
      throw new Error('ID do usuário não encontrado no token');
    }
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

  @Post('atualizar-faixa/:faixaId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar datas de uma faixa do histórico',
  })
  async atualizarFaixa(
    @Request() req: any,
    @Param('faixaId') faixaId: string,
    @Body()
    dadosAtualizacao: {
      dt_inicio?: string;
      dt_fim?: string;
    },
  ) {
    const usuarioId = req.user?.sub || req.user?.id || req.user?.userId;
    if (!usuarioId) {
      throw new Error('ID do usuário não encontrado no token');
    }
    return await this.progressoService.atualizarFaixa(
      usuarioId,
      faixaId,
      dadosAtualizacao,
    );
  }

  // Rota de teste simples
  @Get('test')
  testRoute() {
    return { message: 'Progresso controller está funcionando!' };
  }
}
