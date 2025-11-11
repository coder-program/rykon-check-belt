import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModalidadesService } from './modalidades.service';
import { CreateModalidadeDto } from './dto/create-modalidade.dto';
import { UpdateModalidadeDto } from './dto/update-modalidade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Modalidades')
@Controller('modalidades')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ModalidadesController {
  constructor(private readonly modalidadesService: ModalidadesService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar nova modalidade (Jiu-Jitsu, Muay Thai, etc.)',
  })
  @ApiResponse({ status: 201, description: 'Modalidade criada com sucesso' })
  @ApiResponse({ status: 409, description: 'Modalidade já existe' })
  create(@Body() createModalidadeDto: CreateModalidadeDto) {
    return this.modalidadesService.create(createModalidadeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar modalidades da unidade' })
  @ApiResponse({ status: 200, description: 'Lista de modalidades retornada' })
  findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('apenasAtivas') apenasAtivas?: string,
  ) {
    const filtroAtivas = apenasAtivas === 'true';
    return this.modalidadesService.findAll(unidade_id, filtroAtivas);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar modalidade por ID' })
  @ApiResponse({ status: 200, description: 'Modalidade encontrada' })
  @ApiResponse({ status: 404, description: 'Modalidade não encontrada' })
  findOne(@Param('id') id: string) {
    return this.modalidadesService.findOne(id);
  }

  @Get(':id/estatisticas')
  @ApiOperation({ summary: 'Estatísticas da modalidade (alunos, faturamento)' })
  @ApiResponse({ status: 200, description: 'Estatísticas retornadas' })
  getEstatisticas(@Param('id') id: string) {
    return this.modalidadesService.getEstatisticas(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade atualizada' })
  @ApiResponse({ status: 404, description: 'Modalidade não encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateModalidadeDto: UpdateModalidadeDto,
  ) {
    return this.modalidadesService.update(id, updateModalidadeDto);
  }

  @Patch(':id/desativar')
  @ApiOperation({ summary: 'Desativar modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade desativada' })
  desativar(@Param('id') id: string) {
    return this.modalidadesService.desativar(id);
  }

  @Patch(':id/ativar')
  @ApiOperation({ summary: 'Ativar modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade ativada' })
  ativar(@Param('id') id: string) {
    return this.modalidadesService.ativar(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade deletada' })
  @ApiResponse({ status: 404, description: 'Modalidade não encontrada' })
  remove(@Param('id') id: string) {
    return this.modalidadesService.remove(id);
  }
}
