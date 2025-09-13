import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GraduacaoService } from './graduacao.service';
import { StatusGraduacaoDto } from './dto/status-graduacao.dto';
import { ListaProximosGraduarDto } from './dto/proximos-graduar.dto';
import {
  ConcederGrauDto,
  GraduarFaixaDto,
  CriarFaixaAlunoDto,
} from './dto/conceder-grau.dto';
import { FaixaDef } from './entities/faixa-def.entity';

@ApiTags('Graduação')
@Controller('graduacao')
// @UseGuards(JwtAuthGuard) // Descomentar quando auth estiver configurado
// @ApiBearerAuth()
export class GraduacaoController {
  constructor(private readonly graduacaoService: GraduacaoService) {}

  @Get('faixas')
  @ApiOperation({ summary: 'Lista todas as faixas disponíveis' })
  @ApiResponse({ status: 200, description: 'Lista de faixas' })
  async listarFaixas(
    @Query('categoria') categoria?: string,
  ): Promise<FaixaDef[]> {
    return await this.graduacaoService.listarFaixas(categoria);
  }

  @Get('alunos/:alunoId/status')
  @ApiOperation({ summary: 'Obtém o status de graduação do aluno' })
  @ApiResponse({ status: 200, type: StatusGraduacaoDto })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  async getStatusGraduacao(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
  ): Promise<StatusGraduacaoDto> {
    return await this.graduacaoService.getStatusGraduacao(alunoId);
  }

  @Get('proximos-graduar')
  @ApiOperation({ summary: 'Lista próximos alunos a graduar' })
  @ApiResponse({ status: 200, type: ListaProximosGraduarDto })
  async getProximosGraduar(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('unidadeId') unidadeId?: string,
    @Query('categoria') categoria?: 'adulto' | 'kids' | 'todos',
  ): Promise<ListaProximosGraduarDto> {
    return await this.graduacaoService.getProximosGraduar({
      page,
      pageSize,
      unidadeId,
      categoria,
    });
  }

  @Post('alunos/:alunoId/graus')
  @ApiOperation({ summary: 'Concede um grau ao aluno' })
  @ApiResponse({ status: 201, description: 'Grau concedido com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Aluno já possui número máximo de graus',
  })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  async concederGrau(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: ConcederGrauDto,
  ) {
    return await this.graduacaoService.concederGrau(alunoId, dto);
  }

  @Post('alunos/:alunoId/graduacoes')
  @ApiOperation({ summary: 'Gradua o aluno para uma nova faixa' })
  @ApiResponse({ status: 201, description: 'Aluno graduado com sucesso' })
  @ApiResponse({ status: 400, description: 'Faixa de destino inválida' })
  @ApiResponse({ status: 404, description: 'Aluno ou faixa não encontrados' })
  async graduarFaixa(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: GraduarFaixaDto,
  ) {
    return await this.graduacaoService.graduarFaixa(alunoId, dto);
  }

  @Post('alunos/:alunoId/faixas')
  @ApiOperation({
    summary: 'Cria uma faixa para o aluno (usado para inicializar)',
  })
  @ApiResponse({ status: 201, description: 'Faixa criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Aluno já possui faixa ativa' })
  @ApiResponse({ status: 404, description: 'Aluno ou faixa não encontrados' })
  async criarFaixaAluno(
    @Param('alunoId', ParseUUIDPipe) alunoId: string,
    @Body() dto: CriarFaixaAlunoDto,
  ) {
    return await this.graduacaoService.criarFaixaAluno(alunoId, dto);
  }

  @Post('alunos/:alunoId/presenca')
  @ApiOperation({
    summary: 'Registra presença e incrementa contadores de graduação',
  })
  @ApiResponse({ status: 200, description: 'Presença registrada' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  async incrementarPresenca(@Param('alunoId', ParseUUIDPipe) alunoId: string) {
    return await this.graduacaoService.incrementarPresenca(alunoId);
  }

  @Get('historico')
  @ApiOperation({ summary: 'Lista o histórico de graduações realizadas' })
  @ApiResponse({ status: 200, description: 'Histórico de graduações' })
  async getHistoricoGraduacoes(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('unidadeId') unidadeId?: string,
    @Query('alunoId') alunoId?: string,
    @Query('categoria') categoria?: 'adulto' | 'kids' | 'todos',
  ) {
    return await this.graduacaoService.getHistoricoGraduacoes({
      page: page || 1,
      pageSize: pageSize || 20,
      unidadeId,
      alunoId,
      categoria,
    });
  }
}
