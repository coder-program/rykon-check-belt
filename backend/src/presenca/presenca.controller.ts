import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PresencaService,
  AulaAtiva,
  EstatisticasPresenca,
} from './presenca.service';

@ApiTags('Presença')
@Controller('presenca')
@UseGuards(JwtAuthGuard)
export class PresencaController {
  constructor(private readonly presencaService: PresencaService) {}

  @Get('aula-ativa')
  @ApiOperation({ summary: 'Obter aula ativa no momento' })
  @ApiResponse({ status: 200, description: 'Aula ativa encontrada' })
  @ApiResponse({ status: 404, description: 'Nenhuma aula ativa' })
  async getAulaAtiva(@Request() req): Promise<AulaAtiva | null> {
    try {
      const result = await this.presencaService.getAulaAtiva(req.user);
      console.log('🔵 [Controller] Resultado da aula ativa:', result);
      return result;
    } catch (error) {
      console.error('❌ [Controller] Erro ao buscar aula ativa:', error);
      return null;
    }
  }

  @Post('check-in-qr')
  @ApiOperation({ summary: 'Check-in via QR Code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        qrCode: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Check-in realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'QR Code inválido ou expirado' })
  async checkInQR(@Body() body: { qrCode: string }, @Request() req) {
    return this.presencaService.checkInQR(body.qrCode, req.user);
  }

  @Post('check-in-manual')
  @ApiOperation({ summary: 'Check-in manual' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        aulaId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Check-in manual realizado' })
  async checkInManual(@Body() body: { aulaId: string }, @Request() req) {
    return this.presencaService.checkInManual(body.aulaId, req.user);
  }

  @Get('minhas-estatisticas')
  @ApiOperation({ summary: 'Estatísticas de presença do usuário logado' })
  @ApiResponse({ status: 200, description: 'Estatísticas de presença' })
  async getMinhasEstatisticas(@Request() req): Promise<EstatisticasPresenca> {
    return this.presencaService.getMinhasEstatisticas(req.user);
  }

  @Get('minha-historico')
  @ApiOperation({ summary: 'Histórico de presenças do usuário logado' })
  @ApiResponse({ status: 200, description: 'Histórico de presenças' })
  async getMinhaHistorico(@Request() req, @Query('limit') limit?: number) {
    return this.presencaService.getMinhaHistorico(req.user, limit);
  }

  @Post('check-in-cpf')
  @ApiOperation({ summary: 'Check-in via CPF (para recepção)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cpf: { type: 'string' },
        aulaId: { type: 'string' },
      },
    },
  })
  async checkInCPF(
    @Body() body: { cpf: string; aulaId: string },
    @Request() req,
  ) {
    return this.presencaService.checkInCPF(body.cpf, body.aulaId, req.user);
  }

  @Post('check-in-nome')
  @ApiOperation({ summary: 'Check-in via busca por nome (para recepção)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nome: { type: 'string' },
        aulaId: { type: 'string' },
      },
    },
  })
  async checkInNome(
    @Body() body: { nome: string; aulaId: string },
    @Request() req,
  ) {
    return this.presencaService.checkInNome(body.nome, body.aulaId, req.user);
  }

  @Get('estatisticas-admin')
  @ApiOperation({ summary: 'Estatísticas administrativas de presença' })
  @ApiResponse({ status: 200, description: 'Estatísticas administrativas' })
  async getEstatisticasAdmin(
    @Request() req,
    @Query('periodo') periodo?: string,
  ) {
    return this.presencaService.getEstatisticasAdmin(req.user, periodo);
  }

  @Get('relatorio-presencas')
  @ApiOperation({ summary: 'Relatório de presenças por período' })
  @ApiResponse({ status: 200, description: 'Relatório de presenças' })
  async getRelatorioPresencas(
    @Request() req,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('unidadeId') unidadeId?: string,
  ) {
    return this.presencaService.getRelatorioPresencas(
      req.user,
      dataInicio,
      dataFim,
      unidadeId,
    );
  }

  @Get('alunos/buscar')
  @ApiOperation({ summary: 'Buscar alunos por nome ou CPF' })
  @ApiResponse({ status: 200, description: 'Lista de alunos encontrados' })
  async buscarAlunos(@Query('termo') termo: string, @Request() req) {
    return this.presencaService.buscarAlunos(termo, req.user);
  }

  @Get('aulas-disponiveis')
  @ApiOperation({ summary: 'Aulas disponíveis para check-in' })
  @ApiResponse({ status: 200, description: 'Lista de aulas disponíveis' })
  async getAulasDisponiveis(@Request() req, @Query('data') data?: string) {
    return this.presencaService.getAulasDisponiveis(req.user, data);
  }

  @Post('check-in-facial')
  @ApiOperation({ summary: 'Check-in via reconhecimento facial' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        foto: { type: 'string', description: 'Foto em base64' },
        aulaId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Check-in facial realizado' })
  async checkInFacial(
    @Body() body: { foto: string; aulaId: string },
    @Request() req,
  ) {
    return this.presencaService.checkInFacial(body.foto, body.aulaId, req.user);
  }

  @Post('check-in-responsavel')
  @ApiOperation({ summary: 'Check-in de filho pelo responsável' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        alunoId: { type: 'string' },
        aulaId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Check-in do responsável realizado',
  })
  async checkInResponsavel(
    @Body() body: { alunoId: string; aulaId: string },
    @Request() req,
  ) {
    return this.presencaService.checkInResponsavel(
      body.alunoId,
      body.aulaId,
      req.user,
    );
  }

  @Get('meus-filhos')
  @ApiOperation({ summary: 'Listar filhos do responsável logado' })
  @ApiResponse({ status: 200, description: 'Lista de filhos' })
  async getMeusFilhos(@Request() req) {
    return this.presencaService.getMeusFilhos(req.user);
  }

  @Get('ranking-unidade')
  @ApiOperation({ summary: 'Ranking de alunos por frequência na unidade' })
  @ApiResponse({ status: 200, description: 'Ranking de frequência' })
  async getRankingUnidade(
    @Request() req,
    @Query('mes') mes?: number,
    @Query('ano') ano?: number,
  ) {
    return this.presencaService.getRankingUnidade(req.user, mes, ano);
  }
}
