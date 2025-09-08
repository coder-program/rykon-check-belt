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
import { CreatePersonDto } from '../dto/create-person.dto';
import { UpdatePersonDto } from '../dto/update-person.dto';
import { FilterPersonDto } from '../dto/filter-person.dto';

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
  list(@Query(ValidationPipe) query: FilterPersonDto) {
    return this.service.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo professor' })
  create(@Body(ValidationPipe) dto: CreatePersonDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter professor por ID' })
  get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar professor' })
  update(@Param('id') id: string, @Body(ValidationPipe) dto: UpdatePersonDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover professor' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
