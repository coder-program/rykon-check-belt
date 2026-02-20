import { Injectable, Logger } from '@nestjs/common';
import { Fatura } from '../entities/fatura.entity';
import { Assinatura } from '../entities/assinatura.entity';
import { WhatsappService } from './whatsapp.service';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

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

  /**
   * Notifica falha no pagamento recorrente
   */
  async enviarNotificacaoFalhaPagamento(
    assinatura: Assinatura,
    tentativa: number,
  ): Promise<void> {
    try {
      const aluno = assinatura.aluno;

      if (!aluno) {
        this.logger.warn('Assinatura sem aluno vinculado');
        return;
      }

      const dadosCartao = assinatura.dados_pagamento as any;
      const urgencia = tentativa === 2 ? '🔴 URGENTE' : '⚠️';
      const tentativaTexto = tentativa === 2 ? 'ÚLTIMA TENTATIVA' : `Tentativa ${tentativa}/3`;

      const mensagem = this.gerarMensagemFalhaPagamento(
        assinatura,
        dadosCartao,
        tentativa,
        urgencia,
        tentativaTexto,
      );

      // Email
      if (aluno.email) {
        await this.enviarEmail({
          destinatario: aluno.email,
          assunto: `${urgencia} Falha no pagamento - ${tentativaTexto}`,
          corpo: mensagem,
        });
      }

      // WhatsApp
      if (aluno.telefone) {
        await this.whatsappService.enviarMensagem(aluno.telefone, mensagem);
      }

      this.logger.log(
        `⚠️ Notificação de falha (tentativa ${tentativa}) enviada para assinatura ${assinatura.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de falha de pagamento:`,
        error,
      );
    }
  }

  /**
   * Notifica comprovante de pagamento recorrente
   */
  async enviarComprovantePagamento(fatura: Fatura): Promise<void> {
    try {
      const aluno = fatura.aluno;
      const assinatura = fatura.assinatura;

      if (!aluno) {
        this.logger.warn('Fatura sem aluno vinculado');
        return;
      }

      const mensagem = this.gerarMensagemComprovantePagamento(
        fatura,
        assinatura,
      );

      // Email
      if (aluno.email) {
        await this.enviarEmail({
          destinatario: aluno.email,
          assunto: `✅ Pagamento confirmado - ${fatura.numero_fatura}`,
          corpo: mensagem,
        });
      }

      // WhatsApp
      if (aluno.telefone) {
        await this.whatsappService.enviarMensagem(aluno.telefone, mensagem);
      }

      this.logger.log(
        `✅ Comprovante de pagamento enviado para fatura ${fatura.numero_fatura}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar comprovante de pagamento:`,
        error,
      );
    }
  }

  /**
   * Notifica cartão vencendo
   */
  async enviarNotificacaoCartaoVencendo(
    assinatura: Assinatura,
    mesesRestantes: number,
  ): Promise<void> {
    try {
      const aluno = assinatura.aluno;

      if (!aluno) {
        this.logger.warn('Assinatura sem aluno vinculado');
        return;
      }

      const dadosCartao = assinatura.dados_pagamento as any;
      const urgencia = mesesRestantes === 0 ? '🔴 URGENTE' : '⚠️ ATENÇÃO';
      const texto =
        mesesRestantes === 0
          ? 'este mês'
          : `em ${mesesRestantes} ${mesesRestantes === 1 ? 'mês' : 'meses'}`;

      const mensagem = this.gerarMensagemCartaoVencendo(
        assinatura,
        dadosCartao,
        urgencia,
        texto,
      );

      // Email
      if (aluno.email) {
        await this.enviarEmail({
          destinatario: aluno.email,
          assunto: `${urgencia} Cartão vencendo ${texto}`,
          corpo: mensagem,
        });
      }

      // WhatsApp
      if (aluno.telefone) {
        await this.whatsappService.enviarMensagem(aluno.telefone, mensagem);
      }

      this.logger.log(
        `💳 Notificação de cartão vencendo enviada para assinatura ${assinatura.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação de cartão vencendo:`,
        error,
      );
    }
  }

  private gerarMensagemFalhaPagamento(
    assinatura: Assinatura,
    dadosCartao: any,
    tentativa: number,
    urgencia: string,
    tentativaTexto: string,
  ): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.teamcruz.com.br';

    return `
${urgencia} *Falha no Pagamento Automático*

Olá ${assinatura.aluno?.nome_completo || 'Aluno'}!

Tentamos processar o pagamento da sua mensalidade, mas não foi possível.

📋 *Detalhes da Assinatura:*
- Plano: ${assinatura.plano?.nome || 'Mensalidade'}
- Valor: R$ ${assinatura.valor.toFixed(2)}
- Cartão: **** **** **** ${dadosCartao?.last4 || '****'}
- Status: ${tentativaTexto}

${tentativa === 1 ? '⚠️ Faremos nova tentativa em 2 dias.' : ''}
${tentativa === 2 ? '🔴 ATENÇÃO: Esta é a última tentativa! Faremos nova cobrança em 2 dias.' : ''}
${tentativa >= 3 ? '🚨 Sua assinatura foi suspensa. Atualize o cartão para reativar.' : ''}

*Possíveis causas:*
• Saldo insuficiente na conta
• Cartão vencido ou bloqueado
• Limite de crédito excedido

*Para evitar o bloqueio:*
1. Verifique se há saldo disponível
2. Atualize os dados do cartão
3. Entre em contato conosco

👉 Atualizar cartão: ${frontendUrl}/assinaturas/${assinatura.id}/cartao

Equipe TeamCruz 🥋
    `.trim();
  }

  private gerarMensagemComprovantePagamento(
    fatura: Fatura,
    assinatura: Assinatura,
  ): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.teamcruz.com.br';
    const proximaCobranca = assinatura?.proxima_cobranca
      ? dayjs(assinatura.proxima_cobranca).format('DD/MM/YYYY')
      : 'em breve';

    return `
✅ *Pagamento Confirmado!*

Olá ${fatura.aluno?.nome_completo || 'Aluno'}!

Seu pagamento foi processado com sucesso.

📋 *Comprovante de Pagamento:*
- Fatura: ${fatura.numero_fatura}
- Valor: R$ ${fatura.valor_total.toFixed(2)}
- Data: ${dayjs().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm')}
- Método: Cartão de crédito (automático)

✅ Sua assinatura está ativa e renovada automaticamente.

📅 Próximo pagamento: ${proximaCobranca}

👉 Ver detalhes: ${frontendUrl}/minhas-faturas/${fatura.id}

Obrigado por fazer parte da TeamCruz! 💪🥋

Equipe TeamCruz
    `.trim();
  }

  private gerarMensagemCartaoVencendo(
    assinatura: Assinatura,
    dadosCartao: any,
    urgencia: string,
    texto: string,
  ): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.teamcruz.com.br';

    return `
${urgencia} *Cartão de Crédito Vencendo*

Olá ${assinatura.aluno?.nome_completo || 'Aluno'}!

O cartão cadastrado para sua assinatura vence ${texto}.

💳 *Cartão Atual:*
- Final: **** **** **** ${dadosCartao?.last4 || '****'}
- Bandeira: ${dadosCartao?.brand || 'N/A'}
- Validade: ${dadosCartao?.exp_month}/${dadosCartao?.exp_year}

⚠️ Para evitar interrupção no acesso, atualize os dados do cartão:

👉 Atualizar agora: ${frontendUrl}/assinaturas/${assinatura.id}/cartao

Qualquer dúvida, estamos à disposição!

Equipe TeamCruz 🥋
    `.trim();
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
