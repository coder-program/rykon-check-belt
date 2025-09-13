import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UnidadesService } from '../services/unidades.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CreateUnidadeDto,
  UpdateUnidadeDto,
  UnidadeQueryDto,
} from '../dto/unidades.dto';

@ApiTags('Unidades')
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado')
  @Post()
  @ApiOperation({ summary: 'Criar unidade/academia' })
  @ApiBody({ type: CreateUnidadeDto })
  async criar(@Body() dto: CreateUnidadeDto, @Request() req) {
    return this.unidadesService.criar(dto, req.user);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas das unidades' })
  async obterEstatisticas(@Request() req) {
    const user = req?.user || null;
    return this.unidadesService.obterEstatisticas(user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar unidades (paginado/filtrado)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome, CNPJ ou responsável',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ATIVA', 'INATIVA', 'HOMOLOGACAO'],
  })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'pageSize', required: false, example: '20' })
  async listar(@Query() query: UnidadeQueryDto, @Request() req) {
    // se autenticado, repassamos para permitir filtragem por franqueado
    const user = req?.user || null;
    return this.unidadesService.listar(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter unidade por ID' })
  @ApiParam({ name: 'id', type: String })
  async obter(@Param('id') id: string, @Request() req) {
    const user = req?.user || null;
    return this.unidadesService.obter(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado')
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar unidade' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateUnidadeDto })
  async atualizar(
    @Param('id') id: string,
    @Body() dto: UpdateUnidadeDto,
    @Request() req,
  ) {
    return this.unidadesService.atualizar(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado')
  @Delete(':id')
  @ApiOperation({ summary: 'Remover unidade' })
  @ApiParam({ name: 'id', type: String })
  async remover(@Param('id') id: string, @Request() req) {
    return this.unidadesService.remover(id, req.user);
  }
}
