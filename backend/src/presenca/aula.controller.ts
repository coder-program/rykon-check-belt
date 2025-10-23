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
import { AulaService } from './aula.service';
import { CreateAulaDto, UpdateAulaDto } from './dto/aula.dto';

@ApiTags('Aulas')
@Controller('aulas')
@UseGuards(JwtAuthGuard)
export class AulaController {
  constructor(private readonly aulaService: AulaService) {}

  @Post()
  @ApiOperation({ summary: 'Criar nova aula' })
  @ApiResponse({ status: 201, description: 'Aula criada com sucesso' })
  async create(@Body() createAulaDto: CreateAulaDto, @Request() req) {
    // TODO: Verificar permissão de admin/professor
    return this.aulaService.create(createAulaDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as aulas' })
  @ApiResponse({ status: 200, description: 'Lista de aulas' })
  async findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('ativo') ativo?: string,
    @Query('dia_semana') dia_semana?: string,
    @Request() req?: any,
  ) {
    // REGRA: Cada aluno só pode ver aulas da sua unidade
    let unidadeIdFiltro = unidade_id;

    // Se o usuário tem aluno associado, força a usar a unidade do aluno
    if (req?.user?.aluno?.unidade_id) {
      unidadeIdFiltro = req.user.aluno.unidade_id;
    }

    return this.aulaService.findAll({
      unidade_id: unidadeIdFiltro,
      ativo: ativo ? ativo === 'true' : undefined,
      dia_semana: dia_semana ? parseInt(dia_semana) : undefined,
    });
  }

  @Get('horarios')
  @ApiOperation({ summary: 'Listar horários disponíveis' })
  @ApiResponse({ status: 200, description: 'Horários disponíveis' })
  async findHorarios(
    @Query('unidade_id') unidade_id?: string,
    @Request() req?: any,
  ) {
    // REGRA: Cada aluno só pode ver aulas da sua unidade
    let unidadeIdFiltro = unidade_id;

    // Se o usuário tem aluno associado, força a usar a unidade do aluno
    if (req?.user?.aluno?.unidade_id) {
      unidadeIdFiltro = req.user.aluno.unidade_id;
    }

    return this.aulaService.findHorariosDisponiveis(unidadeIdFiltro);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar aula por ID' })
  @ApiResponse({ status: 200, description: 'Aula encontrada' })
  @ApiResponse({ status: 404, description: 'Aula não encontrada' })
  async findOne(@Param('id') id: string) {
    return this.aulaService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar aula' })
  @ApiResponse({ status: 200, description: 'Aula atualizada' })
  async update(
    @Param('id') id: string,
    @Body() updateAulaDto: UpdateAulaDto,
    @Request() req,
  ) {
    // TODO: Verificar permissão de admin/professor
    return this.aulaService.update(id, updateAulaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover aula' })
  @ApiResponse({ status: 200, description: 'Aula removida' })
  async remove(@Param('id') id: string, @Request() req) {
    // TODO: Verificar permissão de admin
    await this.aulaService.remove(id);
    return { message: 'Aula removida com sucesso' };
  }
}
