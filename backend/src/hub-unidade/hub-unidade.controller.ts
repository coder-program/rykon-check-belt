import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Request,
  ForbiddenException, Query,
  UseInterceptors, UploadedFile, BadRequestException, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HubUnidadeService } from './hub-unidade.service';
import {
  CriarVideoDto, AtualizarVideoDto,
  CriarRecadoDto, AtualizarRecadoDto,
  CriarProdutoDto, AtualizarProdutoDto,
  CriarPedidoDto,
} from './dto/hub-unidade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

const PERFIS_ADMIN   = ['ADMIN_SISTEMA', 'MASTER', 'SUPER_ADMIN'];
const PERFIS_GERENTE = ['ADMIN_SISTEMA', 'MASTER', 'SUPER_ADMIN', 'FRANQUEADO', 'GERENTE_UNIDADE', 'GERENTE', 'RECEPCIONISTA'];
const PERFIS_ALUNO   = ['ALUNO'];

@ApiTags('Hub da Unidade')
@Controller('hub-unidade')
@UseGuards(JwtAuthGuard)
export class HubUnidadeController {
  constructor(private readonly service: HubUnidadeService) {}

  private perfis(user: any): string[] {
    return (user?.perfis ?? []).map((p: any) =>
      (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
    );
  }

  private assertGerente(user: any) {
    if (!this.perfis(user).some((p) => PERFIS_GERENTE.includes(p)))
      throw new ForbiddenException('Acesso negado');
  }

  // ================================================================
  // VÍDEOS
  // ================================================================
  @Get('videos/:unidadeId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar vídeos ativos da unidade (aluno/gerente)' })
  listarVideos(@Param('unidadeId') id: string) {
    return this.service.listarVideos(id);
  }

  @Get('videos/:unidadeId/admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os vídeos (admin/gerente)' })
  listarTodosVideos(@Param('unidadeId') id: string, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.listarTodosVideos(id);
  }

  @Post('videos')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar vídeo (gerente)' })
  criarVideo(@Body() dto: CriarVideoDto, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.criarVideo(dto, req.user.id);
  }

  @Patch('videos/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar vídeo (gerente)' })
  atualizarVideo(@Param('id') id: string, @Body() dto: AtualizarVideoDto, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.atualizarVideo(id, dto);
  }

  @Delete('videos/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover vídeo (gerente)' })
  removerVideo(@Param('id') id: string, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.removerVideo(id);
  }

  // ================================================================
  // RECADOS
  // ================================================================
  @Get('recados/:unidadeId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar recados da unidade' })
  listarRecados(@Param('unidadeId') id: string) {
    return this.service.listarRecados(id);
  }

  @Post('recados')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar recado (gerente)' })
  criarRecado(@Body() dto: CriarRecadoDto, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.criarRecado(dto, req.user.id);
  }

  @Patch('recados/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar recado (gerente)' })
  atualizarRecado(@Param('id') id: string, @Body() dto: AtualizarRecadoDto, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.atualizarRecado(id, dto);
  }

  @Delete('recados/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover recado (gerente)' })
  removerRecado(@Param('id') id: string, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.removerRecado(id);
  }

  @Post('recados/:id/ler')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar recado como lido (aluno)' })
  marcarLido(@Param('id') recadoId: string, @Request() req: any) {
    const alunoId = req.user?.aluno_id ?? req.user?.id;
    return this.service.marcarLido(recadoId, alunoId);
  }

  @Get('recados/nao-lidos/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar se aluno tem recados não lidos (usado no login)' })
  temRecadosNaoLidos(@Request() req: any) {
    const alunoId = req.user?.aluno_id ?? req.user?.id;
    return this.service.temRecadosNaoLidos(alunoId);
  }

  // ================================================================
  // PRODUTOS
  // ================================================================
  @Get('produtos/:unidadeId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar produtos da vitrine (aluno)' })
  listarProdutos(@Param('unidadeId') id: string) {
    return this.service.listarProdutos(id);
  }

  @Get('produtos/:unidadeId/admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os produtos (gerente)' })
  listarProdutosAdmin(@Param('unidadeId') id: string, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.listarProdutosAdmin(id);
  }

  @Post('produtos')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar produto (gerente)' })
  criarProduto(@Body() dto: CriarProdutoDto, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.criarProduto(dto, req.user.id);
  }

  @Patch('produtos/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar produto (gerente)' })
  atualizarProduto(@Param('id') id: string, @Body() dto: AtualizarProdutoDto, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.atualizarProduto(id, dto);
  }

  @Delete('produtos/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover produto (gerente)' })
  removerProduto(@Param('id') id: string, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.removerProduto(id);
  }

  // ================================================================
  // PEDIDOS
  // ================================================================
  @Post('pedidos')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar pedido / iniciar checkout (aluno)' })
  criarPedido(@Body() dto: CriarPedidoDto, @Request() req: any) {
    const alunoId = req.user?.aluno_id ?? req.user?.id;
    return this.service.criarPedido(dto, alunoId);
  }

  @Get('pedidos/meus')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico de pedidos do aluno' })
  meusPedidos(@Request() req: any) {
    const alunoId = req.user?.aluno_id ?? req.user?.id;
    return this.service.listarPedidosAluno(alunoId);
  }

  @Get('pedidos/unidade/:unidadeId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pedidos recebidos pela unidade (gerente)' })
  pedidosUnidade(@Param('unidadeId') id: string, @Request() req: any) {
    this.assertGerente(req.user);
    return this.service.listarPedidosUnidade(id);
  }

  // ================================================================
  // UPLOAD DE IMAGEM
  // ================================================================
  @Post('upload-imagem')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de imagem para produto da loja' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImagem(
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    this.assertGerente(req.user);
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    return this.service.uploadImagemProduto(file);
  }

  @Get('imagens/:filename')
  @Public()
  @ApiOperation({ summary: 'Servir imagem de produto' })
  async servirImagem(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = await this.service.caminhoImagemProduto(filename);
    return res.sendFile(filePath);
  }

  /** Aluno cancela um pedido próprio pendente */
  @Post('pedidos/:id/cancelar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar pedido pendente (aluno)' })
  cancelarPedido(@Param('id') id: string, @Request() req: any) {
    return this.service.cancelarPedido(id, req.user?.id ?? req.user?.sub);
  }

  /** Chamado via webhook interno para aprovar pedido após confirmação do gateway */
  @Post('pedidos/:id/aprovar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aprovar pedido (sistema/webhook)' })
  aprovarPedido(
    @Param('id') id: string,
    @Body() body: { transacao_id: string; taxa_gateway?: number },
    @Request() req: any,
  ) {
    // Apenas admin ou sistema pode aprovar diretamente
    const perfis = this.perfis(req.user);
    if (!perfis.some((p) => PERFIS_ADMIN.includes(p)))
      throw new ForbiddenException('Acesso negado');
    return this.service.aprovarPedido(id, body.transacao_id, body.taxa_gateway ?? 0);
  }
}
