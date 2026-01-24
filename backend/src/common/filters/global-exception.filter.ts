import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    try {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = 'Internal server error';

      if (exception instanceof HttpException) {
        status = exception.getStatus();
        message = exception.message;

        // Log apenas erros internos (5xx) como problemas reais
        if (status >= 500) {
          this.logger.error(
            `${request.method} ${request.url}`,
            exception.message,
          );
        } else {
          // Para status 4xx (cliente), log apenas como warn ou debug
          this.logger.debug(
            `${request.method} ${request.url}`,
            exception.message,
          );
        }
      } else if (exception instanceof Error) {
        // Log erro não tratado mas não derrubar servidor
        this.logger.error(`Erro não tratado: ${exception.message}`, exception.stack);
        
        // Erros específicos que não devem derrubar servidor
        if (exception.message.includes('Connection timeout') || 
            exception.message.includes('SMTP') || 
            exception.message.includes('ENOTFOUND') ||
            exception.message.includes('ETIMEDOUT') ||
            exception.message.includes('Cannot read properties of null') ||
            exception.message.includes('Cannot read properties of undefined')) {
          message = 'Serviço temporariamente indisponível';
          status = HttpStatus.SERVICE_UNAVAILABLE;
        }
      } else {
        this.logger.error('Erro desconhecido:', exception);
      }

      const errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: message,
      };

      response.status(status).json(errorResponse);
    } catch (criticalError) {
      // PROTEÇÃO CRÍTICA: Se até o exception filter falhar, não derrubar
      this.logger.error('ERRO CRÍTICO no GlobalExceptionFilter:', criticalError);
      
      try {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        response.status(500).json({
          statusCode: 500,
          timestamp: new Date().toISOString(),
          message: 'Sistema temporariamente indisponível'
        });
      } catch (finalError) {
        // Última linha de defesa - log mas não quebrar
        this.logger.error('FALHA TOTAL no tratamento de erro:', finalError);
      }
    }
  }
}