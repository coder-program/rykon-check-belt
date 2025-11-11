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
  NotFoundException,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AlunosService } from '../services/alunos.service';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateAlunoDto, AlunoUnidadeDto } from '../dto/create-aluno.dto';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { AlunoUnidadeService } from '../services/aluno-unidade.service';

@ApiTags('🎓 Alunos')
@ApiBearerAuth('JWT-auth')
@Controller('alunos')
export class AlunosController {
  constructor(
    private readonly service: AlunosService,
    private readonly alunoUnidadeService: AlunoUnidadeService,
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
  @ApiResponse({ status: 401, description: '❌ Token inválido ou expirado' })
  async getStats(@Query(ValidationPipe) query: any, @Request() req) {
    const user = req?.user || null;
    return this.service.getStats(query, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Listar alunos (paginado/filtrado)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'faixa', required: false })
  @ApiQuery({ name: 'unidade_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@Query(ValidationPipe) query: any, @Request() req) {
    const user = req?.user || null;
    return this.service.list(query, user);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo aluno' })
  create(@Body(ValidationPipe) dto: CreateAlunoDto) {
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
  get(@Param('id') id: string, @Request() req) {
    const user = req?.user || null;
    return this.service.findById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar aluno' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateAlunoDto,
    @Request() req,
  ) {
    const user = req?.user || null;
    return this.service.update(id, dto, user);
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
}
