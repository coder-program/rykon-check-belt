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
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
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
  constructor(
    private readonly graduacaoService: GraduacaoService,
    @Inject(DataSource) private dataSource: DataSource,
  ) {}

  /**
   * Helper para buscar unidade_id do usuário (incluindo GERENTE_UNIDADE e RECEPCIONISTA)
   */
  private async getUnidadeIdFromUser(user: any): Promise<string | null> {
    if (!user) return null;

    console.log('🔍 [getUnidadeIdFromUser] Verificando usuário:', {
      id: user.id,
      nome: user.nome,
      unidade_id: user.unidade_id,
      perfis: user?.perfis?.map((p: any) =>
        typeof p === 'string' ? p : p.nome,
      ),
    });

    // Tentar pegar direto do user.unidade_id
    if (user.unidade_id) {
      console.log(
        '✅ [getUnidadeIdFromUser] Encontrado user.unidade_id:',
        user.unidade_id,
      );
      return user.unidade_id;
    }

    const perfis =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) || [];

    // GERENTE_UNIDADE: buscar na tabela gerente_unidades
    if (perfis.includes('GERENTE_UNIDADE')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) {
        console.log(
          '✅ [getUnidadeIdFromUser] GERENTE_UNIDADE encontrado:',
          result[0].unidade_id,
        );
        return result[0].unidade_id;
      }
    }

    // RECEPCIONISTA: buscar na tabela recepcionista_unidades
    if (perfis.includes('RECEPCIONISTA')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM teamcruz.recepcionista_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) {
        console.log(
          '✅ [getUnidadeIdFromUser] RECEPCIONISTA encontrado:',
          result[0].unidade_id,
        );
        return result[0].unidade_id;
      }
    }

    // PROFESSOR/INSTRUTOR: buscar na tabela professores
    if (perfis.includes('PROFESSOR') || perfis.includes('INSTRUTOR')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM teamcruz.professores WHERE usuario_id = $1 AND status = 'ATIVO' LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) {
        console.log(
          '✅ [getUnidadeIdFromUser] PROFESSOR/INSTRUTOR encontrado:',
          result[0].unidade_id,
        );
        return result[0].unidade_id;
      }
      console.log(
        '⚠️ [getUnidadeIdFromUser] PROFESSOR/INSTRUTOR não encontrado na tabela professores',
      );
    }

    console.log('❌ [getUnidadeIdFromUser] Nenhuma unidade encontrada');
    return null;
  }

  @Public()
  @Get('faixas')
  @ApiOperation({ summary: 'Lista todas as faixas disponíveis (público)' })
  @ApiResponse({ status: 200, description: 'Lista de faixas' })
  async listarFaixas(
    @Query('categoria') categoria?: string,
  ): Promise<FaixaDef[]> {
    try {
      const result = await this.graduacaoService.listarFaixas(categoria);
      return result;
    } catch (error) {
      console.error(' [CONTROLLER] Erro ao listar faixas:', error);
      throw error;
    }
  }

  @Post('cadastrar-faixa-inicial')
  @ApiOperation({ summary: 'Cadastrar faixa inicial do aluno logado' })
  @ApiResponse({
    status: 201,
    description: 'Faixa inicial cadastrada com sucesso',
  })
  @ApiResponse({ status: 400, description: 'Aluno já possui faixa ativa' })
  async cadastrarFaixaInicial(
    @Request() req,
    @Body()
    body: { faixa_codigo: string; graus: number; data_graduacao: string },
  ) {
    return this.graduacaoService.cadastrarFaixaInicial(
      req.user,
      body.faixa_codigo,
      body.graus,
      body.data_graduacao,
    );
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
    @Query('faixa') faixa?: string,
    @Request() req?: any,
  ): Promise<ListaProximosGraduarDto> {
    // VALIDAÇÃO DE SEGURANÇA
    const user = req?.user;

    // Verificar se é franqueado
    const isFranqueado =
      user?.tipo_usuario === 'FRANQUEADO' ||
      user?.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );

    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    console.log('🎓 [PROXIMOS-GRADUAR] Requisição recebida:', {
      usuario_id: user?.id,
      tipo_usuario: user?.tipo_usuario,
      unidade_id_usuario: userUnidadeId,
      filtro_unidade_id: unidadeId,
      categoria: categoria,
      faixa: faixa,
      isFranqueado,
    });

    // Se não passou unidade_id, aplicar regras de permissão
    if (!unidadeId) {
      if (isFranqueado) {
        console.log(
          '✅ [PROXIMOS-GRADUAR] Franqueado buscando de todas suas unidades',
        );
        // Não passa unidadeId, o service vai buscar de todas as unidades
        // que o franqueado tem acesso
      } else if (userUnidadeId) {
        console.log(
          '✅ [PROXIMOS-GRADUAR] Aplicando unidade do usuário:',
          userUnidadeId,
        );
        unidadeId = userUnidadeId;
      }
    } else {
      // Se passou unidade_id, validar se o usuário tem acesso
      if (!isFranqueado && user?.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && unidadeId !== userUnidadeId) {
          console.log('🚫 [PROXIMOS-GRADUAR] ACESSO NEGADO');
          return {
            items: [],
            total: 0,
            page: 1,
            pageSize: 20,
            hasNextPage: false,
          };
        }
      }
    }

    return await this.graduacaoService.getProximosGraduar({
      page,
      pageSize,
      unidadeId,
      categoria,
      faixa,
      userId: user?.id,
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
    @Request() req?: any,
  ) {
    // VALIDAÇÃO DE SEGURANÇA
    const user = req?.user;

    // Verificar se é franqueado
    const isFranqueado =
      user?.tipo_usuario === 'FRANQUEADO' ||
      user?.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );

    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    console.log('🎓 [GRADUACAO-HISTORICO] Requisição recebida:', {
      usuario_id: user?.id,
      tipo_usuario: user?.tipo_usuario,
      unidade_id_usuario: userUnidadeId,
      filtro_unidade_id: unidadeId,
      isFranqueado,
      perfis: user?.perfis?.map((p: any) => p.nome || p),
    });

    // Se não passou unidade_id, aplicar regras de permissão
    if (!unidadeId) {
      if (isFranqueado) {
        console.log(
          '⚠️ [GRADUACAO-HISTORICO] Franqueado sem unidade_id - retornando vazio (deve selecionar unidade no frontend)',
        );
        // Franqueado DEVE selecionar uma unidade específica
        return {
          items: [],
          total: 0,
          page: 1,
          pageSize: 20,
          hasNextPage: false,
        };
      } else if (userUnidadeId) {
        console.log(
          '✅ [GRADUACAO-HISTORICO] Aplicando unidade do usuário:',
          userUnidadeId,
        );
        unidadeId = userUnidadeId;
      }
    } else {
      // Se passou unidade_id, validar se o usuário tem acesso
      if (!isFranqueado && user?.tipo_usuario !== 'MASTER') {
        if (userUnidadeId && unidadeId !== userUnidadeId) {
          console.log('🚫 [GRADUACAO-HISTORICO] ACESSO NEGADO');
          return {
            items: [],
            total: 0,
            page: 1,
            pageSize: 20,
            hasNextPage: false,
          };
        }
      }
    }

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
    @Query('unidadeId') unidadeIdParam?: string,
    @Request() req?: any,
  ) {
    const user = req?.user;
    const unidadeIdFromUser = await this.getUnidadeIdFromUser(user);

    // Se o usuário tem unidade específica (PROFESSOR, GERENTE_UNIDADE, RECEPCIONISTA), usar ela
    // Caso contrário, usar o parâmetro passado (para FRANQUEADO ou MASTER)
    const unidadeId = unidadeIdFromUser || unidadeIdParam;

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

  // ==================== CONFIGURAÇÃO DE GRADUAÇÃO POR UNIDADE ====================

  @Get('configuracao/:unidadeId')
  @ApiOperation({ summary: 'Obter configuração de graduação de uma unidade' })
  @ApiResponse({
    status: 200,
    description: 'Configuração de graduação da unidade',
  })
  async getConfiguracaoUnidade(
    @Param('unidadeId', ParseUUIDPipe) unidadeId: string,
  ) {
    return await this.graduacaoService.getConfiguracaoGraduacao(unidadeId);
  }

  @Post('configuracao')
  @ApiOperation({
    summary: 'Criar ou atualizar configuração de graduação de uma unidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração salva com sucesso',
  })
  async salvarConfiguracaoUnidade(@Body() data: any, @Request() req: any) {
    return await this.graduacaoService.salvarConfiguracaoGraduacao(
      data,
      req.user,
    );
  }

  @Get('configuracoes')
  @ApiOperation({ summary: 'Listar todas configurações de graduação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de configurações de graduação',
  })
  async listarConfiguracoes(@Request() req: any) {
    return await this.graduacaoService.listarConfiguracoes(req.user);
  }
}
