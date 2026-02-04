import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fatura, StatusFatura } from '../entities/fatura.entity';
import {
  Transacao,
  TipoTransacao,
  OrigemTransacao,
  CategoriaTransacao,
  StatusTransacao,
} from '../entities/transacao.entity';

export interface PaytimeWebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    amount: number;
    [key: string]: any;
  };
}

@Injectable()
export class PaytimeWebhookService {
  private readonly logger = new Logger(PaytimeWebhookService.name);

  constructor(
    @InjectRepository(Transacao)
    private transacaoRepository: Repository<Transacao>,
    @InjectRepository(Fatura)
    private faturaRepository: Repository<Fatura>,
  ) {}

  /**
   * Processar webhook da Paytime
   */
  async processarWebhook(payload: PaytimeWebhookPayload): Promise<void> {
    this.logger.log(
      `Processando webhook: ${payload.event} - Transaction ID: ${payload.data.id}`,
    );

    switch (payload.event) {
      case 'transaction.paid':
        await this.handleTransactionPaid(payload.data);
        break;

      case 'transaction.failed':
        await this.handleTransactionFailed(payload.data);
        break;

      case 'transaction.refunded':
        await this.handleTransactionRefunded(payload.data);
        break;

      case 'transaction.chargeback':
        await this.handleTransactionChargeback(payload.data);
        break;

      default:
        this.logger.warn(`Evento desconhecido: ${payload.event}`);
    }
  }

  /**
   * Handler: Transação paga
   */
  private async handleTransactionPaid(data: any): Promise<void> {
    const transacao = await this.buscarTransacaoPorPaytimeId(data.id);

    if (!transacao) {
      this.logger.warn(
        `Transação não encontrada no sistema: ${data.id}`,
      );
      return;
    }

    // Se já está confirmada, não processar novamente
    if (transacao.status === StatusTransacao.CONFIRMADA) {
      this.logger.log(
        `Transação ${transacao.id} já estava confirmada. Ignorando webhook.`,
      );
      return;
    }

    // Atualizar transação para CONFIRMADA
    transacao.status = StatusTransacao.CONFIRMADA;
    transacao.paytime_metadata = {
      ...transacao.paytime_metadata,
      webhook_received_at: new Date(),
      paytime_status: data.status,
    };
    await this.transacaoRepository.save(transacao);

    this.logger.log(
      `Transação ${transacao.id} marcada como CONFIRMADA`,
    );

    // Baixar fatura
    if (transacao.fatura_id) {
      await this.baixarFatura(transacao);
    }
  }

  /**
   * Handler: Transação falhou
   */
  private async handleTransactionFailed(data: any): Promise<void> {
    const transacao = await this.buscarTransacaoPorPaytimeId(data.id);

    if (!transacao) {
      this.logger.warn(
        `Transação não encontrada no sistema: ${data.id}`,
      );
      return;
    }

    // Atualizar transação para CANCELADA
    transacao.status = StatusTransacao.CANCELADA;
    transacao.observacoes = `Pagamento falhou: ${data.status_reason || 'Sem motivo informado'}`;
    transacao.paytime_metadata = {
      ...transacao.paytime_metadata,
      webhook_received_at: new Date(),
      paytime_status: data.status,
      failure_reason: data.status_reason,
    };
    await this.transacaoRepository.save(transacao);

    this.logger.log(
      `Transação ${transacao.id} marcada como CANCELADA - Motivo: ${data.status_reason}`,
    );
  }

  /**
   * Handler: Transação estornada
   */
  private async handleTransactionRefunded(data: any): Promise<void> {
    const transacaoOriginal = await this.buscarTransacaoPorPaytimeId(data.id);

    if (!transacaoOriginal) {
      this.logger.warn(
        `Transação não encontrada no sistema: ${data.id}`,
      );
      return;
    }

    // Marcar transação original como ESTORNADA
    transacaoOriginal.status = StatusTransacao.ESTORNADA;
    transacaoOriginal.paytime_metadata = {
      ...transacaoOriginal.paytime_metadata,
      webhook_received_at: new Date(),
      paytime_status: data.status,
      refunded_at: data.refunded_at,
    };
    await this.transacaoRepository.save(transacaoOriginal);

    this.logger.log(
      `Transação ${transacaoOriginal.id} marcada como ESTORNADA`,
    );

    // Criar transação de estorno (saída)
    const transacaoEstorno = this.transacaoRepository.create({
      tipo: TipoTransacao.SAIDA,
      origem: OrigemTransacao.ESTORNO,
      categoria: CategoriaTransacao.SISTEMA,
      descricao: `Estorno - ${transacaoOriginal.descricao}`,
      aluno_id: transacaoOriginal.aluno_id,
      unidade_id: transacaoOriginal.unidade_id,
      fatura_id: transacaoOriginal.fatura_id,
      valor: transacaoOriginal.valor,
      data: new Date(),
      status: StatusTransacao.CONFIRMADA,
      metodo_pagamento: transacaoOriginal.metodo_pagamento,
      paytime_transaction_id: `refund_${data.id}`,
      paytime_payment_type: transacaoOriginal.paytime_payment_type,
      paytime_metadata: {
        refund_of: transacaoOriginal.id,
        original_paytime_id: data.id,
      },
    });
    await this.transacaoRepository.save(transacaoEstorno);

    this.logger.log(
      `Transação de estorno criada: ${transacaoEstorno.id}`,
    );

    // Reverter baixa da fatura
    if (transacaoOriginal.fatura_id) {
      await this.reverterBaixaFatura(transacaoOriginal);
    }
  }

