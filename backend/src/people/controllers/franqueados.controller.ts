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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FranqueadosService } from '../services/franqueados.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CreateFranqueadoDto,
  UpdateFranqueadoDto,
} from '../dto/franqueados.dto';

@ApiTags('franqueados')
@Controller('franqueados')
export class FranqueadosController {
  constructor(private readonly service: FranqueadosService) {}

  // Helper para converter data_contrato de string para Date
  private prepareData(data: any): any {
    const prepared = { ...data };
    if (prepared.data_contrato && typeof prepared.data_contrato === 'string') {
      prepared.data_contrato = new Date(prepared.data_contrato);
    }
    return prepared;
  }

  @Get()
  @ApiOperation({ summary: 'Listar franqueados' })
  @ApiResponse({ status: 200, description: 'Lista de franqueados' })
  list(@Query() q: any) {
    return this.service.list(q);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Buscar franqueado do usuário logado' })
  @ApiResponse({ status: 200, description: 'Franqueado encontrado' })
  @ApiResponse({ status: 404, description: 'Franqueado não encontrado' })
  getMyFranqueado(@Request() req: any) {
    return this.service.getByUsuarioId(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('franqueado')
  @Post('minha-franquia')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Franqueado cadastra sua própria franquia' })
  @ApiResponse({ status: 201, description: 'Franquia cadastrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  createMyFranquia(@Request() req: any, @Body() body: CreateFranqueadoDto) {
    // Garantir que o usuario_id seja o do usuário logado
    const dadosFranquia = this.prepareData({
      ...body,
      usuario_id: req.user.id,
      situacao: 'EM_HOMOLOGACAO' as any, // Sempre começa em homologação
      ativo: true,
    });
    return this.service.create(dadosFranquia);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('franqueado')
  @Patch('minha-franquia/:id')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Franqueado atualiza sua própria franquia' })
  @ApiResponse({ status: 200, description: 'Franquia atualizada com sucesso' })
  @ApiResponse({ status: 403, description: 'Não autorizado' })
  async updateMyFranquia(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateFranqueadoDto,
  ) {
    // Verificar se a franquia pertence ao usuário logado
    const franquia = await this.service.get(id);
    if (!franquia) {
      throw new Error('Franquia não encontrada');
    }
    if (franquia.usuario_id !== req.user.id) {
      throw new Error('Você só pode atualizar sua própria franquia');
    }
    return this.service.update(id, this.prepareData(body));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master')
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Criar novo franqueado' })
  @ApiResponse({ status: 201, description: 'Franqueado criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(@Body() body: CreateFranqueadoDto) {
    return this.service.create(this.prepareData(body));
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
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Atualizar franqueado' })
  @ApiResponse({ status: 200, description: 'Franqueado atualizado' })
  @ApiResponse({ status: 404, description: 'Franqueado não encontrado' })
  update(@Param('id') id: string, @Body() body: UpdateFranqueadoDto) {
    return this.service.update(id, this.prepareData(body));
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
