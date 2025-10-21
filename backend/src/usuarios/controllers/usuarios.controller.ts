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
} from '@nestjs/common';
import { UsuariosService } from '../services/usuarios.service';
import { CreateUsuarioDto } from '../dto/create-usuario.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Usuários')
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @ApiOperation({ summary: 'Criar usuário' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Listar usuários' })
  findAll(@Query('perfil') perfil?: string, @Request() req?) {
    if (perfil) {
      return this.usuariosService.findByPerfil(perfil);
    }

    // Passar usuário autenticado para aplicar filtro hierárquico
    return this.usuariosService.findAllWithHierarchy(req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('usuarios:aprovar')
  @Get('pendentes/list')
  @ApiOperation({
    summary: 'Listar usuários com cadastro completo aguardando aprovação',
  })
  async getPendentes(@Request() req) {
    const result = await this.usuariosService.findPendingApproval(req.user);
    console.log('=== DEBUG PENDENTES ===');
    console.log('Total de usuários retornados:', result.length);
    console.log('Usuários:', JSON.stringify(result, null, 2));
    return result;
  }

  @Get('debug/all-status')
  @ApiOperation({ summary: 'Debug - Listar todos os usuários com seus status' })
  async getDebugAllStatus() {
    return this.usuariosService.findAll();
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

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('usuarios:aprovar')
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
}
