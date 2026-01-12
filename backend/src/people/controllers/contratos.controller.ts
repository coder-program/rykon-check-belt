import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContratosService } from '../services/contratos.service';
import {
  CreateContratoUnidadeDto,
  UpdateContratoUnidadeDto,
  AssinarContratoDto,
} from '../dto/contrato-unidade.dto';

@ApiTags('Contratos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contratos')
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  // ===== CRUD DE CONTRATOS (Gerentes/Administradores) =====

  @Post()
  @ApiOperation({ summary: 'Criar novo contrato para unidade' })
  async create(@Request() req, @Body() createDto: CreateContratoUnidadeDto) {
    return await this.contratosService.create(createDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os contratos' })
  async findAll(@Query('unidade_id') unidadeId?: string) {
    return await this.contratosService.findAll(unidadeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar contrato por ID' })
  async findOne(@Param('id') id: string) {
    return await this.contratosService.findOne(id);
  }

  @Get('unidade/:unidadeId')
  @ApiOperation({ summary: 'Buscar contratos de uma unidade' })
  async findByUnidade(@Param('unidadeId') unidadeId: string) {
    return await this.contratosService.findByUnidade(unidadeId);
  }

  @Get('unidade/:unidadeId/ativo')
  @ApiOperation({ summary: 'Buscar contrato ativo de uma unidade' })
  async getContratoAtivo(@Param('unidadeId') unidadeId: string) {
    return await this.contratosService.getContratoAtivoUnidade(unidadeId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar contrato' })
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateContratoUnidadeDto,
  ) {
    return await this.contratosService.update(id, updateDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar contrato' })
  async remove(@Param('id') id: string) {
    return await this.contratosService.remove(id);
  }

  // ===== ASSINATURA DE CONTRATOS =====

  @Post('aluno/:alunoId/assinar')
  @ApiOperation({ summary: 'Aluno assinar contrato' })
  async assinarAluno(
    @Request() req,
    @Param('alunoId') alunoId: string,
    @Body() assinarDto: AssinarContratoDto,
  ) {
    // Capturar IP do request
    assinarDto.ip_address = req.ip || req.connection?.remoteAddress;
    assinarDto.user_agent = req.get('User-Agent');

    return await this.contratosService.assinarContratoAluno(
      alunoId,
      req.user.id,
      assinarDto,
    );
  }

  @Post('responsavel/:responsavelId/assinar')
  @ApiOperation({ summary: 'Responsável assinar contrato' })
  async assinarResponsavel(
    @Request() req,
    @Param('responsavelId') responsavelId: string,
    @Body() assinarDto: AssinarContratoDto,
  ) {
    // Capturar IP do request
    assinarDto.ip_address = req.ip || req.connection?.remoteAddress;
    assinarDto.user_agent = req.get('User-Agent');

    return await this.contratosService.assinarContratoResponsavel(
      responsavelId,
      req.user.id,
      assinarDto,
    );
  }

  // ===== VERIFICAÇÃO DE STATUS =====

  @Get('aluno/:alunoId/status')
  @ApiOperation({ summary: 'Verificar status do contrato do aluno' })
  async verificarStatusAluno(@Param('alunoId') alunoId: string) {
    return await this.contratosService.verificarStatusAluno(alunoId);
  }

  @Get('responsavel/:responsavelId/status')
  @ApiOperation({ summary: 'Verificar status do contrato do responsável' })
  async verificarStatusResponsavel(
    @Param('responsavelId') responsavelId: string,
  ) {
    return await this.contratosService.verificarStatusResponsavel(
      responsavelId,
    );
  }

  @Get(':contratoId/historico')
  @ApiOperation({ summary: 'Buscar histórico de assinaturas de um contrato' })
  async getHistorico(@Param('contratoId') contratoId: string) {
    return await this.contratosService.getHistoricoAssinaturas(contratoId);
  }
}
