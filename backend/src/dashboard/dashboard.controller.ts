import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas gerais do dashboard' })
  @ApiResponse({ status: 200, description: 'Estatísticas obtidas com sucesso' })
  async getStats(@Request() req, @Query('unidadeId') unidadeId?: string) {
    return this.dashboardService.getStats(req.user.id, unidadeId);
  }
}
