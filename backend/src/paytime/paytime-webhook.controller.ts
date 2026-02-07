import {
  Controller,
  Post,
  Body,
  Logger,
} from '@nestjs/common';
import { PaytimeWebhookService } from './paytime-webhook.service';
import { WebhookEventDto } from './dto/webhook-event.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

/**
 * Controller público para receber webhooks da Paytime
 * NÃO requer autenticação JWT (webhooks vêm de servidores externos)
 */
@ApiTags('Paytime Webhooks')
@Controller('paytime/webhooks')
export class PaytimeWebhookController {
  private readonly logger = new Logger(PaytimeWebhookController.name);

  constructor(private readonly webhookService: PaytimeWebhookService) {}

  @Post()
  @ApiOperation({
    summary: '🔔 Receber webhook da Paytime',
    description: 'Endpoint público para receber notificações de eventos da Paytime (boletos, transações, etc). Este endpoint NÃO requer autenticação JWT.',
  })
  @ApiBody({
    description: 'Evento webhook da Paytime',
    schema: {
      type: 'object',
      properties: {
        event: {
          type: 'string',
          example: 'updated-billet-status',
          enum: [
            'new-billet',
            'updated-billet-status',
            'new-sub-transaction',
            'updated-sub-transaction',
          ],
        },
        event_date: {
          type: 'string',
          format: 'date-time',
          example: '2025-04-30T17:05:53.107Z',
        },
        data: {
          type: 'object',
          description: 'Dados do recurso (boleto ou transação)',
        },
      },
      required: ['event', 'event_date', 'data'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Webhook processado com sucesso' },
        transacao_id: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Evento inválido ou dados incompletos',
  })
  async receberWebhook(@Body() webhookEvent: WebhookEventDto) {
    this.logger.log(`🔔 Webhook recebido: ${webhookEvent.event}`);
    this.logger.log(`📅 Data do evento: ${webhookEvent.event_date}`);
    
    const { event, data } = webhookEvent;

    try {
      // Processar eventos de boleto
      if (event === 'new-billet' || event === 'updated-billet-status') {
        const resultado = await this.webhookService.processarWebhookBoleto(
          event,
          data,
        );
        this.logger.log(`✅ Webhook boleto processado: ${resultado.message}`);
        return resultado;
      }

      // Processar eventos de transação (PIX/Cartão)
      if (
        event === 'new-sub-transaction' ||
        event === 'updated-sub-transaction'
      ) {
        const resultado = await this.webhookService.processarWebhookTransacao(
          event,
          data,
        );
        this.logger.log(
          `✅ Webhook transação processado: ${resultado.message}`,
        );
        return resultado;
      }

      // Evento não tratado
      this.logger.warn(`⚠️ Evento não tratado: ${event}`);
      return {
        success: false,
        message: 'Evento não tratado',
        event,
      };
    } catch (error) {
      this.logger.error(`❌ Erro ao processar webhook: ${error.message}`);
      this.logger.error(error.stack);
      
      // Retornar erro mas com status 200 para evitar retry da Paytime
      return {
        success: false,
        message: error.message,
        error: error.stack,
      };
    }
  }
}
