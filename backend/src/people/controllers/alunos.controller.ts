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
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateAlunoDto } from '../dto/create-aluno.dto';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Alunos')
@Controller('alunos')
export class AlunosController {
  constructor(private readonly service: AlunosService) {}

  @Get('buscar-por-nome')
  @ApiOperation({ summary: 'Buscar alunos por nome (autocomplete)' })
  @ApiQuery({ name: 'nome', required: true })
  async buscarPorNome(@Query('nome') nome: string) {
    return this.service.buscarPorNome(nome);
  }

  @Get('stats/counts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter contadores de alunos por filtros' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'unidade_id', required: false })
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
    console.log('🚀 [AlunosController.list] INÍCIO');
    console.log(
      '🚀 [AlunosController.list] req.user:',
      JSON.stringify(req?.user, null, 2),
    );
    console.log(
      '🚀 [AlunosController.list] query params:',
      JSON.stringify(query, null, 2),
    );
    const user = req?.user || null;
    console.log(
      '🚀 [AlunosController.list] Passando user para service:',
      user ? 'SIM' : 'NÃO',
    );
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
