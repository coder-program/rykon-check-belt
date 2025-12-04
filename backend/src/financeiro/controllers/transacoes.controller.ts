import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TransacoesService } from '../services/transacoes.service';
import { CreateTransacaoDto, FiltroTransacoesDto } from '../dto/transacao.dto';

@Controller('transacoes')
@UseGuards(JwtAuthGuard)
export class TransacoesController {
  constructor(private readonly transacoesService: TransacoesService) {}

  @Post()
  create(@Body() createTransacaoDto: CreateTransacaoDto, @Request() req) {
    return this.transacoesService.create(createTransacaoDto, req.user);
  }

  @Get()
  async findAll(@Query() filtro: FiltroTransacoesDto) {
    const transacoes = await this.transacoesService.findAll(filtro);
    return transacoes.map((transacao) => ({
      ...transacao,
      aluno_nome: transacao.aluno?.nome_completo,
      unidade_nome: transacao.unidade?.nome,
    }));
  }

  @Get('extrato')
  getExtrato(@Query() filtro: FiltroTransacoesDto) {
    return this.transacoesService.getExtrato(filtro);
  }
}
