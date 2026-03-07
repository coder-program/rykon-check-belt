import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AulaExperimentalService } from './aula-experimental.service';
import {
  CriarAgendamentoDto,
  AtualizarStatusAgendamentoDto,
  UpsertConfigAulaExperimentalDto,
} from './dto/aula-experimental.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const PERFIS_PERMITIDOS = ['RECEPCIONISTA', 'GERENTE_UNIDADE', 'GERENTE', 'FRANQUEADO', 'MASTER'];

@Controller('aula-experimental')
@UseGuards(JwtAuthGuard)
export class AulaExperimentalController {
  constructor(private readonly service: AulaExperimentalService) {}

  private assertPermissao(user: any) {
    const perfis: string[] =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) ?? [];
    const temPermissao = perfis.some((p) => PERFIS_PERMITIDOS.includes(p));
    if (!temPermissao) throw new ForbiddenException('Acesso negado');
  }

  // ── CONFIG ─────────────────────────────────────────────────────────

  @Get('config/:unidadeId/:modalidadeId')
  async getConfig(
    @Param('unidadeId') unidadeId: string,
    @Param('modalidadeId') modalidadeId: string,
    @Request() req: any,
  ) {
    this.assertPermissao(req.user);
    return this.service.getConfig(unidadeId, modalidadeId);
  }

  @Post('config/:unidadeId/:modalidadeId')
  async upsertConfig(
    @Param('unidadeId') unidadeId: string,
    @Param('modalidadeId') modalidadeId: string,
    @Body() dto: UpsertConfigAulaExperimentalDto,
    @Request() req: any,
  ) {
    this.assertPermissao(req.user);
    return this.service.upsertConfig(unidadeId, modalidadeId, dto);
  }

  // ── AGENDAMENTOS ───────────────────────────────────────────────────

  @Get()
  async listar(
    @Request() req: any,
    @Query('unidadeId') unidadeId?: string,
    @Query('modalidadeId') modalidadeId?: string,
  ) {
    this.assertPermissao(req.user);
    return this.service.listar(unidadeId, modalidadeId);
  }

  @Post()
  async criar(@Body() dto: CriarAgendamentoDto, @Request() req: any) {
    this.assertPermissao(req.user);
    return this.service.criar(dto, req.user?.id);
  }

  @Patch(':id/status')
  async atualizarStatus(
    @Param('id') id: string,
    @Body() dto: AtualizarStatusAgendamentoDto,
    @Request() req: any,
  ) {
    this.assertPermissao(req.user);
    return this.service.atualizarStatus(id, dto);
  }

  @Delete(':id')
  async remover(@Param('id') id: string, @Request() req: any) {
    this.assertPermissao(req.user);
    return this.service.remover(id);
  }
}
