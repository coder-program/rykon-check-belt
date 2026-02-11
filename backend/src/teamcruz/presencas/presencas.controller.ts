import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
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

  // ENDPOINTS DESABILITADOS - Usar módulo presenca principal
  // @Post('presencas/checkin')
  // @Get('presencas')

  @Delete('presencas/:id')
  async deletarPresenca(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any
  ) {
    return this.service.deletarPresenca(id, req.user);
  }
}
