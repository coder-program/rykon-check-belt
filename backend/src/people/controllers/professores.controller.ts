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
} from '@nestjs/common';
import { ProfessoresService } from '../services/professores.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateProfessorDto } from '../dto/create-professor.dto';
import { UpdateProfessorDto } from '../dto/update-professor.dto';

@ApiTags('Professores')
@Controller('professores')
export class ProfessoresController {
  constructor(private readonly service: ProfessoresService) {}

  @Get()
  @ApiOperation({ summary: 'Listar professores (paginado/filtrado)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'unidade_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  list(@Query(ValidationPipe) query: any) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo professor' })
  create(@Body(ValidationPipe) dto: CreateProfessorDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter professor por ID' })
  get(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar professor' })
  update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdateProfessorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover professor' })
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
