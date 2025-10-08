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
} from '@nestjs/common';
import { AlunosService } from '../services/alunos.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateAlunoDto } from '../dto/create-aluno.dto';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';

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
  @ApiOperation({ summary: 'Obter contadores de alunos por filtros' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'unidade_id', required: false })
  async getStats(@Query(ValidationPipe) query: any) {
    return this.service.getStats(query);
  }

  @Get()
  @ApiOperation({ summary: 'Listar alunos (paginado/filtrado)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'faixa', required: false })
  @ApiQuery({ name: 'unidade_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@Query(ValidationPipe) query: any) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo aluno' })
  create(@Body(ValidationPipe) dto: CreateAlunoDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter aluno por ID' })
  get(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar aluno' })
  update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateAlunoDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Aprovar auto-cadastro de aluno' })
  approve(@Param('id') id: string) {
    return this.service.update(id, { status: 'ATIVO' } as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover aluno' })
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
