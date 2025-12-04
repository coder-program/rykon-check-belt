import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DashboardFinanceiroService } from '../services/dashboard-financeiro.service';

@Controller('dashboard-financeiro')
@UseGuards(JwtAuthGuard)
export class DashboardFinanceiroController {
  constructor(private readonly dashboardService: DashboardFinanceiroService) {}

  @Get()
  getDashboard(
    @Request() req: any,
    @Query('unidade_id') unidade_id?: string,
    @Query('mes') mes?: string,
  ) {
    return this.dashboardService.getDashboard(req.user, unidade_id, mes);
  }

  @Get('evolucao-receita')
  getEvolucaoReceita(
    @Request() req: any,
    @Query('unidade_id') unidade_id?: string,
    @Query('meses') meses?: string,
  ) {
    const numMeses = meses ? parseInt(meses) : 6;
    return this.dashboardService.getEvolucaoReceita(
      req.user,
      unidade_id,
      numMeses,
    );
  }

  @Get('inadimplencia')
  getInadimplencia(
    @Request() req: any,
    @Query('unidade_id') unidade_id?: string,
  ) {
    return this.dashboardService.getInadimplencia(req.user, unidade_id);
  }

  @Get('comparacao-unidades')
  getComparacaoUnidades(@Request() req: any) {
    return this.dashboardService.getComparacaoUnidades(req.user);
  }
}
