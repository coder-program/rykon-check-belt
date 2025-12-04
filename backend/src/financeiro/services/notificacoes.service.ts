import { Injectable, Logger } from '@nestjs/common';
import { Fatura } from '../entities/fatura.entity';
import { Assinatura } from '../entities/assinatura.entity';
import { WhatsappService } from './whatsapp.service';

export interface NotificacaoEmail {
  destinatario: string;
  assunto: string;
  corpo: string;
}

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(private whatsappService: WhatsappService) {}

  async enviarLembreteVencimento(fatura: Fatura): Promise<void> {
    try {
      const aluno = fatura.aluno;

      if (!aluno?.email && !aluno?.telefone) {
        this.logger.warn(
          `Aluno ${aluno?.id} sem email ou telefone para envio de lembrete`,
        );
        return;
      }

      const diasRestantes = Math.ceil(
        (new Date(fatura.data_vencimento).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const mensagem = this.gerarMensagemLembrete(fatura, diasRestantes);

      // Enviar por WhatsApp se tiver telefone
      if (aluno?.telefone) {
        await this.whatsappService.enviarMensagem(aluno.telefone, mensagem);
      }

      // Enviar por Email (implementar integração SMTP)
      if (aluno?.email) {
        await this.enviarEmail({
          destinatario: aluno.email,
          assunto: `Lembrete: Fatura ${fatura.numero_fatura} vence em ${diasRestantes} dias`,
          corpo: mensagem,
        });
      }

      this.logger.log(
        `📧 Lembrete enviado para fatura ${fatura.numero_fatura}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar lembrete para fatura ${fatura.id}:`,
        error,
      );
    }
  }

  async enviarNotificacaoInadimplencia(assinatura: Assinatura): Promise<void> {
    try {
      const aluno = assinatura.aluno;

      if (!aluno) {
        return;
      }

      const mensagem = this.gerarMensagemInadimplencia(assinatura);

      if (aluno.telefone) {
        await this.whatsappService.enviarMensagem(aluno.telefone, mensagem);
      }

      if (aluno.email) {
        await this.enviarEmail({
          destinatario: aluno.email,
          assunto: 'Atenção: Assinatura em inadimplência',
          corpo: mensagem,
        });
      }

      this.logger.log(
        `🚫 Notificação de inadimplência enviada para assinatura ${assinatura.id}`,
      );
    } catch (error) {
      this.logger.error(`Erro ao enviar notificação de inadimplência:`, error);
    }
  }

  async enviarCobrancaWhatsapp(
    fatura: Fatura,
    mensagemPersonalizada?: string,
  ): Promise<void> {
    const aluno = fatura.aluno;

    if (!aluno?.telefone) {
      throw new Error('Aluno não possui telefone cadastrado');
    }

    const mensagem =
      mensagemPersonalizada || this.gerarMensagemCobranca(fatura);

    await this.whatsappService.enviarMensagem(aluno.telefone, mensagem);

    this.logger.log(
      `📱 Cobrança WhatsApp enviada para fatura ${fatura.numero_fatura}`,
    );
  }

  private gerarMensagemLembrete(fatura: Fatura, diasRestantes: number): string {
    return `
🔔 *Lembrete de Pagamento*

Olá ${fatura.aluno?.nome_completo || 'Aluno'}!

Sua fatura *${fatura.numero_fatura}* vence em *${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}*.

📅 Vencimento: ${new Date(fatura.data_vencimento).toLocaleDateString('pt-BR')}
💰 Valor: R$ ${fatura.valor_total.toFixed(2)}
📝 Descrição: ${fatura.descricao}

${fatura.link_pagamento ? `🔗 Link de pagamento: ${fatura.link_pagamento}` : ''}

Evite atrasos e mantenha sua academia em dia! 💪
    `.trim();
  }

  private gerarMensagemInadimplencia(assinatura: Assinatura): string {
    return `
⚠️ *Atenção: Inadimplência Detectada*

Olá ${assinatura.aluno?.nome_completo || 'Aluno'}!

Identificamos que sua assinatura está com *faturas em atraso*.

📋 Plano: ${assinatura.plano?.nome || 'Mensalidade'}
💰 Valor: R$ ${assinatura.valor.toFixed(2)}

Para regularizar sua situação e continuar aproveitando todos os benefícios, entre em contato conosco.

Regularize sua situação e volte a treinar! 🥋
    `.trim();
  }

  private gerarMensagemCobranca(fatura: Fatura): string {
    return `
💳 *Cobrança Pendente*

Olá ${fatura.aluno?.nome_completo || 'Aluno'}!

Você possui uma fatura pendente:

📄 Número: ${fatura.numero_fatura}
📅 Vencimento: ${new Date(fatura.data_vencimento).toLocaleDateString('pt-BR')}
💰 Valor: R$ ${fatura.valor_total.toFixed(2)}
📝 Descrição: ${fatura.descricao}

${fatura.link_pagamento ? `🔗 Pague agora: ${fatura.link_pagamento}` : ''}

Em caso de dúvidas, estamos à disposição!
    `.trim();
  }

  private async enviarEmail(notificacao: NotificacaoEmail): Promise<void> {
    // Implementar integração com serviço de email (SendGrid, AWS SES, etc)
    this.logger.log(
      `📧 Email enviado para ${notificacao.destinatario}: ${notificacao.assunto}`,
    );

    // TODO: Integrar com serviço de email real
    // Exemplo: await this.emailService.send(notificacao);
  }
}
