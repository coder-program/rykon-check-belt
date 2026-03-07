import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { VideoTreinamentoService } from './video-treinamento.service';
import {
  CriarVideoTreinamentoDto,
  AtualizarVideoTreinamentoDto,
} from './dto/video-treinamento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const PERFIS_LEITURA = ['ALUNO', 'RECEPCIONISTA', 'INSTRUTOR', 'GERENTE_UNIDADE', 'GERENTE', 'FRANQUEADO', 'MASTER', 'SUPER_ADMIN', 'ADMIN_SISTEMA'];
const PERFIS_ADMIN   = ['ADMIN_SISTEMA'];

@ApiTags('Vídeos de Treinamento')
@Controller('videos-treinamento')
@UseGuards(JwtAuthGuard)
export class VideoTreinamentoController {
  constructor(private readonly service: VideoTreinamentoService) {}

  private getPerfis(user: any): string[] {
    return (
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) ?? []
    );
  }

  private assertLeitura(user: any) {
    const perfis = this.getPerfis(user);
    if (!perfis.some((p) => PERFIS_LEITURA.includes(p))) {
      throw new ForbiddenException('Acesso negado');
    }
  }

  private assertAdmin(user: any) {
    const perfis = this.getPerfis(user);
    if (!perfis.some((p) => PERFIS_ADMIN.includes(p))) {
      throw new ForbiddenException('Apenas administradores podem gerenciar vídeos');
    }
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar vídeos ativos (todos os usuários logados)' })
  async listar(@Request() req: any) {
    this.assertLeitura(req.user);
    return this.service.listarAtivos();
  }

  @Get('admin/todos')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os vídeos incluindo inativos (admin)' })
  async listarTodos(@Request() req: any) {
    this.assertAdmin(req.user);
    return this.service.listarTodos();
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar vídeo (admin)' })
  async criar(@Body() dto: CriarVideoTreinamentoDto, @Request() req: any) {
    this.assertAdmin(req.user);
    return this.service.criar(dto, req.user.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar vídeo (admin)' })
  async atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarVideoTreinamentoDto,
    @Request() req: any,
  ) {
    this.assertAdmin(req.user);
    return this.service.atualizar(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover vídeo (admin)' })
  async remover(@Param('id') id: string, @Request() req: any) {
    this.assertAdmin(req.user);
    return this.service.remover(id);
  }
}
