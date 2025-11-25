import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GraduacaoService } from './graduacao.service';
import { StatusGraduacaoDto } from './dto/status-graduacao.dto';
import { ListaProximosGraduarDto } from './dto/proximos-graduar.dto';
import {
  ConcederGrauDto,
  GraduarFaixaDto,
  CriarFaixaAlunoDto,
} from './dto/conceder-grau.dto';
import { FaixaDef } from './entities/faixa-def.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Graduação')
@Controller('graduacao')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GraduacaoController {
  constructor(private readonly graduacaoService: GraduacaoService) {}

  @Public()
  @Get('faixas')
  @ApiOperation({ summary: 'Lista todas as faixas disponíveis (público)' })
  @ApiResponse({ status: 200, description: 'Lista de faixas' })
  async listarFaixas(
    @Query('categoria') categoria?: string,
  ): Promise<FaixaDef[]> {
    return await this.graduacaoService.listarFaixas(categoria);
  }

  @Get('alunos/:alunoId/proxima-faixa')
  @ApiOperation({
    summary: 'Lista a próxima faixa válida para o aluno graduar',
  })
  @ApiResponse({ status: 200, description: 'Próxima faixa válida' })
  @ApiResponse({
    status: 404,
    description: 'Aluno não encontrado ou sem faixa ativa',
  })
  async listarProximaFaixaValida(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
  ): Promise<FaixaDef[]> {
    return await this.graduacaoService.listarProximaFaixaValida(alunoId);
  }

  @Get('alunos/:alunoId/proxima-faixa-manual')
  @ApiOperation({
    summary:
      'Lista a próxima faixa válida para graduação MANUAL (sem validar graus)',
  })
  @ApiResponse({
    status: 200,
    description: 'Próxima faixa válida para graduação manual',
  })
  @ApiResponse({
    status: 404,
    description: 'Aluno não encontrado ou sem faixa ativa',
  })
  async listarProximaFaixaValidaManual(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
  ): Promise<FaixaDef[]> {
    return await this.graduacaoService.listarProximaFaixaValidaManual(alunoId);
  }

  @Get('faixas-definicao')
  @ApiOperation({ summary: 'Lista todas as definições de faixas' })
  @ApiResponse({ status: 200, description: 'Lista de definições de faixas' })
  async listarFaixasDefinicao(): Promise<FaixaDef[]> {
    return await this.graduacaoService.listarFaixasDefinicao();
  }

  @Get('estatisticas')
  @ApiOperation({ summary: 'Obtém estatísticas gerais de graduação' })
  @ApiResponse({ status: 200, description: 'Estatísticas de graduação' })
  async getEstatisticasGraduacao() {
    return await this.graduacaoService.getEstatisticasGraduacao();
  }

  @Post('graduar/:alunoId')
  @ApiOperation({ summary: 'Gradua um aluno para a próxima faixa' })
  @ApiResponse({ status: 200, description: 'Aluno graduado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Aluno não está pronto para graduação',
  })
  async graduarAluno(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto?: { observacao?: string },
  ) {
    return await this.graduacaoService.graduarAluno(alunoId, dto?.observacao);
  }

  @Post('adicionar-grau/:alunoId')
  @ApiOperation({ summary: 'Adiciona um grau manualmente ao aluno' })
  @ApiResponse({ status: 200, description: 'Grau adicionado com sucesso' })
  async adicionarGrau(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: { observacao: string },
  ) {
    return await this.graduacaoService.adicionarGrau(alunoId, dto.observacao);
  }

  @Get('alunos/:alunoId/status')
  @ApiOperation({ summary: 'Obtém o status de graduação do aluno' })
  @ApiResponse({ status: 200, type: StatusGraduacaoDto })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  async getStatusGraduacao(
    @Param('alunoId') alunoId: string,
  ): Promise<StatusGraduacaoDto> {
    return await this.graduacaoService.getStatusGraduacao(alunoId);
  }

  @Get('proximos-graduar')
  @ApiOperation({ summary: 'Lista próximos alunos a graduar' })
  @ApiResponse({ status: 200, type: ListaProximosGraduarDto })
  async getProximosGraduar(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('unidadeId') unidadeId?: string,
    @Query('categoria') categoria?: 'adulto' | 'kids' | 'todos',
  ): Promise<ListaProximosGraduarDto> {
    return await this.graduacaoService.getProximosGraduar({
      page,
      pageSize,
      unidadeId,
      categoria,
    });
  }

  @Post('alunos/:alunoId/graus')
  @ApiOperation({ summary: 'Concede um grau ao aluno' })
  @ApiResponse({ status: 201, description: 'Grau concedido com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Aluno já possui número máximo de graus',
  })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  async concederGrau(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: ConcederGrauDto,
  ) {
    return await this.graduacaoService.concederGrau(alunoId, dto);
  }

  @Post('alunos/:alunoId/graduacoes')
  @ApiOperation({ summary: 'Gradua o aluno para uma nova faixa' })
  @ApiResponse({ status: 201, description: 'Aluno graduado com sucesso' })
  @ApiResponse({ status: 400, description: 'Faixa de destino inválida' })
  @ApiResponse({ status: 404, description: 'Aluno ou faixa não encontrados' })
  async graduarFaixa(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: GraduarFaixaDto,
  ) {
    return await this.graduacaoService.graduarFaixa(alunoId, dto);
  }

  @Post('alunos/:alunoId/faixas')
  @ApiOperation({
    summary: 'Cria uma faixa para o aluno (usado para inicializar)',
  })
  @ApiResponse({ status: 201, description: 'Faixa criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Aluno já possui faixa ativa' })
  @ApiResponse({ status: 404, description: 'Aluno ou faixa não encontrados' })
  async criarFaixaAluno(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: CriarFaixaAlunoDto,
  ) {
    return await this.graduacaoService.criarFaixaAluno(alunoId, dto);
  }

  @Post('alunos/:alunoId/presenca')
  @ApiOperation({
    summary: 'Registra presença e incrementa contadores de graduação',
  })
  @ApiResponse({ status: 200, description: 'Presença registrada' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  async incrementarPresenca(@Param('alunoId', ParseUUIDPipe) alunoId: string) {
    return await this.graduacaoService.incrementarPresenca(alunoId);
  }

  @Get('historico')
  @ApiOperation({ summary: 'Lista o histórico de graduações realizadas' })
  @ApiResponse({ status: 200, description: 'Histórico de graduações' })
  async getHistoricoGraduacoes(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('unidadeId') unidadeId?: string,
    @Query('alunoId') alunoId?: string,
    @Query('categoria') categoria?: 'adulto' | 'kids' | 'todos',
  ) {
    return await this.graduacaoService.getHistoricoGraduacoes({
      page: page || 1,
      pageSize: pageSize || 20,
      unidadeId,
      alunoId,
      categoria,
    });
  }

  @Get('minha-graduacao')
  @ApiOperation({ summary: 'Obtém a graduação atual do usuário logado' })
  @ApiResponse({ status: 200, description: 'Graduação atual do usuário' })
  async getMinhaGraduacao(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    return await this.graduacaoService.getMinhaGraduacao(userId);
  }

  @Get('meu-historico')
  @ApiOperation({ summary: 'Histórico de graduações do usuário logado' })
  @ApiResponse({ status: 200, description: 'Histórico do usuário' })
  async getMeuHistorico(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    return await this.graduacaoService.getMeuHistorico(userId);
  }

  @Get('minhas-competencias')
  @ApiOperation({ summary: 'Competências técnicas do usuário logado' })
  @ApiResponse({ status: 200, description: 'Competências técnicas' })
  async getMinhasCompetencias(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    return await this.graduacaoService.getMinhasCompetencias(userId);
  }

  @Get('meus-objetivos')
  @ApiOperation({ summary: 'Objetivos do usuário logado' })
  @ApiResponse({ status: 200, description: 'Objetivos pessoais' })
  async getMeusObjetivos(@Request() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    return await this.graduacaoService.getMeusObjetivos(userId);
  }

  @Post('graduacoes/:graduacaoId/aprovar')
  @ApiOperation({ summary: 'Aprova uma graduação pendente' })
  @ApiResponse({ status: 200, description: 'Graduação aprovada com sucesso' })
  @ApiResponse({ status: 404, description: 'Graduação não encontrada' })
  async aprovarGraduacao(
    @Param('graduacaoId', ParseUUIDPipe) graduacaoId: string,
    @Body() dto?: { observacao?: string },
    @Request() req?: any,
  ) {
    const userId = req?.user?.id; // ID do professor aprovando
    return await this.graduacaoService.aprovarGraduacao(
      graduacaoId,
      userId,
      dto?.observacao,
    );
  }

  @Get('pendentes')
  @ApiOperation({ summary: 'Lista graduações pendentes de aprovação' })
  @ApiResponse({ status: 200, description: 'Lista de graduações pendentes' })
  async listarGraduacoesPendentes(@Request() req: any) {
    return await this.graduacaoService.listarGraduacoesPendentes(req.user);
  }

  @Get('aprovadas')
  @ApiOperation({ summary: 'Lista graduações aprovadas' })
  @ApiResponse({ status: 200, description: 'Lista de graduações aprovadas' })
  async listarGraduacoesAprovadas(@Request() req: any) {
    console.log('🎯 [CONTROLLER] req completo:', !!req);
    console.log('🎯 [CONTROLLER] req.user:', req?.user);
    console.log('🎯 [CONTROLLER] req.headers:', req?.headers?.authorization);
    return await this.graduacaoService.listarGraduacoesAprovadas(req?.user);
  }

  @Post('aprovar-massa')
  @ApiOperation({ summary: 'Aprova múltiplas graduações em massa' })
  @ApiResponse({
    status: 200,
    description: 'Graduações aprovadas com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Nenhuma graduação pendente encontrada',
  })
  async aprovarGraduacoesEmMassa(
    @Body() dto: { graduacaoIds: string[] },
    @Request() req?: any,
  ) {
    const aprovadorId = req?.user?.id || 'sistema';
    return await this.graduacaoService.aprovarGraduacoesEmMassa(
      dto.graduacaoIds,
      aprovadorId,
    );
  }

  @Delete('graduacoes/:graduacaoId')
  @ApiOperation({ summary: 'Cancela/Remove uma graduação pendente' })
  @ApiResponse({ status: 200, description: 'Graduação cancelada com sucesso' })
  @ApiResponse({ status: 404, description: 'Graduação não encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Não é possível cancelar graduação já aprovada',
  })
  async cancelarGraduacao(
    @Param('graduacaoId', ParseUUIDPipe) graduacaoId: string,
  ) {
    return await this.graduacaoService.cancelarGraduacao(graduacaoId);
  }

  @Get('pendentes-aprovacao')
  @ApiOperation({ summary: 'Lista graduações pendentes de aprovação' })
  @ApiResponse({ status: 200, description: 'Lista de graduações pendentes' })
  async getPendentesAprovacao(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('unidadeId') unidadeId?: string,
  ) {
    return await this.graduacaoService.getPendentesAprovacao({
      page,
      pageSize,
      unidadeId,
    });
  }

  @Get('taxa-aprovacao-professores')
  @ApiOperation({ summary: 'Taxa de aprovação por professor' })
  @ApiResponse({
    status: 200,
    description: 'Lista de professores com taxa de aprovação',
  })
  async getTaxaAprovacaoPorProfessor(
    @Query('unidadeId') unidadeId?: string,
    @Request() req?: any,
  ) {
    return await this.graduacaoService.getTaxaAprovacaoPorProfessor(
      req.user,
      unidadeId,
    );
  }
}
