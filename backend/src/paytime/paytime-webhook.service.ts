import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transacao, StatusTransacao } from '../financeiro/entities/transacao.entity';
import { Fatura, StatusFatura } from '../financeiro/entities/fatura.entity';

@Injectable()
export class PaytimeWebhookService {
  private readonly logger = new Logger(PaytimeWebhookService.name);

  constructor(
    @InjectRepository(Transacao)
    private readonly transacaoRepository: Repository<Transacao>,
    @InjectRepository(Fatura)
    private readonly faturaRepository: Repository<Fatura>,
  ) {}

  /**
   * Processar webhook de boleto
   */
  async processarWebhookBoleto(event: string, data: any) {
    this.logger.log(`📨 Webhook recebido: ${event}`);
    this.logger.log(`📋 Dados: ${JSON.stringify(data, null, 2)}`);

    // Buscar transação pelo paytime_transaction_id
    const transacao = await this.transacaoRepository.findOne({
      where: { paytime_transaction_id: data._id },
      relations: ['fatura'],
    });

    if (!transacao) {
      this.logger.warn(
        `⚠️ Transação não encontrada para boleto ${data._id}`,
      );
      return {
        success: false,
        message: 'Transação não encontrada',
      };
    }

    this.logger.log(
      `🔍 Transação encontrada: ${transacao.id} - Status atual: ${transacao.status}`,
    );

    // Processar com base no evento
    switch (event) {
      case 'new-billet':
        return this.processarNewBillet(transacao, data);

      case 'updated-billet-status':
        return this.processarUpdatedBilletStatus(transacao, data);

      default:
        this.logger.warn(`⚠️ Evento não tratado: ${event}`);
        return {
          success: false,
          message: 'Evento não tratado',
        };
    }
  }

  /**
   * Processar webhook de transação (PIX/Cartão)
   */
  async processarWebhookTransacao(event: string, data: any) {
    this.logger.log(`📨 Webhook recebido: ${event}`);
    this.logger.log(`📋 Dados: ${JSON.stringify(data, null, 2)}`);

    // Buscar transação pelo paytime_transaction_id
    const transacao = await this.transacaoRepository.findOne({
      where: { paytime_transaction_id: data._id },
      relations: ['fatura'],
    });

    if (!transacao) {
      this.logger.warn(
        `⚠️ Transação não encontrada para transação ${data._id}`,
      );
      return {
        success: false,
        message: 'Transação não encontrada',
      };
    }

    this.logger.log(
      `🔍 Transação encontrada: ${transacao.id} - Status atual: ${transacao.status}`,
    );

    // Processar com base no evento
    switch (event) {
      case 'new-sub-transaction':
        return this.processarNewSubTransaction(transacao, data);

      case 'updated-sub-transaction':
        return this.processarUpdatedSubTransaction(transacao, data);

      default:
        this.logger.warn(`⚠️ Evento não tratado: ${event}`);
        return {
          success: false,
          message: 'Evento não tratado',
        };
    }
  }

  /**
   * new-billet: Boleto criado
   */
  private async processarNewBillet(transacao: Transacao, data: any) {
    this.logger.log(`🆕 Processando new-billet para transação ${transacao.id}`);

    // Atualizar metadata com dados iniciais
    transacao.paytime_metadata = {
      ...transacao.paytime_metadata,
      status: data.status,
      gateway_key: data.gateway_key,
      establishment_id: data.establishment_id,
      barcode: data.barcode || null,
      digitable_line: data.digitable_line || null,
      pdf_url: data.url || null,
      due_date: data.expiration_at || null,
    };

    await this.transacaoRepository.save(transacao);

    this.logger.log(`✅ Boleto criado - Status: ${data.status}`);

    return {
      success: true,
      message: 'Boleto criado com sucesso',
      transacao_id: transacao.id,
    };
  }

  /**
   * updated-billet-status: Status do boleto mudou
   */
  private async processarUpdatedBilletStatus(transacao: Transacao, data: any) {
    this.logger.log(
      `🔄 Processando updated-billet-status para transação ${transacao.id}`,
    );
    this.logger.log(`📊 Status: ${data.status}`);

    // Atualizar metadata
    transacao.paytime_metadata = {
      ...transacao.paytime_metadata,
      status: data.status,
      barcode: data.barcode || transacao.paytime_metadata?.barcode || null,
      digitable_line:
        data.digitable_line ||
        transacao.paytime_metadata?.digitable_line ||
        null,
      pdf_url: data.url || transacao.paytime_metadata?.pdf_url || null,
      due_date:
        data.expiration_at || transacao.paytime_metadata?.due_date || null,
    };

    // Se mudou para PENDING, apenas atualizar metadata (boleto pronto)
    if (data.status === 'PENDING') {
      await this.transacaoRepository.save(transacao);
      this.logger.log(
        `✅ Boleto PENDING - Código de barras disponível: ${data.barcode ? 'SIM' : 'NÃO'}`,
      );
      return {
        success: true,
        message: 'Boleto pronto para pagamento',
        transacao_id: transacao.id,
      };
    }

    // Se mudou para PAID, atualizar transação e baixar fatura
    if (data.status === 'PAID' && transacao.status !== StatusTransacao.CONFIRMADA) {
      transacao.status = StatusTransacao.CONFIRMADA;
      await this.transacaoRepository.save(transacao);

      // Baixar fatura
      if (transacao.fatura) {
        await this.baixarFatura(transacao);
      }

      this.logger.log(`💰 Boleto PAGO - Fatura baixada automaticamente`);

      return {
        success: true,
        message: 'Boleto pago e fatura baixada',
        transacao_id: transacao.id,
        fatura_id: transacao.fatura_id,
      };
    }

    // Outros status (CANCELED, EXPIRED, FAILED)
    if (['CANCELED', 'EXPIRED', 'FAILED'].includes(data.status)) {
      transacao.status = StatusTransacao.CANCELADA;
      transacao.observacoes = `Boleto ${data.status} via webhook`;
      await this.transacaoRepository.save(transacao);

      this.logger.log(`❌ Boleto ${data.status} - Transação cancelada`);

      return {
        success: true,
        message: `Boleto ${data.status}`,
        transacao_id: transacao.id,
      };
    }

    // Status desconhecido, apenas salvar
    await this.transacaoRepository.save(transacao);

    return {
      success: true,
      message: 'Status atualizado',
      transacao_id: transacao.id,
    };
  }

