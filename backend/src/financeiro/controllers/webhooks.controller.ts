import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  Logger,
} from '@nestjs/common';
import {
  PaytimeWebhookService,
  PaytimeWebhookPayload,
} from '../services/paytime-webhook.service';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly paytimeWebhookService: PaytimeWebhookService,
  ) {}

  @Post('paytime')
  @HttpCode(200)
  async handlePaytimeWebhook(
    @Headers('x-webhook-signature') signature: string,
    @Body() payload: PaytimeWebhookPayload,
  ) {
    this.logger.log(`Webhook recebido: ${payload.event}`);

    // Validar assinatura (segurança)
    const payloadString = JSON.stringify(payload);
    const isValid =
      this.paytimeWebhookService.validateWebhookSignature(
        signature,
        payloadString,
      );

    if (!isValid) {
      this.logger.error('Assinatura do webhook inválida');
      return { success: false, error: 'Invalid signature' };
    }

    try {
      await this.paytimeWebhookService.processarWebhook(payload);
      this.logger.log(`Webhook processado com sucesso: ${payload.event}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Erro ao processar webhook: ${error.message}`,
        error.stack,
      );
      // Retornar 200 mesmo com erro para não retentar
      return { success: false, error: error.message };
    }
  }
}
