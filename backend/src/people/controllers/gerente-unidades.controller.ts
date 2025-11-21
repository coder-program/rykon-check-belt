import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GerenteUnidadesService } from '../services/gerente-unidades.service';

@ApiTags('Gerente Unidades')
@Controller('gerente-unidades')
export class GerenteUnidadesController {
  constructor(
    private readonly gerenteUnidadesService: GerenteUnidadesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('usuario/:usuarioId')
  @ApiOperation({
    summary: 'Buscar dados do vínculo gerente-unidade por ID do usuário',
  })
  @ApiParam({ name: 'usuarioId', type: String })
  async buscarPorUsuario(@Param('usuarioId') usuarioId: string) {
    return this.gerenteUnidadesService.buscarPorUsuario(usuarioId);
  }
}