  /**
   * new-sub-transaction: Nova transação (PIX/Cartão)
   */
  private async processarNewSubTransaction(transacao: Transacao, data: any) {
    this.logger.log(
      `🆕 Processando new-sub-transaction para transação ${transacao.id}`,
    );

    // Atualizar metadata
    transacao.paytime_metadata = {
      ...transacao.paytime_metadata,
      status: data.status,
      type: data.type,
      gateway_key: data.gateway_key,
    };

    // Se for PIX, adicionar EMV
    if (data.type === 'PIX' && data.emv) {
      transacao.paytime_metadata.emv = data.emv;
    }

    // Se for CARTÃO, adicionar dados do cartão
    if (data.type === 'CREDIT' && data.card) {
      transacao.paytime_metadata.card = {
        brand: data.card.brand_name,
        last4_digits: data.card.last4_digits,
      };
    }

    await this.transacaoRepository.save(transacao);

    this.logger.log(`✅ Transação criada - Status: ${data.status}`);

    return {
      success: true,
      message: 'Transação criada',
      transacao_id: transacao.id,
    };
  }

  /**
   * updated-sub-transaction: Transação atualizada (PIX/Cartão)
   */
  private async processarUpdatedSubTransaction(transacao: Transacao, data: any) {
    this.logger.log(
      `🔄 Processando updated-sub-transaction para transação ${transacao.id}`,
    );
    this.logger.log(`📊 Status: ${data.status}`);

    // Atualizar metadata
    transacao.paytime_metadata = {
      ...transacao.paytime_metadata,
      status: data.status,
    };

    // Status PAID ou APPROVED: Marcar como CONFIRMADA e baixar fatura
    if (
      (data.status === 'PAID' || data.status === 'APPROVED') &&
      transacao.status !== StatusTransacao.CONFIRMADA
    ) {
      transacao.status = StatusTransacao.CONFIRMADA;
      await this.transacaoRepository.save(transacao);

      // Baixar fatura
      if (transacao.fatura) {
        await this.baixarFatura(transacao);
      }

      this.logger.log(`💰 Transação ${data.status} - Fatura baixada automaticamente`);

      return {
        success: true,
        message: `Transação ${data.status} e fatura baixada`,
        transacao_id: transacao.id,
        fatura_id: transacao.fatura_id,
      };
    }

    // Status FAILED, CANCELED, REFUNDED, CHARGEBACK: Marcar como CANCELADA
    if (['FAILED', 'CANCELED', 'REFUNDED', 'CHARGEBACK'].includes(data.status)) {
      transacao.status = StatusTransacao.CANCELADA;
      transacao.observacoes = `Transação ${data.status} via webhook`;
      await this.transacaoRepository.save(transacao);

      this.logger.log(`❌ Transação ${data.status}`);

      return {
        success: true,
        message: `Transação ${data.status}`,
        transacao_id: transacao.id,
      };
    }

    // Status DISPUTED: Marcar como PENDENTE com observação
    if (data.status === 'DISPUTED') {
      transacao.status = StatusTransacao.PENDENTE;
      transacao.observacoes = `Transação em DISPUTA via webhook`;
      await this.transacaoRepository.save(transacao);

      this.logger.warn(`⚠️ Transação em DISPUTA`);

      return {
        success: true,
        message: 'Transação em disputa',
        transacao_id: transacao.id,
      };
    }

    // Outros status (CREATED, PENDING): Apenas salvar metadata
    await this.transacaoRepository.save(transacao);

    this.logger.log(`ℹ️ Status atualizado: ${data.status}`);

    return {
      success: true,
      message: `Status atualizado: ${data.status}`,
      transacao_id: transacao.id,
    };
  }

  /**
   * Baixar fatura (marcar como PAGA)
   */
  private async baixarFatura(transacao: Transacao) {
    const fatura = await this.faturaRepository.findOne({
      where: { id: transacao.fatura_id },
    });

    if (!fatura) {
      this.logger.warn(`⚠️ Fatura ${transacao.fatura_id} não encontrada`);
      return;
    }

    if (fatura.status === StatusFatura.PAGA) {
      this.logger.log(`ℹ️ Fatura ${fatura.id} já está paga`);
      return;
    }

    fatura.status = StatusFatura.PAGA;
    fatura.data_pagamento = new Date();
    fatura.valor_pago = transacao.valor;

    await this.faturaRepository.save(fatura);

    this.logger.log(`✅ Fatura ${fatura.id} baixada com sucesso`);
  }
}
