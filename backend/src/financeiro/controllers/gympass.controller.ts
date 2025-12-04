import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GympassService, GympassTransacao } from '../services/gympass.service';

@Controller('gympass')
@UseGuards(JwtAuthGuard)
export class GympassController {
  constructor(private readonly gympassService: GympassService) {}

  @Post('webhook')
  async processarWebhook(
    @Body() dados: GympassTransacao,
    @Query('unidadeId') unidadeId: string,
  ) {
    return this.gympassService.processarTransacao(dados, unidadeId);
  }

  @Post('sincronizar')
  async sincronizar(
    @Query('unidadeId') unidadeId: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    const inicio = dataInicio ? new Date(dataInicio) : undefined;
    const fim = dataFim ? new Date(dataFim) : undefined;

    return this.gympassService.sincronizarTransacoes(unidadeId, inicio, fim);
  }

  @Get('estatisticas')
  async estatisticas(
    @Query('unidadeId') unidadeId: string,
    @Query('mes') mes?: string,
  ) {
    return this.gympassService.estatisticas(unidadeId, mes);
  }

  @Get('verificar-integracao')
  async verificarIntegracao(@Query('unidadeId') unidadeId: string) {
    return this.gympassService.verificarIntegracao(unidadeId);
  }
}
