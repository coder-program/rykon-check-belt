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
    console.log(
      '\ud83d\udcca [DASHBOARD-FINANCEIRO] Requisi\u00e7\u00e3o recebida:',
      {
        usuario_id: req.user?.id,
        usuario_nome: req.user?.nome,
        tipo_usuario: req.user?.tipo_usuario,
        unidade_id_usuario: req.user?.unidade_id,
        perfis: req.user?.perfis?.map((p: any) => p.nome || p),
        filtro_unidade_id: unidade_id,
        mes,
      },
    );
    return this.dashboardService.getDashboard(req.user, unidade_id, mes);
  }

  @Get('evolucao-receita')
  getEvolucaoReceita(
    @Request() req: any,
    @Query('unidade_id') unidade_id?: string,
    @Query('meses') meses?: string,
  ) {
    console.log(
      '\ud83d\udcca [DASHBOARD-FINANCEIRO] Evolu\u00e7\u00e3o Receita:',
      {
        usuario_id: req.user?.id,
        tipo_usuario: req.user?.tipo_usuario,
        unidade_id_usuario: req.user?.unidade_id,
        filtro_unidade_id: unidade_id,
        meses,
      },
    );
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
    console.log('\ud83d\udcca [DASHBOARD-FINANCEIRO] Inadimpl\u00eancia:', {
      usuario_id: req.user?.id,
      tipo_usuario: req.user?.tipo_usuario,
      unidade_id_usuario: req.user?.unidade_id,
      filtro_unidade_id: unidade_id,
    });
    return this.dashboardService.getInadimplencia(req.user, unidade_id);
  }

  @Get('comparacao-unidades')
  getComparacaoUnidades(@Request() req: any) {
    console.log(
      '\ud83d\udcca [DASHBOARD-FINANCEIRO] Compara\u00e7\u00e3o Unidades:',
      {
        usuario_id: req.user?.id,
        tipo_usuario: req.user?.tipo_usuario,
        unidade_id_usuario: req.user?.unidade_id,
      },
    );
    return this.dashboardService.getComparacaoUnidades(req.user);
  }
}
