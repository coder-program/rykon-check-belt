import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Obter estatísticas gerais do dashboard' })
  @ApiResponse({ status: 200, description: 'Estatísticas obtidas com sucesso' })
  async getStats() {
    return this.dashboardService.getStats();
  }
}
