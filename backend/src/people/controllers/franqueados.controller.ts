import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  ValidationPipe,
  UsePipes,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { CustomValidationPipe } from '../../common/pipes/validation.pipe';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FranqueadosService } from '../services/franqueados.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProfileCompleteGuard } from '../../auth/guards/profile-complete.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AllowIncomplete } from '../../auth/decorators/allow-incomplete.decorator';
import {
  CreateFranqueadoSimplifiedDto,
  UpdateFranqueadoSimplifiedDto,
} from '../dto/franqueado-simplified.dto';

@ApiTags('franqueados')
@Controller('franqueados')
export class FranqueadosController {
  constructor(private readonly service: FranqueadosService) {}

  @UseGuards(JwtAuthGuard, ProfileCompleteGuard)
  @Get()
  @ApiOperation({ summary: 'Listar franqueados' })
  @ApiResponse({ status: 200, description: 'Lista de franqueados' })
  list(@Query() q: any) {
    return this.service.list(q);
  }

  @UseGuards(JwtAuthGuard)
  @AllowIncomplete()
  @Get('me')
  @ApiOperation({ summary: 'Buscar franqueado do usuário logado' })
  @ApiResponse({ status: 200, description: 'Franqueado encontrado' })
  @ApiResponse({ status: 404, description: 'Franqueado não encontrado' })
  async getMyFranqueado(@Request() req: any) {
    const franqueado = await this.service.getByUsuarioId(req.user.id);
    if (!franqueado) {
      throw new NotFoundException('Franqueado não encontrado');
    }
    return franqueado;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('franqueado')
  @AllowIncomplete()
  @Post('minha-franquia')
  @UsePipes(new CustomValidationPipe())
  @ApiOperation({ summary: 'Franqueado cadastra sua própria franquia' })
  @ApiResponse({ status: 201, description: 'Franquia cadastrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  createMyFranquia(
    @Request() req: any,
    @Body() body: CreateFranqueadoSimplifiedDto,
  ) {
    // Garantir que o usuario_id seja o do usuário logado
    const dadosFranquia = {
      ...body,
      usuario_id: req.user.id,
      situacao: 'EM_HOMOLOGACAO' as any, // Sempre começa em homologação
      ativo: true,
    };
    return this.service.create(dadosFranquia);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('franqueado')
  @AllowIncomplete()
  @Patch('minha-franquia/:id')
  @UsePipes(new CustomValidationPipe())
  @ApiOperation({ summary: 'Franqueado atualiza sua própria franquia' })
  @ApiResponse({ status: 200, description: 'Franquia atualizada com sucesso' })
  @ApiResponse({ status: 403, description: 'Não autorizado' })
  async updateMyFranquia(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateFranqueadoSimplifiedDto,
  ) {
    // Verificar se a franquia pertence ao usuário logado
    const franquia = await this.service.get(id);
    if (!franquia) {
      throw new Error('Franquia não encontrada');
    }
    if (franquia.usuario_id !== req.user.id) {
      throw new Error('Você só pode atualizar sua própria franquia');
    }
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master')
  @Post()
  @UsePipes(new CustomValidationPipe())
  @ApiOperation({ summary: 'Criar novo franqueado' })
  @ApiResponse({ status: 201, description: 'Franqueado criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(@Request() req: any, @Body() body: CreateFranqueadoSimplifiedDto) {
    // Se for MASTER criando, vai direto como ATIVA, senão vai para homologação
    const isMaster = req.user?.perfis?.some(
      (p: any) => p.nome === 'MASTER' || p === 'MASTER',
    );

    const dadosFranquia: CreateFranqueadoSimplifiedDto = {
      ...body,
      situacao: (isMaster ? 'ATIVA' : 'EM_HOMOLOGACAO') as
        | 'ATIVA'
        | 'INATIVA'
        | 'EM_HOMOLOGACAO',
    };

    return this.service.create(dadosFranquia);
  }

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Buscar franqueado por ID do usuário' })
  @ApiResponse({ status: 200, description: 'Franqueado encontrado' })
  @ApiResponse({ status: 404, description: 'Franqueado não encontrado' })
  getByUsuarioId(@Param('usuarioId') usuarioId: string) {
    return this.service.getByUsuarioId(usuarioId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar franqueado por ID' })
  @ApiResponse({ status: 200, description: 'Franqueado encontrado' })
  @ApiResponse({ status: 404, description: 'Franqueado não encontrado' })
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master')
  @Patch(':id')
  @UsePipes(new CustomValidationPipe())
  @ApiOperation({ summary: 'Atualizar franqueado' })
  @ApiResponse({ status: 200, description: 'Franqueado atualizado' })
  @ApiResponse({ status: 404, description: 'Franqueado não encontrado' })
  update(@Param('id') id: string, @Body() body: UpdateFranqueadoSimplifiedDto) {
    return this.service.update(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master')
  @Delete(':id')
  @ApiOperation({ summary: 'Remover franqueado' })
  @ApiResponse({ status: 200, description: 'Franqueado removido' })
  @ApiResponse({ status: 404, description: 'Franqueado não encontrado' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
