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

  @Get()
  @ApiOperation({ summary: 'Listar franqueados' })
  @ApiResponse({ status: 200, description: 'Lista de franqueados' })
  list(@Query() q: any) {
    return this.service.list(q);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master')
  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @ApiOperation({ summary: 'Criar novo franqueado' })
  @ApiResponse({ status: 201, description: 'Franqueado criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  create(@Body() body: CreateFranqueadoDto) {
    return this.service.create(body);
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
