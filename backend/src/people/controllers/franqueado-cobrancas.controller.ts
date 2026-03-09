import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FranqueadoCobrancasService } from '../services/franqueado-cobrancas.service';
import {
  CreateFranqueadoCobrancaDto,
  UpdateFranqueadoCobrancaDto,
  ListFranqueadoCobrancasDto,
  RegistrarPagamentoDto,
  CreateSetupParcelaDto,
  UpdateSetupParcelaDto,
  RegistrarPagamentoParcelaDto,
  GerarCobrancasDto,
} from '../dto/franqueado-cobrancas.dto';

@ApiTags('Franqueado Cobranças')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('franqueado-cobrancas')
export class FranqueadoCobrancasController {
  constructor(private readonly svc: FranqueadoCobrancasService) {}

  // ══════════════════════════════════════════════════════════════
  // COBRANÇAS
  // ══════════════════════════════════════════════════════════════

  @Post()
  @ApiOperation({ summary: 'Criar cobrança manual' })
  create(@Body() dto: CreateFranqueadoCobrancaDto) {
    return this.svc.createCobranca(dto);
  }

  @Post('gerar')
  @ApiOperation({ summary: 'Gerar cobranças automáticas por competência' })
  gerar(@Body() dto: GerarCobrancasDto) {
    return this.svc.gerarCobrancas(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cobranças (paginado)' })
  findAll(@Query() query: ListFranqueadoCobrancasDto) {
    return this.svc.findAllCobrancas(query);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'KPIs financeiros: MRR, setup pendente, atrasos' })
  kpis() {
    return this.svc.getKpis();
  }

  @Get('contrato/:contratoId')
  @ApiOperation({ summary: 'Cobranças de um contrato' })
  @ApiParam({ name: 'contratoId', type: 'string' })
  findByContrato(
    @Param('contratoId', ParseUUIDPipe) contratoId: string,
  ) {
    return this.svc.findCobrancasByContrato(contratoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cobrança por ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOneCobranca(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar cobrança' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFranqueadoCobrancaDto,
  ) {
    return this.svc.updateCobranca(id, dto);
  }

  @Patch(':id/pagamento')
  @ApiOperation({ summary: 'Registrar pagamento / mudar status' })
  registrarPagamento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarPagamentoDto,
  ) {
    return this.svc.registrarPagamento(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover cobrança' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.removeCobranca(id);
  }

  // ══════════════════════════════════════════════════════════════
  // SETUP PARCELAS
  // ══════════════════════════════════════════════════════════════

  @Post('setup-parcelas')
  @ApiOperation({ summary: 'Criar parcela de setup manualmente' })
  createParcela(@Body() dto: CreateSetupParcelaDto) {
    return this.svc.createParcela(dto);
  }

  @Post('setup-parcelas/gerar/:contratoId')
  @ApiOperation({ summary: 'Gerar parcelas automáticas com base no contrato' })
  @ApiParam({ name: 'contratoId', type: 'string' })
  gerarParcelas(
    @Param('contratoId', ParseUUIDPipe) contratoId: string,
  ) {
    return this.svc.gerarParcelas(contratoId);
  }

  @Get('setup-parcelas/contrato/:contratoId')
  @ApiOperation({ summary: 'Listar parcelas de setup de um contrato' })
  @ApiParam({ name: 'contratoId', type: 'string' })
  findParcelasByContrato(
    @Param('contratoId', ParseUUIDPipe) contratoId: string,
  ) {
    return this.svc.findParcelasByContrato(contratoId);
  }

  @Put('setup-parcelas/:id')
  @ApiOperation({ summary: 'Atualizar parcela' })
  updateParcela(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSetupParcelaDto,
  ) {
    return this.svc.updateParcela(id, dto);
  }

  @Patch('setup-parcelas/:id/pagamento')
  @ApiOperation({ summary: 'Registrar pagamento de parcela' })
  registrarPagamentoParcela(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarPagamentoParcelaDto,
  ) {
    return this.svc.registrarPagamentoParcela(id, dto);
  }

  @Delete('setup-parcelas/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover parcela' })
  removeParcela(@Param('id', ParseUUIDPipe) id: string) {
    return this.svc.removeParcela(id);
  }
}
