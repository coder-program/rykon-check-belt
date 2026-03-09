import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FranqueadoFase3Service, CreateEventoDto, CreateSnapshotDto } from '../services/franqueado-fase3.service';

@ApiTags('franqueado-fase3')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FranqueadoFase3Controller {
  constructor(private readonly fase3Service: FranqueadoFase3Service) {}

  // ── EVENTOS ──────────────────────────────────────────────────

  @ApiOperation({ summary: 'Registrar evento de auditoria de franqueado' })
  @Post('franqueado-historico/eventos')
  registrarEvento(@Body() dto: CreateEventoDto) {
    return this.fase3Service.registrarEvento(dto);
  }

  @ApiOperation({ summary: 'Listar histórico de eventos de um franqueado' })
  @Get('franqueado-historico/franqueado/:id')
  getEventosByFranqueado(
    @Param('id') franqueadoId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.fase3Service.findEventosByFranqueado(franqueadoId, limit);
  }

  @ApiOperation({ summary: 'Listar histórico de eventos de um contrato' })
  @Get('franqueado-historico/contrato/:id')
  getEventosByContrato(@Param('id') contratoId: string) {
    return this.fase3Service.findEventosByContrato(contratoId);
  }

  // ── SNAPSHOTS ────────────────────────────────────────────────

  @ApiOperation({ summary: 'Criar snapshot manual de alunos por unidade' })
  @Post('unidade-snapshots')
  createSnapshot(@Body() dto: CreateSnapshotDto) {
    return this.fase3Service.createSnapshot(dto);
  }

  @ApiOperation({ summary: 'Gerar snapshot on-demand para uma unidade (busca dados reais)' })
  @Post('unidade-snapshots/gerar/:unidadeId')
  gerarSnapshot(
    @Param('unidadeId') unidadeId: string,
    @Body() body: { franqueado_id?: string; contrato_id?: string },
  ) {
    return this.fase3Service.gerarSnapshotManual(
      unidadeId,
      body.franqueado_id,
      body.contrato_id,
    );
  }

  @ApiOperation({ summary: 'Gerar snapshots para todas as unidades de um contrato' })
  @Post('unidade-snapshots/gerar-contrato/:contratoId')
  gerarSnapshotsPorContrato(@Param('contratoId') contratoId: string) {
    return this.fase3Service.gerarSnapshotsPorContrato(contratoId);
  }

  @ApiOperation({ summary: 'Listar snapshots de uma unidade (histórico)' })
  @Get('unidade-snapshots/unidade/:unidadeId')
  getSnapshotsByUnidade(
    @Param('unidadeId') unidadeId: string,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
  ) {
    return this.fase3Service.getSnapshotsByUnidade(unidadeId, limit);
  }

  @ApiOperation({ summary: 'Evolução mensal de alunos para gráfico' })
  @Get('unidade-snapshots/evolucao/:unidadeId')
  getEvolucaoAlunos(
    @Param('unidadeId') unidadeId: string,
    @Query('meses', new DefaultValuePipe(12), ParseIntPipe) meses: number,
  ) {
    return this.fase3Service.getEvolucaoAlunos(unidadeId, meses);
  }

  @ApiOperation({ summary: 'Último snapshot de cada unidade de um franqueado' })
  @Get('unidade-snapshots/franqueado/:franqueadoId')
  getSnapshotsByFranqueado(@Param('franqueadoId') franqueadoId: string) {
    return this.fase3Service.getSnapshotsByFranqueado(franqueadoId);
  }
}
