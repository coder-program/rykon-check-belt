import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  Body,
  Param,
  Patch,
  Delete,
  ValidationPipe,
  UsePipes,
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AlunosService } from '../services/alunos.service';
import { Aluno } from '../entities/aluno.entity';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import {
  CreateAlunoDto,
  CreateDependenteDto,
  AlunoUnidadeDto,
} from '../dto/create-aluno.dto';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { AlunoUnidadeService } from '../services/aluno-unidade.service';
import { AlunoModalidadeService } from '../services/aluno-modalidade.service';

@ApiTags('🎓 Alunos')
@ApiBearerAuth('JWT-auth')
@Controller('alunos')
export class AlunosController {
  constructor(
    private readonly service: AlunosService,
    private readonly alunoUnidadeService: AlunoUnidadeService,
    private readonly alunoModalidadeService: AlunoModalidadeService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('buscar-por-nome')
  @ApiOperation({
    summary: '🔍 Buscar alunos por nome (autocomplete)',
    description:
      'Busca alunos que contenham o nome fornecido (útil para autocomplete)',
  })
  @ApiQuery({
    name: 'nome',
    required: true,
    description: 'Nome ou parte do nome do aluno',
  })
  @ApiResponse({ status: 200, description: '✅ Lista de alunos encontrados' })
  async buscarPorNome(@Query('nome') nome: string) {
    return this.service.buscarPorNome(nome);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '👤 Buscar dados do aluno logado',
    description:
      'Retorna os dados do aluno vinculado ao usuário logado incluindo faixa ativa',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Dados do aluno logado',
  })
  @ApiResponse({ status: 404, description: '❌ Aluno não encontrado' })
  @ApiResponse({ status: 401, description: '🔒 Token inválido ou expirado' })
  async getMe(@Request() req) {
    const aluno = await this.service.findByUsuarioId(req.user.id);

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado para o usuário logado');
    }

    // Buscar faixa ativa
    const alunoComFaixa = await this.dataSource
      .getRepository(Aluno)
      .createQueryBuilder('aluno')
      .leftJoinAndSelect('aluno.faixas', 'faixas')
      .leftJoinAndSelect('faixas.faixaDef', 'faixaDef')
      .where('aluno.id = :id', { id: aluno.id })
      .getOne();

    const faixaAtiva = alunoComFaixa?.faixas?.find((f: any) => f.ativa);

