import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AutomacoesService } from '../services/automacoes.service';

@Controller('automacoes')
@UseGuards(JwtAuthGuard)
export class AutomacoesController {
  constructor(private readonly automacoesService: AutomacoesService) {}

  @Post('executar-todas')
  async executarTodas() {
    return this.automacoesService.executarTodasAutomacoes();
  }

  @Post('calcular-juros-multa')
  async calcularJurosMulta() {
    await this.automacoesService.calcularJurosMulta();
    return { message: 'Juros e multa calculados com sucesso' };
  }

  @Post('verificar-inadimplencia')
  async verificarInadimplencia() {
    await this.automacoesService.verificarInadimplencia();
    return { message: 'Verificação de inadimplência concluída' };
  }

  @Post('gerar-faturas-recorrentes')
  async gerarFaturasRecorrentes() {
    await this.automacoesService.gerarFaturasRecorrentes();
    return { message: 'Faturas recorrentes geradas' };
  }

  @Post('enviar-lembretes')
  async enviarLembretes() {
    await this.automacoesService.enviarLembretesVencimento();
    return { message: 'Lembretes enviados' };
  }
}
