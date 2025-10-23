import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * Envia email de suporte técnico
   */
  async sendSupportEmail(userEmail: string, message: string): Promise<boolean> {
    try {
      const supportEmail = this.configService.get<string>(
        'SUPPORT_EMAIL',
        'contato@rykon.com.br',
      );

      await this.transporter.sendMail({
        from: `"Team Cruz Suporte" <${this.configService.get<string>('SMTP_USER')}>`,
        to: supportEmail,
        replyTo: userEmail,
        subject: 'Suporte Team Cruz - Problema no Login',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #8B0000 100%); padding: 20px; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Team Cruz Brazilian Jiu-Jitsu</h1>
              <p style="color: #f0f0f0; margin: 5px 0 0 0;">Solicitação de Suporte</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
              <h2 style="color: #8B0000; margin-top: 0;">Novo pedido de suporte</h2>

              <div style="background: white; padding: 15px; border-left: 4px solid #8B0000; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Email do usuário:</strong></p>
                <p style="margin: 0; color: #333;">${userEmail}</p>
              </div>

              <div style="background: white; padding: 15px; border-left: 4px solid #8B0000; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>Descrição do problema:</strong></p>
                <p style="margin: 0; color: #333; white-space: pre-wrap;">${message}</p>
              </div>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Este email foi enviado automaticamente pelo sistema de suporte Team Cruz.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(
        `Email de suporte enviado para ${supportEmail} (origem: ${userEmail})`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Erro ao enviar email de suporte: ${error.message}`);
      return false;
    }
  }

  /**
   * Envia email de recuperação de senha
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<boolean> {
    try {
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      await this.transporter.sendMail({
        from: `"Team Cruz" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: 'Recuperação de Senha - Team Cruz',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #8B0000 100%); padding: 20px; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Team Cruz Brazilian Jiu-Jitsu</h1>
              <p style="color: #f0f0f0; margin: 5px 0 0 0;">Recuperação de Senha</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
              <h2 style="color: #8B0000; margin-top: 0;">Redefinir sua senha</h2>

              <p style="color: #333; line-height: 1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no sistema Team Cruz.
              </p>

              <p style="color: #333; line-height: 1.6;">
                Clique no botão abaixo para criar uma nova senha:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
                          color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px;
                          font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                  Redefinir Senha
                </a>
              </div>

              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Ou copie e cole este link no seu navegador:
              </p>
              <p style="color: #8B0000; font-size: 12px; word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">
                ${resetLink}
              </p>

              <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  ⚠️ <strong>Importante:</strong> Este link expira em 1 hora por motivos de segurança.
                </p>
              </div>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Se você não solicitou a recuperação de senha, ignore este email. Sua senha permanecerá inalterada.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`Email de recuperação de senha enviado para ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email de recuperação: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Testa a conexão com o servidor SMTP
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Conexão SMTP verificada com sucesso');
      return true;
    } catch (error) {
      this.logger.error(`Erro ao verificar conexão SMTP: ${error.message}`);
      return false;
    }
  }
}
