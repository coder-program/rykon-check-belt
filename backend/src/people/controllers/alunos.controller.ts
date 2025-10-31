import {
  Controller,
  Get,
  Post,
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
import { CreateAlunoDto } from '../dto/create-aluno.dto';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('🎓 Alunos')
@ApiBearerAuth('JWT-auth')
@Controller('alunos')
export class AlunosController {
  constructor(private readonly service: AlunosService) {}

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
}
