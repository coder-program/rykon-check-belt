import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { VendasService } from '../services/vendas.service';
import {
  CreateVendaDto,
  UpdateVendaDto,
  FiltroVendasDto,
  ReenviarLinkDto,
} from '../dto/venda.dto';

@Controller('vendas')
@UseGuards(JwtAuthGuard)
export class VendasController {
  constructor(private readonly vendasService: VendasService) {}

  @Post()
  create(@Body() createVendaDto: CreateVendaDto, @Request() req) {
    return this.vendasService.create(createVendaDto, req.user);
  }

  @Get()
  async findAll(@Query() filtro: FiltroVendasDto) {
    const vendas = await this.vendasService.findAll(filtro);
    return vendas.map((venda) => ({
      ...venda,
      aluno_nome: venda.aluno?.nome_completo,
      aluno_email: venda.aluno?.email,
      aluno_telefone: venda.aluno?.telefone,
    }));
  }

  @Get('estatisticas')
  estatisticas(@Query('unidadeId') unidadeId?: string) {
    return this.vendasService.estatisticas(unidadeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const venda = await this.vendasService.findOne(id);
    return {
      ...venda,
      aluno_nome: venda.aluno?.nome_completo,
      aluno_email: venda.aluno?.email,
      aluno_telefone: venda.aluno?.telefone,
    };
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVendaDto: UpdateVendaDto) {
    return this.vendasService.update(id, updateVendaDto);
  }

  @Patch(':id/baixar')
  baixar(
    @Param('id') id: string,
    @Body() dados: { metodo_pagamento?: string; observacoes?: string },
    @Request() req,
  ) {
    return this.vendasService.baixar(id, dados, req.user);
  }

  @Post(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.vendasService.cancelar(id);
  }

  @Post('reenviar-link')
  reenviarLink(@Body() dto: ReenviarLinkDto) {
    return this.vendasService.reenviarLink(
      dto.vendaId,
      dto.email,
      dto.telefone,
    );
  }

  @Post('webhook')
  processarWebhook(@Body() dados: any) {
    return this.vendasService.processarWebhook(dados);
  }
}
