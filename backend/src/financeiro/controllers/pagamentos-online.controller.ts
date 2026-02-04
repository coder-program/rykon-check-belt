import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaytimeIntegrationService } from '../services/paytime-integration.service';
import {
  ProcessarPagamentoPixDto,
  ProcessarPagamentoCartaoDto,
  ProcessarPagamentoBoletoDto,
} from '../services/paytime-integration.service';

@Controller('financeiro/pagamentos-online')
@UseGuards(JwtAuthGuard)
export class PagamentosOnlineController {
  constructor(
    private readonly paytimeIntegrationService: PaytimeIntegrationService,
  ) {}

  @Post('pix')
  async pagarComPix(
    @Body() dto: ProcessarPagamentoPixDto,
    @Request() req: any,
  ) {
    return this.paytimeIntegrationService.processarPagamentoPix(
      dto,
      req.user.id,
    );
  }

  @Post('cartao')
  async pagarComCartao(
    @Body() dto: ProcessarPagamentoCartaoDto,
    @Request() req: any,
  ) {
    return this.paytimeIntegrationService.processarPagamentoCartao(
      dto,
      req.user.id,
    );
  }

  @Post('boleto')
  async pagarComBoleto(
    @Body() dto: ProcessarPagamentoBoletoDto,
    @Request() req: any,
  ) {
    return this.paytimeIntegrationService.processarPagamentoBoleto(
      dto,
      req.user.id,
    );
  }

  @Get('status/:transacaoId')
  async verificarStatus(
    @Param('transacaoId') transacaoId: string,
    @Request() req: any,
  ) {
    return this.paytimeIntegrationService.verificarStatusPix(
      transacaoId,
      req.user.id,
    );
  }
}
