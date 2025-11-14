import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Patch,
  Delete,
  ValidationPipe,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProfessoresService } from '../services/professores.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateProfessorDto } from '../dto/create-professor.dto';
import { UpdateProfessorDto } from '../dto/update-professor.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Professores')
@Controller('professores')
@UseGuards(JwtAuthGuard)
export class ProfessoresController {
  constructor(private readonly service: ProfessoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar professores (paginado/filtrado)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'unidade_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'faixa_ministrante', required: false })
  @ApiQuery({ name: 'especialidades', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@Query(ValidationPipe) query: any, @Request() req) {
    const user = req?.user || null;
    return this.service.list(query, user);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo professor' })
  create(@Body(ValidationPipe) dto: CreateProfessorDto) {
    return this.service.create(dto);
  }

  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Obter professor por ID do usuário' })
  async getByUsuarioId(@Param('usuarioId') usuarioId: string) {
    return this.service.findByUsuarioId(usuarioId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter professor por ID' })
  get(@Param('id') id: string, @Request() req) {
    const user = req?.user || null;
    return this.service.findById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar professor' })
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: UpdateProfessorDto,
    @Request() req,
  ) {
    const user = req?.user || null;
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover professor' })
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
