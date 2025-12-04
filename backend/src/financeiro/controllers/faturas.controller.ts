import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FaturasService } from '../services/faturas.service';
import { NotificacoesService } from '../services/notificacoes.service';
import {
  CreateFaturaDto,
  UpdateFaturaDto,
  BaixarFaturaDto,
} from '../dto/fatura.dto';

@Controller('faturas')
@UseGuards(JwtAuthGuard)
export class FaturasController {
  constructor(
    private readonly faturasService: FaturasService,
    private readonly notificacoesService: NotificacoesService,
  ) {}

  @Post()
  create(@Body() createFaturaDto: CreateFaturaDto, @Request() req) {
    return this.faturasService.create(createFaturaDto, req.user);
  }

  @Get()
  async findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('status') status?: any,
    @Query('mes') mes?: string,
  ) {
    const faturas = await this.faturasService.findAll(unidade_id, status, mes);

    // Mapear para incluir aluno_nome
    return faturas.map((fatura) => ({
      ...fatura,
      aluno_nome: fatura.aluno?.nome_completo,
    }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.faturasService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateFaturaDto: UpdateFaturaDto) {
    return this.faturasService.update(id, updateFaturaDto);
  }

  @Patch(':id/baixar')
  baixar(
    @Param('id') id: string,
    @Body() baixarDto: BaixarFaturaDto,
    @Request() req,
  ) {
    return this.faturasService.baixar(id, baixarDto, req.user);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string, @Body('motivo') motivo: string) {
    return this.faturasService.cancelar(id, motivo);
  }

  @Get('resumo/pendentes')
  async resumoPendentes(@Query('unidade_id') unidade_id?: string) {
    const total = await this.faturasService.somarPendentes(unidade_id);
    const quantidade = await this.faturasService.contarPendentes(unidade_id);
    return { total, quantidade };
  }

  @Get('aluno/:alunoId')
  findByAluno(@Param('alunoId') alunoId: string) {
    return this.faturasService.findByAluno(alunoId);
  }

  @Post(':id/enviar-cobranca-whatsapp')
  async enviarCobrancaWhatsapp(
    @Param('id') id: string,
    @Body('mensagem') mensagem?: string,
  ) {
    const fatura = await this.faturasService.findOne(id);
    await this.notificacoesService.enviarCobrancaWhatsapp(fatura, mensagem);
    return { message: 'Cobrança enviada via WhatsApp com sucesso' };
  }

  @Post(':id/parcelar')
  async parcelarFatura(
    @Param('id') id: string,
    @Body('numeroParcelas') numeroParcelas: number,
    @Request() req,
  ) {
    return this.faturasService.parcelarFatura(id, numeroParcelas, req.user);
  }

  @Post('gerar-faturas-assinaturas')
  async gerarFaturasAssinaturas(@Query('unidade_id') unidade_id?: string) {
    return this.faturasService.gerarFaturasAssinaturas(unidade_id);
  }
}
