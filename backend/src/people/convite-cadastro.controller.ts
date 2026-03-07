import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Delete,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConviteCadastroService } from './convite-cadastro.service';
import {
  CriarConviteDto,
  CompletarCadastroDto,
} from './dto/convite-cadastro.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

const PERFIS_ADMIN_SEM_FILTRO_CONVITE = ['MASTER', 'GERENTE'];

@ApiTags('Convites de Cadastro')
@Controller('convites-cadastro')
export class ConviteCadastroController {
  constructor(private readonly conviteService: ConviteCadastroService) {}

  /** Resolve filtro seguro baseado no perfil do usuário */
  private resolveFilter(user: any, queryUnidadeId?: string): { unidadeId?: string; franqueadoId?: string } {
    const perfis: string[] =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) ?? [];

    console.log('[Convites][resolveFilter] user.id=', user?.id, '| perfis=', perfis);
    console.log('[Convites][resolveFilter] gerente_unidade=', user?.gerente_unidade?.unidade_id, '| recepcionista=', user?.recepcionista_unidade?.unidade_id, '| franqueado=', user?.franqueado?.id);

    // MASTER e GERENTE: sem filtro (vê tudo)
    if (perfis.some((p) => PERFIS_ADMIN_SEM_FILTRO_CONVITE.includes(p))) {
      console.log('[Convites][resolveFilter] => sem filtro (admin global)');
      return {};
    }

    // FRANQUEADO: filtra pelas unidades do seu franqueado_id
    if (perfis.includes('FRANQUEADO')) {
      const franqueadoId = user?.franqueado?.id;
      console.log('[Convites][resolveFilter] => FRANQUEADO, franqueadoId=', franqueadoId);
      if (!franqueadoId) throw new ForbiddenException('Franqueado sem ID vinculado');
      return { franqueadoId };
    }

    // RECEPCIONISTA / GERENTE_UNIDADE: filtra pela unidade do JWT
    const unidadeId =
      user?.gerente_unidade?.unidade_id ??
      user?.recepcionista_unidade?.unidade_id;
    console.log('[Convites][resolveFilter] => unidade do JWT=', unidadeId);
    if (!unidadeId) throw new ForbiddenException('Usuário sem unidade vinculada');
    return { unidadeId };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar convite de cadastro' })
  @ApiResponse({ status: 201, description: 'Convite criado com sucesso' })
  async criarConvite(@Body() dto: CriarConviteDto, @Request() req: any) {
    return await this.conviteService.criarConvite(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar convites' })
  @ApiResponse({ status: 200, description: 'Lista de convites' })
  async listarConvites(
    @Request() req: any,
    @Query('unidadeId') unidadeId?: string,
  ) {
    const { unidadeId: unidadeIdSegura, franqueadoId } = this.resolveFilter(req.user, unidadeId);
    console.log('[Convites][listarConvites] unidadeIdSegura=', unidadeIdSegura, '| franqueadoId=', franqueadoId);
    return await this.conviteService.listarConvites(unidadeIdSegura, franqueadoId);
  }

  @Get('validar/:token')
  @Public()
  @ApiOperation({ summary: 'Validar token de convite (público)' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  async validarToken(@Param('token') token: string) {
    return await this.conviteService.validarToken(token);
  }

  @Post('completar')
  @Public()
  @ApiOperation({ summary: 'Completar cadastro via convite (público)' })
  @ApiResponse({ status: 201, description: 'Cadastro completado' })
  async completarCadastro(@Body() dto: CompletarCadastroDto) {
    return await this.conviteService.completarCadastro(dto);
  }

  @Post(':id/reenviar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reenviar convite (estende expiração)' })
  @ApiResponse({ status: 200, description: 'Convite reenviado' })
  async reenviarConvite(@Param('id') id: string) {
    return await this.conviteService.reenviarConvite(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar convite' })
  @ApiResponse({ status: 200, description: 'Convite cancelado' })
  async cancelarConvite(@Param('id') id: string) {
    return await this.conviteService.cancelarConvite(id);
  }

  @Post('cadastro-publico')
  @Public()
  @ApiOperation({ summary: 'Cadastro público (com suporte a convênios)' })
  @ApiResponse({ status: 201, description: 'Cadastro completado' })
  async cadastroPublico(@Body() dto: any) {
    return await this.conviteService.cadastroPublico(dto);
  }
}