  /**
   * Handler: Chargeback
   */
  private async handleTransactionChargeback(data: any): Promise<void> {
    const transacao = await this.buscarTransacaoPorPaytimeId(data.id);

    if (!transacao) {
      this.logger.warn(
        `Transação não encontrada no sistema: ${data.id}`,
      );
      return;
    }

    // Adicionar flag de chargeback no metadata
    transacao.paytime_metadata = {
      ...transacao.paytime_metadata,
      chargeback: true,
      chargeback_at: new Date(),
      chargeback_reason: data.chargeback_reason,
    };
    transacao.observacoes = `CHARGEBACK: ${data.chargeback_reason || 'Sem motivo informado'}`;
    await this.transacaoRepository.save(transacao);

    this.logger.warn(
      `CHARGEBACK detectado na transação ${transacao.id} - Motivo: ${data.chargeback_reason}`,
    );

    // TODO: Enviar notificação para admin
  }

  /**
   * Buscar transação por Paytime Transaction ID
   */
  private async buscarTransacaoPorPaytimeId(
    paytimeTransactionId: string,
  ): Promise<Transacao | null> {
    return await this.transacaoRepository.findOne({
      where: { paytime_transaction_id: paytimeTransactionId },
      relations: ['fatura', 'aluno'],
    });
  }

  /**
   * Baixar fatura após confirmação de pagamento
   */
  private async baixarFatura(transacao: Transacao): Promise<void> {
    const fatura = await this.faturaRepository.findOne({
      where: { id: transacao.fatura_id },
    });

    if (!fatura) {
      this.logger.error(
        `Fatura ${transacao.fatura_id} não encontrada`,
      );
      return;
    }

    // Atualizar valor pago
    fatura.valor_pago = (fatura.valor_pago || 0) + transacao.valor;
    fatura.data_pagamento = new Date();

    // Verificar se está totalmente paga
    if (fatura.valor_pago >= fatura.valor_total) {
      fatura.status = StatusFatura.PAGA;
    } else {
      fatura.status = StatusFatura.PARCIALMENTE_PAGA;
    }

    await this.faturaRepository.save(fatura);

    this.logger.log(
      `Fatura ${fatura.numero_fatura} atualizada - Status: ${fatura.status}, Valor pago: R$ ${fatura.valor_pago}`,
    );

    // TODO: Enviar notificação para aluno
  }

  /**
   * Reverter baixa da fatura após estorno
   */
  private async reverterBaixaFatura(transacao: Transacao): Promise<void> {
    const fatura = await this.faturaRepository.findOne({
      where: { id: transacao.fatura_id },
    });

    if (!fatura) {
      this.logger.error(
        `Fatura ${transacao.fatura_id} não encontrada`,
      );
      return;
    }

    // Subtrair valor estornado
    fatura.valor_pago = Math.max(0, (fatura.valor_pago || 0) - transacao.valor);

    // Atualizar status
    if (fatura.valor_pago <= 0) {
      fatura.status = StatusFatura.PENDENTE;
      fatura.data_pagamento = null;
    } else if (fatura.valor_pago < fatura.valor_total) {
      fatura.status = StatusFatura.PARCIALMENTE_PAGA;
    }

    await this.faturaRepository.save(fatura);

    this.logger.log(
      `Fatura ${fatura.numero_fatura} revertida - Status: ${fatura.status}, Valor pago: R$ ${fatura.valor_pago}`,
    );

    // TODO: Enviar notificação para aluno
  }

  /**
   * Validar assinatura do webhook (segurança)
   */
  validateWebhookSignature(signature: string, payload: string): boolean {
    // TODO: Implementar validação de assinatura quando disponível na API Paytime
    // const crypto = require('crypto');
    // const secret = process.env.PAYTIME_WEBHOOK_SECRET;
    // const expectedSignature = crypto
    //   .createHmac('sha256', secret)
    //   .update(payload)
    //   .digest('hex');
    // return crypto.timingSafeEqual(
    //   Buffer.from(signature),
    //   Buffer.from(expectedSignature)
    // );

    // Por enquanto, retornar true (aceitar todos os webhooks)
    this.logger.warn(
      'Validação de assinatura do webhook não implementada',
    );
    return true;
  }
}
