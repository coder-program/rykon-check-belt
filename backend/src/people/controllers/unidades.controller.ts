import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UnidadesService } from '../services/unidades.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CreateUnidadeDto,
  UpdateUnidadeDto,
  UnidadeQueryDto,
} from '../dto/unidades.dto';

@ApiTags('Unidades')
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  // Endpoint PÚBLICO para listagem de unidades ativas (cadastro público)
  @Get('public/ativas')
  @ApiOperation({
    summary: 'Listar unidades ativas (público - sem autenticação)',
  })
  async listarAtivas(@Request() req) {
    const result = await this.unidadesService.listarPublicasAtivas();
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado')
  @Post()
  @ApiOperation({ summary: 'Criar unidade/academia' })
  @ApiBody({ type: CreateUnidadeDto })
  async criar(@Body() dto: CreateUnidadeDto, @Request() req) {
    return this.unidadesService.criar(dto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas das unidades' })
  async obterEstatisticas(@Request() req) {
    const user = req.user;
    return this.unidadesService.obterEstatisticas(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Listar unidades (paginado/filtrado)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome, CNPJ ou responsável',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ATIVA', 'INATIVA', 'HOMOLOGACAO'],
  })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'pageSize', required: false, example: '20' })
  async listar(@Query() query: UnidadeQueryDto, @Request() req) {
    const user = req.user;
    return this.unidadesService.listar(query, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Obter unidade por ID' })
  @ApiParam({ name: 'id', type: String })
  async obter(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.unidadesService.obter(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado', 'gerente_unidade')
  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar unidade' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateUnidadeDto })
  async atualizar(
    @Param('id') id: string,
    @Body() dto: UpdateUnidadeDto,
    @Request() req,
  ) {
    return this.unidadesService.atualizar(id, dto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado')
  @Delete(':id')
  @ApiOperation({ summary: 'Remover unidade' })
  @ApiParam({ name: 'id', type: String })
  async remover(@Param('id') id: string, @Request() req) {
    return this.unidadesService.remover(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/transaction-limits')
  @ApiOperation({ 
    summary: 'Buscar limites de transação da unidade',
    description: `
      Retorna os limites configurados para transações financeiras da unidade.
      
      **Limites incluídos:**
      - daily_limit: Limite diário em reais
      - transaction_limit: Valor máximo por transação
      - monthly_transactions: Quantidade máxima de transações mensais
      - chargeback_limit: Limite de chargebacks permitidos
    `
  })
  @ApiParam({ name: 'id', type: String, description: 'ID da unidade' })
  async getTransactionLimits(@Param('id') id: string, @Request() req) {
    return this.unidadesService.getTransactionLimits(id, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('master', 'franqueado')
  @Patch(':id/transaction-limits')
  @ApiOperation({ 
    summary: 'Atualizar limites de transação da unidade',
    description: `
      Atualiza os limites configurados para transações financeiras.
      
      **Campos atualizáveis:**
      - daily_limit: Limite diário em reais (número decimal)
      - transaction_limit: Valor máximo por transação (número decimal)
      - monthly_transactions: Quantidade máxima de transações mensais (inteiro)
      - chargeback_limit: Limite de chargebacks permitidos (inteiro)
    `
  })
  @ApiParam({ name: 'id', type: String, description: 'ID da unidade' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        daily_limit: { type: 'number', example: 50000.00 },
        transaction_limit: { type: 'number', example: 5000.00 },
        monthly_transactions: { type: 'number', example: 300 },
        chargeback_limit: { type: 'number', example: 5 },
      },
    },
  })
  async updateTransactionLimits(
    @Param('id') id: string,
    @Body() limits: any,
    @Request() req,
  ) {
    return this.unidadesService.updateTransactionLimits(id, limits, req.user);
  }
}
