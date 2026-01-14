import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompeticoesService } from './competicoes.service';
import {
  Competicao,
  TipoCompeticao,
  StatusCompeticao,
} from './entities/competicao.entity';
import { AlunoCompeticao } from './entities/aluno-competicao.entity';

@ApiTags('Competições')
@Controller('competicoes')
@UseGuards(JwtAuthGuard)
export class CompeticoesController {
  constructor(private readonly competicoesService: CompeticoesService) {}

  // ========== COMPETIÇÕES ==========

  @Get()
  @ApiOperation({ summary: 'Listar todas as competições' })
  @ApiResponse({ status: 200, description: 'Lista de competições' })
  async listarCompetições(
    @Query('nome') nome?: string,
    @Query('tipo') tipo?: TipoCompeticao,
    @Query('status') status?: StatusCompeticao,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    const filtros: any = {};

    if (nome) filtros.nome = nome;
    if (tipo) filtros.tipo = tipo;
    if (status) filtros.status = status;
    if (dataInicio) filtros.dataInicio = new Date(dataInicio);
    if (dataFim) filtros.dataFim = new Date(dataFim);

    return this.competicoesService.listarCompetições(filtros);
  }

  @Get('meu-historico')
  @ApiOperation({
    summary: 'Buscar histórico de competições do usuário logado',
  })
  @ApiResponse({ status: 200, description: 'Histórico do usuário' })
  async meuHistorico(@Request() req) {
    return this.competicoesService.meuHistoricoCompeticoes(req.user.id);
  }

  @Get('historico-aluno/:alunoId')
  @ApiOperation({
    summary: 'Buscar histórico de competições de um aluno específico',
  })
  @ApiResponse({ status: 200, description: 'Histórico do aluno' })
  async historicoAluno(@Param('alunoId') alunoId: string, @Request() req) {
    return this.competicoesService.historicoCompeticoesAluno(alunoId, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar competição por ID' })
  @ApiResponse({ status: 200, description: 'Detalhes da competição' })
  async buscarCompeticao(@Param('id') id: string) {
    return this.competicoesService.buscarCompeticao(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova competição' })
  @ApiResponse({ status: 201, description: 'Competição criada' })
  async criarCompeticao(@Body() data: Partial<Competicao>, @Request() req) {
    return this.competicoesService.criarCompeticao(data, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar competição' })
  @ApiResponse({ status: 200, description: 'Competição atualizada' })
  async atualizarCompeticao(
    @Param('id') id: string,
    @Body() data: Partial<Competicao>,
    @Request() req,
  ) {
    return this.competicoesService.atualizarCompeticao(id, data, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar competição' })
  @ApiResponse({ status: 200, description: 'Competição deletada' })
  async deletarCompeticao(@Param('id') id: string) {
    return this.competicoesService.deletarCompeticao(id);
  }

  // ========== PARTICIPAÇÕES ==========

  @Get('aluno/:alunoId/historico')
  @ApiOperation({ summary: 'Buscar histórico de competições do aluno' })
  @ApiResponse({ status: 200, description: 'Histórico do aluno' })
  async buscarHistoricoAluno(@Param('alunoId') alunoId: string) {
    return this.competicoesService.buscarHistoricoAluno(alunoId);
  }

  @Post('participacao')
  @ApiOperation({ summary: 'Registrar participação em competição' })
  @ApiResponse({ status: 201, description: 'Participação registrada' })
  async registrarParticipacao(
    @Body() data: Partial<AlunoCompeticao>,
    @Request() req,
  ) {
    return this.competicoesService.registrarParticipacao(data, req.user.id);
  }

  @Put('participacao/:id')
  @ApiOperation({ summary: 'Atualizar participação' })
  @ApiResponse({ status: 200, description: 'Participação atualizada' })
  async atualizarParticipacao(
    @Param('id') id: string,
    @Body() data: Partial<AlunoCompeticao>,
    @Request() req,
  ) {
    return this.competicoesService.atualizarParticipacao(id, data, req.user.id);
  }

  @Delete('participacao/:id')
  @ApiOperation({ summary: 'Deletar participação' })
  @ApiResponse({ status: 200, description: 'Participação deletada' })
  async deletarParticipacao(@Param('id') id: string) {
    return this.competicoesService.deletarParticipacao(id);
  }
}
