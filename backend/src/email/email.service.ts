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
      connectionTimeout: 10000, // 10 segundos
      greetingTimeout: 5000, // 5 segundos
      socketTimeout: 15000, // 15 segundos
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      // Configuração de retry e tolerância a falhas
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
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

      // Timeout wrapper para prevenir crash
      const sendMailPromise = this.transporter.sendMail({
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

      // Aplicar timeout de 20 segundos para evitar crash
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Email timeout')), 20000)
      );

      await Promise.race([sendMailPromise, timeoutPromise]);

      this.logger.log(`Email de recuperação de senha enviado para ${email}`);
      return true;
    } catch (error) {
      // LOG apenas - NUNCA deixar derrubar o servidor
      this.logger.error(
        `Erro ao enviar email de recuperação: ${error.message}`,
      );
      this.logger.warn('Email falhou mas sistema continua funcionando');
      return false;
    }
  }

  /**
   * Envia email com credenciais de acesso para novos usuários
   */
  async sendCredentialsEmail(
    email: string,
    nome: string,
    username: string,
    senha: string,
    perfil: string,
  ): Promise<boolean> {
    try {
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );
      const loginLink = `${frontendUrl}/login`;

      const perfilNomes: Record<string, string> = {
        FRANQUEADO: 'Franqueado',
        GERENTE_UNIDADE: 'Gerente de Unidade',
        PROFESSOR: 'Instrutor/Professor',
        RECEPCAO: 'Recepcionista',
      };

      const perfilNome = perfilNomes[perfil] || perfil;

      await this.transporter.sendMail({
        from: `"Team Cruz" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: `Bem-vindo ao Team Cruz - Suas Credenciais de Acesso`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #8B0000 100%); padding: 20px; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Team Cruz Brazilian Jiu-Jitsu</h1>
              <p style="color: #f0f0f0; margin: 5px 0 0 0;">Bem-vindo ao Sistema</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
              <h2 style="color: #8B0000; margin-top: 0;">Olá, ${nome}!</h2>

              <p style="color: #333; line-height: 1.6;">
                Sua conta foi criada com sucesso no sistema Team Cruz com o perfil de <strong>${perfilNome}</strong>.
              </p>

              <div style="background: white; padding: 20px; border-left: 4px solid #8B0000; margin: 20px 0;">
                <h3 style="color: #8B0000; margin-top: 0;">Suas Credenciais de Acesso</h3>

                <div style="margin: 15px 0;">
                  <p style="margin: 5px 0; color: #666;"><strong>Usuário:</strong></p>
                  <p style="margin: 5px 0; color: #333; font-size: 16px; background: #f5f5f5; padding: 8px; border-radius: 4px;">
                    ${username}
                  </p>
                </div>

                <div style="margin: 15px 0;">
                  <p style="margin: 5px 0; color: #666;"><strong>Senha:</strong></p>
                  <p style="margin: 5px 0; color: #333; font-size: 16px; background: #f5f5f5; padding: 8px; border-radius: 4px; font-family: monospace;">
                    ${senha}
                  </p>
                </div>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
                          color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px;
                          font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                  Acessar Sistema
                </a>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #856404; font-size: 14px;">
                  🔒 <strong>Importante:</strong> Por motivos de segurança, recomendamos que você altere sua senha após o primeiro acesso.
                </p>
              </div>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Se você tiver dúvidas ou precisar de ajuda, entre em contato com o suporte.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(
        `Email de credenciais enviado para ${email} (${perfilNome})`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email de credenciais: ${error.message}`,
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

  /**
   * Envia email de aprovação de cadastro
   */
  async sendApprovalEmail(
    email: string,
    nome: string,
  ): Promise<boolean> {
    try {
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:3000',
      );
      const loginLink = `${frontendUrl}/login`;

      await this.transporter.sendMail({
        from: `"Team Cruz" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: '🎉 Cadastro Aprovado - Team Cruz',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #8B0000 100%); padding: 20px; text-align: center;">
              <h1 style="color: #fff; margin: 0;">Team Cruz Brazilian Jiu-Jitsu</h1>
              <p style="color: #f0f0f0; margin: 5px 0 0 0;">Bem-vindo à Família!</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd;">
              <h2 style="color: #8B0000; margin-top: 0;">🎉 Seu cadastro foi aprovado!</h2>

              <p style="color: #333; font-size: 16px; line-height: 1.6;">
                Olá <strong>${nome}</strong>,
              </p>

              <p style="color: #333; line-height: 1.6;">
                É com grande prazer que informamos que seu cadastro foi <strong>aprovado com sucesso</strong>! 
                Agora você faz parte da família Team Cruz.
              </p>

              <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
                <p style="color: white; font-size: 18px; font-weight: bold; margin: 0;">
                  ✅ Você já pode acessar o sistema!
                </p>
              </div>

              <p style="color: #333; line-height: 1.6;">
                Clique no botão abaixo para fazer login e começar a usar todas as funcionalidades:
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginLink}"
                   style="display: inline-block; background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
                          color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px;
                          font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                  Acessar Sistema
                </a>
              </div>

              <p style="color: #666; font-size: 14px; line-height: 1.6;">
                Ou copie e cole este link no seu navegador:
              </p>
              <p style="color: #8B0000; font-size: 12px; word-break: break-all; background: #fff; padding: 10px; border: 1px solid #ddd;">
                ${loginLink}
              </p>

              <div style="background: #e8f5e9; border: 1px solid #4caf50; padding: 15px; margin-top: 20px; border-radius: 5px;">
                <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                  💡 <strong>Dica:</strong> Use suas credenciais de acesso (email e senha) que você cadastrou para fazer login.
                </p>
              </div>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Se você tiver alguma dúvida, entre em contato com nossa equipe de suporte.
              </p>
            </div>
          </div>
        `,
      });

      this.logger.log(`Email de aprovação enviado para ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Erro ao enviar email de aprovação: ${error.message}`,
      );
      return false;
    }
  }
}
