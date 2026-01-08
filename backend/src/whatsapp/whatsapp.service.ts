import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private twilioAccountSid: string;
  private twilioAuthToken: string;
  private twilioWhatsAppNumber: string;

  constructor(private configService: ConfigService) {
    this.twilioAccountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.twilioWhatsAppNumber = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886');
  }

  /**
   * Envia mensagem de WhatsApp usando Twilio
   */
  async sendApprovalMessage(
    phoneNumber: string,
    nome: string,
  ): Promise<boolean> {
    try {
      // Validar se as credenciais do Twilio estão configuradas
      if (!this.twilioAccountSid || !this.twilioAuthToken || 
          this.twilioAccountSid.includes('seu_') || 
          this.twilioAuthToken.includes('seu_')) {
        this.logger.warn('Credenciais do Twilio não configuradas ou inválidas. Mensagem WhatsApp não enviada.');
        return false;
      }

      // Formatar número de telefone no padrão internacional
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      if (!formattedPhone) {
        this.logger.error(`Número de telefone inválido: ${phoneNumber}`);
        return false;
      }

      const message = `🎉 *Team Cruz - Cadastro Aprovado!*

Olá *${nome}*!

Seu cadastro foi *aprovado com sucesso*! ✅

Você já pode acessar o sistema usando suas credenciais.

🔗 Acesse: ${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/login

Bem-vindo à família Team Cruz! 🥋`;

      // Usar Twilio API para enviar mensagem
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
      
      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: this.twilioWhatsAppNumber,
          To: `whatsapp:${formattedPhone}`,
          Body: message,
        }).toString(),
      });

      if (response.ok) {
        this.logger.log(`WhatsApp enviado para ${formattedPhone}`);
        return true;
      } else {
        const error = await response.text();
        this.logger.error(`Erro ao enviar WhatsApp: ${error}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem WhatsApp: ${error.message}`);
      return false;
    }
  }

  /**
   * Formata número de telefone para padrão internacional
   * Exemplo: (11) 98765-4321 -> +5511987654321
   */
  private formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;

    // Remove todos os caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');

    // Se já começa com código do país, retorna formatado
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      return `+${cleaned}`;
    }

    // Se tem 11 dígitos (DDD + 9 + número), adiciona +55
    if (cleaned.length === 11) {
      return `+55${cleaned}`;
    }

    // Se tem 10 dígitos (DDD + número sem 9), adiciona +55 e o 9
    if (cleaned.length === 10) {
      const ddd = cleaned.substring(0, 2);
      const number = cleaned.substring(2);
      return `+55${ddd}9${number}`;
    }

    this.logger.error(`Formato de telefone inválido: ${phone} (${cleaned})`);
    return null;
  }
}
