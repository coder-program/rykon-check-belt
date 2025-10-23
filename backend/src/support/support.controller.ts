import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { SendSupportEmailDto } from './dto/send-support-email.dto';

@Controller('support')
export class SupportController {
  constructor(private readonly emailService: EmailService) {}

  @Post('contact')
  async sendSupportEmail(@Body() dto: SendSupportEmailDto) {
    try {
      const success = await this.emailService.sendSupportEmail(
        dto.email,
        dto.message,
      );

      if (!success) {
        throw new HttpException(
          'Erro ao enviar email. Tente novamente mais tarde ou use o WhatsApp.',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return {
        success: true,
        message:
          'Email enviado com sucesso! Nossa equipe entrará em contato em breve.',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Erro inesperado ao processar sua solicitação',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
