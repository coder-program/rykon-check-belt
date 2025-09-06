import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { PresencasService } from './presencas.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('teamcruz')
export class PresencasController {
  constructor(private readonly service: PresencasService) {}

  @Get('aulas/abertas')
  aulasAbertas() {
    return this.service.aulasAbertas();
  }

  @Post('presencas/checkin')
  checkin(@Body() body: { alunoId: string }) {
    return this.service.checkin(body.alunoId);
  }

  @Get('presencas')
  listar(@Query('date') date?: string) {
    return this.service.listarPorData(date);
  }
}
