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
const PERFIS_ADMIN_SEM_FILTRO = ['MASTER', 'GERENTE'];

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

  /** Resolve filtro seguro baseado no perfil do usuário */
  private resolveFilter(user: any, queryUnidadeId?: string): { unidadeId?: string; franqueadoId?: string } {
    const perfis: string[] =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) ?? [];

    console.log('[AulaExp][resolveFilter] user.id=', user?.id, '| perfis=', perfis);
    console.log('[AulaExp][resolveFilter] gerente_unidade=', user?.gerente_unidade?.unidade_id, '| recepcionista=', user?.recepcionista_unidade?.unidade_id, '| franqueado=', user?.franqueado?.id);

    // MASTER e GERENTE: sem filtro (vê tudo)
    if (perfis.some((p) => PERFIS_ADMIN_SEM_FILTRO.includes(p))) {
      console.log('[AulaExp][resolveFilter] => sem filtro (admin global)');
      return {};
    }

    // FRANQUEADO: filtra pelas unidades do seu franqueado_id
    if (perfis.includes('FRANQUEADO')) {
      const franqueadoId = user?.franqueado?.id;
      console.log('[AulaExp][resolveFilter] => FRANQUEADO, franqueadoId=', franqueadoId);
      if (!franqueadoId) throw new ForbiddenException('Franqueado sem ID vinculado');
      return { franqueadoId };
    }

    // RECEPCIONISTA / GERENTE_UNIDADE: filtra pela unidade do JWT
    const unidadeId =
      user?.gerente_unidade?.unidade_id ??
      user?.recepcionista_unidade?.unidade_id;
    console.log('[AulaExp][resolveFilter] => unidade do JWT=', unidadeId);
    if (!unidadeId) throw new ForbiddenException('Usuário sem unidade vinculada');
    return { unidadeId };
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
    const { unidadeId: unidadeIdSegura, franqueadoId } = this.resolveFilter(req.user, unidadeId);
    console.log('[AulaExp][listar] unidadeIdSegura=', unidadeIdSegura, '| franqueadoId=', franqueadoId, '| modalidadeId=', modalidadeId);
    return this.service.listar(unidadeIdSegura, modalidadeId, franqueadoId);
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
