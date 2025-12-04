import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MensagemWhatsApp {
  telefone: string;
  mensagem: string;
  anexo?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;

  constructor(private httpService: HttpService) {
    // Configurar com variáveis de ambiente
    this.apiUrl = process.env.WHATSAPP_API_URL || '';
    this.apiToken = process.env.WHATSAPP_API_TOKEN || '';
  }

  async enviarMensagem(
    telefone: string,
    mensagem: string,
    anexo?: string,
  ): Promise<void> {
    try {
      if (!this.apiUrl || !this.apiToken) {
        this.logger.warn('WhatsApp API não configurada. Mensagem não enviada.');
        return;
      }

      const telefoneLimpo = this.limparTelefone(telefone);

      if (!telefoneLimpo) {
        throw new Error('Telefone inválido');
      }

      const payload = {
        phone: telefoneLimpo,
        message: mensagem,
        ...(anexo && { attachment: anexo }),
      };

      const response = await firstValueFrom(
        this.httpService.post(this.apiUrl + '/send-message', payload, {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`✅ Mensagem WhatsApp enviada para ${telefoneLimpo}`);

      return response.data;
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem WhatsApp:`, error.message);
      throw error;
    }
  }

  async enviarCobranca(telefone: string, fatura: any): Promise<void> {
    const mensagem = `
🔔 *Cobrança Pendente*

Fatura: ${fatura.numero_fatura}
Vencimento: ${new Date(fatura.data_vencimento).toLocaleDateString('pt-BR')}
Valor: R$ ${fatura.valor_total.toFixed(2)}

${fatura.link_pagamento ? `Pague agora: ${fatura.link_pagamento}` : ''}
    `.trim();

    await this.enviarMensagem(telefone, mensagem);
  }

  async enviarComprovanteAnexo(
    telefone: string,
    comprovante: string,
  ): Promise<void> {
    const mensagem = '✅ Segue o comprovante de pagamento anexo.';
    await this.enviarMensagem(telefone, mensagem, comprovante);
  }

  async verificarStatus(): Promise<any> {
    try {
      if (!this.apiUrl || !this.apiToken) {
        return {
          status: 'not_configured',
          message: 'API do WhatsApp não configurada',
        };
      }

      const response = await firstValueFrom(
        this.httpService.get(this.apiUrl + '/status', {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }),
      );

      return {
        status: 'connected',
        data: response.data,
      };
    } catch (error) {
      this.logger.error('Erro ao verificar status do WhatsApp:', error.message);
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  private limparTelefone(telefone: string): string {
    // Remove caracteres não numéricos
    let limpo = telefone.replace(/\D/g, '');

    // Adiciona código do país se não tiver
    if (limpo.length === 11 || limpo.length === 10) {
      limpo = '55' + limpo;
    }

    return limpo;
  }
}