    return {
      ...aluno,
      faixa_atual: faixaAtiva?.faixaDef?.codigo || null,
    };
  }

  @Get('meus-dependentes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '👨‍👩‍👧‍👦 Listar dependentes do responsável',
    description:
      'Retorna todos os alunos menores de idade vinculados ao responsável logado',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Lista de dependentes do responsável',
  })
  @ApiResponse({ status: 401, description: ' Token inválido ou expirado' })
  async getMeusDependentes(@Request() req) {
    return this.service.getMeusDependentes(req.user);
  }

  @Post('responsavel-vira-aluno')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '🏃 Transformar responsável em aluno',
    description:
      'Converte um responsável em aluno mantendo acesso aos dependentes',
  })
  @ApiResponse({
    status: 201,
    description: '✅ Responsável convertido em aluno com sucesso',
  })
  @ApiResponse({ status: 400, description: ' Responsável já é aluno' })
  @ApiResponse({ status: 401, description: ' Token inválido ou expirado' })
  async responsavelViraAluno(@Request() req) {
    return this.service.responsavelViraAluno(req.user);
  }

  @Get('stats/counts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '📊 Estatísticas e contadores de alunos',
    description: 'Retorna contadores de alunos por diferentes filtros e status',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Termo de busca' })
  @ApiQuery({
    name: 'unidade_id',
    required: false,
    description: 'ID da unidade para filtrar',
  })
  @ApiResponse({ status: 200, description: '✅ Estatísticas retornadas' })
  @ApiResponse({ status: 401, description: ' Token inválido ou expirado' })
  async getStats(@Query(ValidationPipe) query: any, @Request() req) {
    const user = req?.user || null;
    return this.service.getStats(query, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar alunos (paginado/filtrado)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'faixa', required: false })
  @ApiQuery({
    name: 'categoria',
    required: false,
    description: 'Categoria: kids ou adulto',
  })
  @ApiQuery({ name: 'unidade_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@Query(ValidationPipe) query: any, @Request() req) {
    const user = req?.user || null;
    return this.service.list(query, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Criar novo aluno' })
  async create(
    @Body(new ValidationPipe({ skipMissingProperties: true })) dto: any,
    @Request() req,
  ) {
    // Se o usuário logado for responsável e não foi fornecido responsavel_id, buscar automaticamente
    if (!dto.responsavel_id && req.user) {
      try {
        // Primeiro tentar buscar responsável do usuário logado
        const responsavel = await this.dataSource.query(
          `SELECT id FROM teamcruz.responsaveis WHERE usuario_id = $1 LIMIT 1`,
          [req.user.id],
        );

        if (responsavel && responsavel.length > 0) {
          dto.responsavel_id = responsavel[0].id;
          (dto as any).is_dependente_cadastro = true;
        } else {
          // Se não for responsável, verificar se é um aluno (qualquer aluno pode cadastrar dependentes)
          const aluno = await this.dataSource.query(
            `SELECT id, responsavel_id FROM teamcruz.alunos WHERE usuario_id = $1 LIMIT 1`,
            [req.user.id],
          );

          if (aluno && aluno.length > 0) {
            // Se o aluno tem responsavel_id, usar o mesmo (cadastrar irmão/dependente)
            if (aluno[0].responsavel_id) {
              dto.responsavel_id = aluno[0].responsavel_id;
              (dto as any).is_dependente_cadastro = true;
            } else {
              // Aluno SEM responsavel_id: criar responsável com dados fornecidos
              // Usar dados do responsável fornecidos no DTO ou do próprio usuário
              const nomeResp = dto.responsavel_nome || dto.nome_completo;
              // Limpar CPF removendo caracteres não numéricos
              const cpfResp = (
                dto.responsavel_cpf ||
                dto.cpf ||
                '00000000000'
              ).replace(/\D/g, '');
              const emailResp =
                dto.responsavel_email ||
                dto.email ||
                `resp${Date.now()}@temp.local`;
              // Limpar telefone removendo caracteres não numéricos
              const telefoneResp = (
                dto.responsavel_telefone ||
                dto.telefone ||
                '00000000000'
              ).replace(/\D/g, '');

              const novoResponsavel = await this.dataSource.query(
                `INSERT INTO teamcruz.responsaveis
                 (usuario_id, nome_completo, email, cpf, telefone)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [req.user.id, nomeResp, emailResp, cpfResp, telefoneResp],
              );

              if (novoResponsavel && novoResponsavel.length > 0) {
                dto.responsavel_id = novoResponsavel[0].id;
                (dto as any).is_dependente_cadastro = true;

                // Atualizar o aluno atual com o responsavel_id
                await this.dataSource.query(
                  `UPDATE teamcruz.alunos SET responsavel_id = $1 WHERE id = $2`,
                  [dto.responsavel_id, aluno[0].id],
                );
              }
            }
          } else {
          }
        }
      } catch (error) {}
    }

    return this.service.create(dto);
  }

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Obter aluno por ID do usuário' })
  async getByUsuarioId(@Param('usuarioId') usuarioId: string) {
    const aluno = await this.service.findByUsuarioId(usuarioId);
    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado para este usuário');
    }
    return aluno;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter aluno por ID' })
  async get(@Param('id') id: string, @Request() req) {
    try {
      const user = req?.user || null;
      const result = await this.service.findById(id, user);
      return result;
    } catch (error) {
      console.error('❌ [GET /alunos/:id] Erro:', error.message);
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar aluno' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false, forbidNonWhitelisted: false }))
  update(
    @Param('id') id: string,
    @Body() bodyRaw: any,
    @Request() req,
  ) {
    // WORKAROUND REMOVIDO: Agora os campos consent_lgpd e consent_imagem chegam corretamente do frontend
    // Apenas garantir que existam caso não venham (para compatibilidade)
    if (bodyRaw.consent_lgpd === undefined) {
      bodyRaw.consent_lgpd = false;
    }
    if (bodyRaw.consent_imagem === undefined) {
      bodyRaw.consent_imagem = false;
    }
    
    const user = req?.user || null;
    return this.service.update(id, bodyRaw, user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('alunos:aprovar')
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Aprovar auto-cadastro de aluno' })
  approve(@Param('id') id: string) {
    return this.service.approveAluno(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover aluno' })
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }

  // ===== ENDPOINTS PARA MÚLTIPLAS UNIDADES =====

  @Get(':id/unidades')
  @ApiOperation({
    summary: '🏢 Listar unidades do aluno',
    description: 'Lista todas as unidades em que o aluno está matriculado',
  })
  @ApiResponse({ status: 200, description: '✅ Lista de unidades do aluno' })
  async listarUnidadesAluno(@Param('id') id: string) {
    return await this.alunoUnidadeService.listarUnidadesAluno(id);
  }

  @Post(':id/unidades')
  @ApiOperation({
    summary: '🏢 Adicionar aluno a uma unidade',
    description: 'Matricula o aluno em uma nova unidade',
  })
  @ApiResponse({ status: 201, description: '✅ Aluno matriculado na unidade' })
  async adicionarUnidade(
    @Param('id') alunoId: string,
    @Body(ValidationPipe) unidadeDto: AlunoUnidadeDto,
  ) {
    return await this.alunoUnidadeService.adicionarUnidade(alunoId, unidadeDto);
  }

  @Patch(':id/unidades/:unidadeId/principal')
  @ApiOperation({
    summary: '🏢 Definir unidade principal',
    description: 'Define qual unidade é a principal do aluno',
  })
  @ApiResponse({ status: 200, description: '✅ Unidade principal alterada' })
  async alterarUnidadePrincipal(
    @Param('id') alunoId: string,
    @Param('unidadeId') unidadeId: string,
  ) {
    await this.alunoUnidadeService.alterarUnidadePrincipal(alunoId, unidadeId);
    return { message: 'Unidade principal alterada com sucesso' };
  }

  @Delete(':id/unidades/:unidadeId')
  @ApiOperation({
    summary: '🏢 Remover aluno de uma unidade',
    description: 'Remove a matrícula do aluno de uma unidade específica',
  })
  @ApiResponse({ status: 200, description: '✅ Aluno removido da unidade' })
  async removerUnidade(
    @Param('id') alunoId: string,
    @Param('unidadeId') unidadeId: string,
  ) {
    await this.alunoUnidadeService.removerUnidade(alunoId, unidadeId);
    return { message: 'Aluno removido da unidade com sucesso' };
  }

  @Put(':id/unidades')
  @ApiOperation({
    summary: '🏢 Atualizar todas as unidades do aluno',
    description: 'Substitui todas as unidades do aluno pelas fornecidas',
  })
  @ApiResponse({ status: 200, description: '✅ Unidades do aluno atualizadas' })
  async atualizarUnidadesAluno(
    @Param('id') alunoId: string,
    @Body(ValidationPipe) unidades: AlunoUnidadeDto[],
  ) {
    return await this.alunoUnidadeService.atualizarUnidadesAluno(
      alunoId,
      unidades,
    );
  }

  @Patch(':id/faixa')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '🥋 Atualizar faixa do aluno manualmente',
    description:
      'Permite atualizar a faixa do aluno. Alunos podem atualizar a própria faixa, franqueados podem atualizar de seus alunos',
  })
  @ApiResponse({ status: 200, description: '✅ Faixa atualizada com sucesso' })
  @ApiResponse({ status: 404, description: '❌ Aluno não encontrado' })
  async atualizarFaixa(
    @Param('id') id: string,
    @Body()
    dto: {
      faixa_atual: string;
      graus: number;
      data_ultima_graduacao?: string;
    },
    @Request() req,
  ) {
    const perfis = req.user?.perfis?.map((p: any) =>
      (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
    );

    // Buscar aluno
    const aluno = await this.service.findById(id, req.user);

    // Verificar permissões
    const isProprioAluno = aluno.usuario_id === req.user.id;
    const isAdmin =
      perfis.includes('ADMIN') || perfis.includes('SUPER_ADMIN');
    const isProfessor =
      perfis.includes('PROFESSOR') || perfis.includes('INSTRUTOR');
    const isGerenteUnidade = perfis.includes('GERENTE_UNIDADE');
    const isRecepcionista = perfis.includes('RECEPCIONISTA');

    // Verificar se é franqueado do aluno
    let isFranqueadoDoAluno = false;
    if (perfis.includes('FRANQUEADO')) {
      const franqueadoResult = await this.dataSource.query(
        `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
        [req.user.id],
      );

      if (franqueadoResult && franqueadoResult.length > 0) {
        const franqueadoId = franqueadoResult[0].id;

        // Verificar se a unidade do aluno pertence ao franqueado
        const unidadeResult = await this.dataSource.query(
          `SELECT u.franqueado_id FROM teamcruz.unidades u
           INNER JOIN teamcruz.alunos a ON a.unidade_id = u.id
           WHERE a.id = $1 AND u.franqueado_id = $2`,
          [id, franqueadoId],
        );

        isFranqueadoDoAluno =
          unidadeResult && unidadeResult.length > 0;
      }
    }

    // Verificar se gerente/recepcionista é da mesma unidade do aluno
    let isMesmaUnidade = false;
    if (isGerenteUnidade || isRecepcionista) {
      // Buscar em gerente_unidades (para gerentes) ou professor_unidades (para recepcionistas/professores)
      let usuarioUnidades: any[] = [];
      
      if (isGerenteUnidade) {
        usuarioUnidades = await this.dataSource.query(
          `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
          [req.user.id],
        );
      } else if (isRecepcionista) {
        usuarioUnidades = await this.dataSource.query(
          `SELECT unidade_id FROM teamcruz.professor_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
          [req.user.id],
        );
      }
      
      if (usuarioUnidades && usuarioUnidades.length > 0) {
        isMesmaUnidade = usuarioUnidades[0].unidade_id === aluno.unidade_id;
      }
    }

    // Verificar se tem permissão
    if (
      !isProprioAluno &&
      !isAdmin &&
      !isProfessor &&
      !isFranqueadoDoAluno &&
      !isMesmaUnidade
    ) {
      throw new NotFoundException(
        'Você não tem permissão para atualizar a faixa deste aluno',
      );
    }

    // Atualizar usando o sistema de graduação
    return this.service.atualizarFaixaManual(
      id,
      dto.faixa_atual,
      dto.graus,
      dto.data_ultima_graduacao,
    );
  }

  // ===== TABLET CHECK-IN =====

  @Get('unidade/checkin')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '📱 Listar alunos ativos para check-in via tablet',
    description:
      'Lista todos os alunos ativos da unidade do usuário logado (para interface de tablet)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome ou CPF',
  })
  @ApiResponse({ status: 200, description: '✅ Lista de alunos para check-in' })
  async listarAlunosParaCheckin(
    @Query('search') search: string,
    @Request() req,
  ) {
    return this.service.listarAlunosParaCheckin(req.user, search);
  }

  // ===== MODALIDADES DO ALUNO =====

  @Get(':id/modalidades')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '📋 Listar modalidades do aluno',
    description: 'Retorna todas as modalidades ativas em que o aluno está matriculado',
  })
  @ApiResponse({ status: 200, description: '✅ Lista de modalidades do aluno' })
  async getModalidadesAluno(@Param('id') id: string) {
    return this.alunoModalidadeService.getModalidadesAluno(id);
  }

  @Post(':id/matricular-modalidade')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '➕ Matricular aluno em modalidade',
    description: 'Vincula um aluno a uma modalidade da unidade',
  })
  @ApiResponse({ status: 201, description: '✅ Matrícula criada' })
  @ApiResponse({ status: 409, description: '⚠️ Aluno já matriculado nesta modalidade' })
  async matricularModalidade(
    @Param('id') id: string,
    @Body() body: { modalidade_id: string; valor_praticado?: number },
  ) {
    return this.alunoModalidadeService.matricular({
      aluno_id: id,
      modalidade_id: body.modalidade_id,
      valor_praticado: body.valor_praticado,
    });
  }

  @Delete(':id/modalidades/:modalidadeId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '➖ Cancelar matrícula em modalidade',
    description: 'Remove a matrícula do aluno em uma modalidade',
  })
  @ApiResponse({ status: 200, description: '✅ Matrícula cancelada' })
  @ApiResponse({ status: 404, description: '❌ Matrícula não encontrada' })
  async cancelarModalidade(
    @Param('id') id: string,
    @Param('modalidadeId') modalidadeId: string,
  ) {
    await this.alunoModalidadeService.cancelar(id, modalidadeId);
    return { message: 'Matrícula cancelada com sucesso' };
  }
}
