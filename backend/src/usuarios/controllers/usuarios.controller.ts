import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { UsuariosService } from '../services/usuarios.service';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('👥 Usuários')
@ApiBearerAuth('JWT-auth')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @ApiOperation({
    summary: '➕ Criar novo usuário',
    description: 'Cria um novo usuário no sistema com perfil e permissões',
  })
  @ApiResponse({ status: 201, description: '✅ Usuário criado com sucesso' })
  @ApiResponse({
    status: 400,
    description: ' Dados inválidos ou email já existe',
  })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: '📋 Listar usuários',
    description:
      'Lista todos os usuários com filtro hierárquico baseado no perfil do usuário autenticado',
  })
  @ApiQuery({
    name: 'perfil',
    required: false,
    description: 'Filtrar por tipo de perfil específico',
  })
  @ApiResponse({ status: 200, description: '✅ Lista de usuários retornada' })
  @ApiResponse({ status: 401, description: ' Token inválido ou expirado' })
  findAll(@Query('perfil') perfil?: string, @Request() req?) {
    if (perfil) {
      return this.usuariosService.findByPerfil(perfil);
    }

    // Passar usuário autenticado para aplicar filtro hierárquico
    return this.usuariosService.findAllWithHierarchy(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('responsavel/me')
  @ApiOperation({
    summary: '👤 Buscar dados do responsável logado',
    description:
      'Retorna os dados completos do responsável vinculado ao usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Dados do responsável retornados',
  })
  @ApiResponse({ status: 404, description: ' Responsável não encontrado' })
  async getMyResponsavel(@Request() req) {
    return this.usuariosService.findMyResponsavel(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pendentes/list')
  @ApiOperation({
    summary: 'Listar usuários com cadastro completo aguardando aprovação',
  })
  async getPendentes(@Request() req) {
    const result = await this.usuariosService.findPendingApproval(req.user);
    return result;
  }

  @Get('debug/all-status')
  @ApiOperation({ summary: 'Debug - Listar todos os usuários com seus status' })
  async getDebugAllStatus() {
    return this.usuariosService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: '👤 Buscar dados do usuário autenticado',
    description:
      'Retorna os dados completos do usuário logado incluindo perfis, permissões e unidades',
  })
  @ApiResponse({
    status: 200,
    description: '✅ Dados do usuário retornados',
  })
  @ApiResponse({ status: 401, description: ' Token inválido ou expirado' })
  async getMe(@Request() req) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Usuário não autenticado');
    }
    return this.usuariosService.findOne(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter usuário por ID' })
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Listar permissões de um usuário' })
  getUserPermissions(@Param('id') id: string) {
    return this.usuariosService.getUserPermissions(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: Partial<CreateUsuarioDto>,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover usuário' })
  remove(@Param('id') id: string) {
    return this.usuariosService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/aprovar')
  @ApiOperation({ summary: 'Aprovar usuário e ativar sua conta' })
  aprovar(@Param('id') id: string) {
    return this.usuariosService.approveUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/rejeitar')
  @ApiOperation({ summary: 'Rejeitar cadastro de usuário' })
  rejeitar(@Param('id') id: string) {
    return this.usuariosService.rejectUser(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reset-senha')
  @ApiOperation({ summary: 'Redefinir senha de um usuário (gerente/franqueado/master)' })
  async resetSenha(
    @Param('id') id: string,
    @Body() body: { nova_senha: string },
    @Request() req,
  ) {
    const perfisPermitidos = ['master', 'franqueado', 'gerente_unidade', 'gerente', 'admin'];
    const perfisUsuario: string[] = (req.user?.perfis ?? []).map((p: any) =>
      (typeof p === 'string' ? p : p.nome ?? '').toLowerCase(),
    );
    const temPermissao = perfisUsuario.some((p) => perfisPermitidos.includes(p));
    if (!temPermissao) {
      throw new UnauthorizedException('Sem permissão para redefinir senha de usuários');
    }
    if (!body.nova_senha || body.nova_senha.length < 6) {
      throw new UnauthorizedException('A nova senha deve ter ao menos 6 caracteres');
    }
    await this.usuariosService.update(id, { password: body.nova_senha } as any);
    return { message: 'Senha redefinida com sucesso' };
  }
}
