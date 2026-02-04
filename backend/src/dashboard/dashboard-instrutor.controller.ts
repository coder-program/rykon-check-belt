import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardInstrutorService } from './dashboard-instrutor.service';

@ApiTags('Dashboard Instrutor')
@Controller('dashboard/instrutor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardInstrutorController {
  constructor(
    private readonly dashboardInstrutorService: DashboardInstrutorService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas do dashboard do instrutor' })
  @ApiResponse({ status: 200, description: 'Estatísticas obtidas com sucesso' })
  async getInstrutorStats(@Request() req: any) {
    const usuarioId = req.user.id;
    return this.dashboardInstrutorService.getInstrutorStats(usuarioId);
  }

  @Get('proximas-aulas')
  @ApiOperation({ summary: 'Obter próximas aulas do instrutor' })
  @ApiResponse({
    status: 200,
    description: 'Próximas aulas obtidas com sucesso',
  })
  async getProximasAulas(@Request() req: any) {
    const usuarioId = req.user.id;
    return this.dashboardInstrutorService.getProximasAulas(usuarioId);
  }

  @Get('alunos-destaque')
  @ApiOperation({ summary: 'Obter alunos em destaque do instrutor' })
  @ApiResponse({
    status: 200,
    description: 'Alunos em destaque obtidos com sucesso',
  })
  async getAlunosDestaque(@Request() req: any) {
    const usuarioId = req.user.id;
    return this.dashboardInstrutorService.getAlunosDestaque(usuarioId);
  }

  @Get('meus-professores')
  @ApiOperation({ summary: 'Listar professores da unidade' })
  @ApiResponse({ status: 200, description: 'Professores obtidos com sucesso' })
  async getMeusProfessores(@Request() req: any) {
    const user = req.user;
    const unidadeId = user.unidade_id;
    return this.dashboardInstrutorService.getMeusProfessores(unidadeId);
  }
}
