import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ConfiguracoesCobrancaService } from '../services/configuracoes-cobranca.service';
import { ConfiguracaoCobranca } from '../entities/configuracao-cobranca.entity';

@Controller('configuracoes-cobranca')
@UseGuards(JwtAuthGuard)
export class ConfiguracoesCobrancaController {
  constructor(private readonly configService: ConfiguracoesCobrancaService) {}

  @Get('unidade/:unidade_id')
  findByUnidade(@Param('unidade_id') unidade_id: string) {
    return this.configService.findByUnidade(unidade_id);
  }

  @Put('unidade/:unidade_id')
  update(
    @Param('unidade_id') unidade_id: string,
    @Body() updateDto: Partial<ConfiguracaoCobranca>,
  ) {
    return this.configService.update(unidade_id, updateDto);
  }
}
