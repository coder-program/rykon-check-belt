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

  // Endpoint PÚBLICO para listagem de unidades ativas (cadastro público)
  @Get('public/ativas')
  @ApiOperation({
    summary: 'Listar unidades ativas (público - sem autenticação)',
  })
  async listarAtivas(@Request() req) {
    console.log(
      '🔍 [UNIDADES CONTROLLER] Buscando unidades públicas ativas...',
    );
    const result = await this.unidadesService.listarPublicasAtivas();
    console.log(
      `✅ [UNIDADES CONTROLLER] Retornando ${result.length} unidades`,
    );
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado')
  @Post()
  @ApiOperation({ summary: 'Criar unidade/academia' })
  @ApiBody({ type: CreateUnidadeDto })
  async criar(@Body() dto: CreateUnidadeDto, @Request() req) {
    return this.unidadesService.criar(dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas das unidades' })
  async obterEstatisticas(@Request() req) {
    const user = req.user;
    return this.unidadesService.obterEstatisticas(user);
  }

  @UseGuards(JwtAuthGuard)
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
    // usuário autenticado é obrigatório para filtrar corretamente
    const user = req.user;
    // Log incoming query and auth info for debugging responsavel_cpf flows
    const result = await this.unidadesService.listar(query, user);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Obter unidade por ID' })
  @ApiParam({ name: 'id', type: String })
  async obter(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.unidadesService.obter(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado', 'gerente_unidade')
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
