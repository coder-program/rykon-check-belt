import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModalidadesService } from './modalidades.service';
import { CreateModalidadeDto, VincularModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Modalidades')
@Controller('modalidades')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ModalidadesController {
  constructor(private readonly modalidadesService: ModalidadesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('master', 'franqueado', 'gerente_unidade')
  @ApiOperation({
    summary: 'Criar nova modalidade (Jiu-Jitsu, Muay Thai, etc.) — apenas franqueado/gerente',
  })
  @ApiResponse({ status: 201, description: 'Modalidade criada com sucesso' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 409, description: 'Modalidade já existe' })
  create(@Body() createModalidadeDto: CreateModalidadeDto) {
    return this.modalidadesService.create(createModalidadeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar modalidades (todas ou filtradas por unidade)' })
  @ApiResponse({ status: 200, description: 'Lista de modalidades retornada' })
  findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('apenasAtivas') apenasAtivas?: string,
  ) {
    const filtroAtivas = apenasAtivas === 'true';
    return this.modalidadesService.findAll(unidade_id, filtroAtivas);
  }

  @Get('unidade-modalidades')
  @ApiOperation({ summary: 'Listar vínculos unidade↔modalidade' })
  @ApiResponse({ status: 200, description: 'Lista de vínculos retornada' })
  listUnidadeModalidades(@Query('unidade_id') unidade_id?: string) {
    return this.modalidadesService.listUnidadeModalidades(unidade_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar modalidade por ID' })
  @ApiResponse({ status: 200, description: 'Modalidade encontrada' })
  @ApiResponse({ status: 404, description: 'Modalidade não encontrada' })
  findOne(@Param('id') id: string) {
    return this.modalidadesService.findOne(id);
  }

  @Get(':id/estatisticas')
  @ApiOperation({ summary: 'Estatísticas da modalidade (alunos, faturamento)' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas' })
  getEstatisticas(@Param('id') id: string) {
    return this.modalidadesService.getEstatisticas(id);
  }
  @Get(':id/alunos')
  @ApiOperation({ summary: 'Listar alunos matriculados na modalidade' })
  @ApiResponse({ status: 200, description: 'Lista de alunos retornada' })
  getAlunos(@Param('id') id: string) {
    return this.modalidadesService.getAlunos(id);
  }


  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('master', 'franqueado', 'gerente_unidade')
  @ApiOperation({ summary: 'Atualizar modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade atualizada' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Modalidade não encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateModalidadeDto: UpdateModalidadeDto,
  ) {
    return this.modalidadesService.update(id, updateModalidadeDto);
  }

  @Patch(':id/desativar')
  @UseGuards(RolesGuard)
  @Roles('master', 'franqueado', 'gerente_unidade')
  @ApiOperation({ summary: 'Desativar modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade desativada' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  desativar(@Param('id') id: string) {
    return this.modalidadesService.desativar(id);
  }

  @Patch(':id/ativar')
  @UseGuards(RolesGuard)
  @Roles('master', 'franqueado', 'gerente_unidade')
  @ApiOperation({ summary: 'Ativar modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade ativada' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  ativar(@Param('id') id: string) {
    return this.modalidadesService.ativar(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('master', 'franqueado')
  @ApiOperation({ summary: 'Deletar modalidade (apenas master/franqueado)' })
  @ApiResponse({ status: 200, description: 'Modalidade deletada' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  @ApiResponse({ status: 404, description: 'Modalidade não encontrada' })
  remove(@Param('id') id: string) {
    return this.modalidadesService.remove(id);
  }

  // ── VÍNCULOS UNIDADE ↔ MODALIDADE ───────────────────────────

  @Post(':id/vincular')
  @UseGuards(RolesGuard)
  @Roles('master', 'franqueado', 'gerente_unidade')
  @ApiOperation({ summary: 'Vincular modalidade a uma unidade' })
  @ApiResponse({ status: 201, description: 'Vínculo criado' })
  @ApiResponse({ status: 409, description: 'Já vinculada' })
  vincular(@Param('id') id: string, @Body() dto: VincularModalidadeDto) {
    return this.modalidadesService.vincularUnidade(id, dto.unidade_id);
  }

  @Delete(':id/vincular/:unidade_id')
  @UseGuards(RolesGuard)
  @Roles('master', 'franqueado', 'gerente_unidade')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover vínculo modalidade↔unidade' })
  @ApiResponse({ status: 204, description: 'Vínculo removido' })
  desvincular(
    @Param('id') id: string,
    @Param('unidade_id') unidade_id: string,
  ) {
    return this.modalidadesService.desvincularUnidade(id, unidade_id);
  }
}
