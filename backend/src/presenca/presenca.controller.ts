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
        latitude: { type: 'number', description: 'Latitude do aluno' },
        longitude: { type: 'number', description: 'Longitude do aluno' },
      },
      required: ['qrCode'],
    },
  })
  @ApiResponse({ status: 200, description: 'Check-in realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'QR Code inválido ou expirado' })
  async checkInQR(
    @Body() body: { qrCode: string; latitude?: number; longitude?: number },
    @Request() req,
  ) {
    return this.presencaService.checkInQR(
      body.qrCode,
      req.user,
      body.latitude,
      body.longitude,
    );
  }

  @Post('check-in-manual')
  @ApiOperation({ summary: 'Check-in manual' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        aulaId: { type: 'string' },
        latitude: { type: 'number', description: 'Latitude do aluno' },
        longitude: { type: 'number', description: 'Longitude do aluno' },
      },
      required: ['aulaId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Check-in manual realizado' })
  async checkInManual(
    @Body() body: { aulaId: string; latitude?: number; longitude?: number },
    @Request() req,
  ) {
    return this.presencaService.checkInManual(
      body.aulaId,
      req.user,
      body.latitude,
      body.longitude,
    );
  }

  @Post('check-in-dependente')
  @ApiOperation({ summary: 'Check-in de dependente pelo responsável' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        alunoId: { type: 'string' },
        aulaId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Check-in realizado com sucesso' })
  async checkInDependente(
    @Body() body: { alunoId: string; aulaId: string },
    @Request() req,
  ) {
    return this.presencaService.checkInDependente(
      body.alunoId,
      body.aulaId,
      req.user,
    );
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

  @Get('minhas-pendentes')
  @ApiOperation({
    summary: 'Check-ins pendentes de aprovação do usuário logado',
  })
  @ApiResponse({ status: 200, description: 'Lista de check-ins pendentes' })
  async getMinhasPendentes(@Request() req) {
    return this.presencaService.getMinhasPendentes(req.user);
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

  @Get('frequencia-ultimos-30-dias')
  @ApiOperation({ summary: 'Frequência diária dos últimos 30 dias' })
  @ApiResponse({ status: 200, description: 'Dados de frequência por dia' })
  async getFrequenciaUltimos30Dias(
    @Request() req,
    @Query('unidadeId') unidadeId?: string,
  ) {
    return this.presencaService.getFrequenciaUltimos30Dias(req.user, unidadeId);
  }

  @Get('alunos-ausentes')
  @ApiOperation({ summary: 'Ranking de alunos mais ausentes' })
  @ApiResponse({ status: 200, description: 'Lista de alunos por ausência' })
  async getAlunosAusentes(
    @Request() req,
    @Query('unidadeId') unidadeId?: string,
    @Query('dias') dias?: number,
  ) {
    return this.presencaService.getAlunosAusentes(
      req.user,
      unidadeId,
      dias || 30,
    );
  }

  @Get('professores/ranking-presenca')
  @ApiOperation({ summary: 'Ranking de professores por presença/pontualidade' })
  @ApiResponse({ status: 200, description: 'Ranking de professores' })
  async getRankingProfessoresPresenca(
    @Request() req,
    @Query('unidadeId') unidadeId?: string,
  ) {
    return this.presencaService.getRankingProfessoresPresenca(
      req.user,
      unidadeId,
    );
  }

  @Get('alunos/ranking-frequencia')
  @ApiOperation({ summary: 'Ranking de alunos por frequência/assiduidade' })
  @ApiResponse({ status: 200, description: 'Top alunos mais assíduos' })
  async getRankingAlunosFrequencia(
    @Request() req,
    @Query('unidadeId') unidadeId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.presencaService.getRankingAlunosFrequencia(
      req.user,
      unidadeId,
      limit || 10,
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
    @Query('alunoId') alunoId?: string,
  ) {
    return this.presencaService.getRankingUnidade(req.user, mes, ano, alunoId);
  }

  // ========== TABLET CHECK-IN ENDPOINTS ==========

  @Post('checkin-tablet')
  @ApiOperation({
    summary: 'Check-in via tablet - cria presença pendente de aprovação',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        alunoId: { type: 'string', description: 'ID do aluno' },
        aulaId: { type: 'string', description: 'ID da aula' },
        metodo: {
          type: 'string',
          enum: ['LISTA', 'QR_CODE'],
          description: 'Método de check-in',
        },
      },
      required: ['alunoId', 'aulaId', 'metodo'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Check-in registrado como PENDENTE',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  async checkInTablet(
    @Body() body: { alunoId: string; aulaId: string; metodo: string },
    @Request() req,
  ) {
    return this.presencaService.checkInTablet(
      body.alunoId,
      body.aulaId,
      body.metodo,
      req.user,
    );
  }

  @Get('pendentes')
  @ApiOperation({ summary: 'Listar presenças pendentes de aprovação' })
  @ApiResponse({ status: 200, description: 'Lista de presenças pendentes' })
  async getPresencasPendentes(
    @Request() req,
    @Query('data') data?: string,
    @Query('aulaId') aulaId?: string,
  ) {
    return this.presencaService.getPresencasPendentes(req.user, data, aulaId);
  }

  @Post(':id/aprovar')
  @ApiOperation({ summary: 'Aprovar presença pendente' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        observacao: { type: 'string', description: 'Observação opcional' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Presença aprovada' })
  @ApiResponse({ status: 403, description: 'Sem permissão para aprovar' })
  async aprovarPresenca(
    @Param('id') id: string,
    @Body() body: { observacao?: string },
    @Request() req,
  ) {
    return this.presencaService.aprovarPresenca(id, req.user, body.observacao);
  }

  @Post(':id/rejeitar')
  @ApiOperation({ summary: 'Rejeitar presença pendente' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        observacao: { type: 'string', description: 'Motivo da rejeição' },
      },
      required: ['observacao'],
    },
  })
  @ApiResponse({ status: 200, description: 'Presença rejeitada' })
  @ApiResponse({ status: 403, description: 'Sem permissão para rejeitar' })
  async rejeitarPresenca(
    @Param('id') id: string,
    @Body() body: { observacao: string },
    @Request() req,
  ) {
    return this.presencaService.rejeitarPresenca(id, req.user, body.observacao);
  }
}
