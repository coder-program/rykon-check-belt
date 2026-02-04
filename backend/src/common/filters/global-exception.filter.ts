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
        // Log erro não tratado mas NÃO DERRUBAR SERVIDOR
        this.logger.error(`Erro não tratado: ${exception.message}`, exception.stack);
        
        // ========== VERIFICAR SE O ERRO TEM STATUS CODE (de APIs externas) ==========
        const errorObj = exception as any;
        if (errorObj.statusCode && typeof errorObj.statusCode === 'number') {
          status = errorObj.statusCode;
          message = errorObj.message || exception.message;
          this.logger.error(`📡 Erro de API externa - Status: ${status}, Message: ${message}`);
        }
        // ========== ERROS DE CONEXÃO/TIMEOUT DO BANCO ==========
        else if (
          exception.message.includes('timeout exceeded when trying to connect') ||
          exception.message.includes('Connection terminated unexpectedly') ||
          exception.message.includes('Connection timeout') ||
          exception.message.includes('ECONNREFUSED') ||
          exception.message.includes('connect ETIMEDOUT') ||
          exception.message.includes('Connection lost')
        ) {
          this.logger.error('🔌 ERRO DE CONEXÃO COM BANCO DE DADOS');
          message = 'Banco de dados temporariamente indisponível. Tente novamente em alguns instantes.';
          status = HttpStatus.SERVICE_UNAVAILABLE;
        }
        // ========== ERROS DE TIMEOUT GERAL ==========
        else if (
          exception.message.includes('ETIMEDOUT') ||
          exception.message.includes('timeout') ||
          exception.message.includes('ESOCKETTIMEDOUT')
        ) {
          this.logger.error('⏱️ TIMEOUT');
          message = 'Operação demorou muito. Tente novamente.';
          status = HttpStatus.REQUEST_TIMEOUT;
        }
        // ========== ERROS DE REDE/SMTP ==========
        else if (
          exception.message.includes('SMTP') ||
          exception.message.includes('ENOTFOUND') ||
          exception.message.includes('getaddrinfo')
        ) {
          this.logger.warn('📧 Erro de email (não crítico)');
          message = 'Serviço de email temporariamente indisponível';
          status = HttpStatus.SERVICE_UNAVAILABLE;
        }
        // ========== ERROS DE CÓDIGO (NULL/UNDEFINED) ==========
        else if (
          exception.message.includes('Cannot read properties of null') ||
          exception.message.includes('Cannot read properties of undefined') ||
          exception.message.includes('is not a function')
        ) {
          this.logger.error('💥 Erro de programação (null/undefined)');
          message = 'Erro interno do servidor';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        // ========== OUTROS ERROS ==========
        else {
          message = 'Erro interno do servidor';
          status = HttpStatus.INTERNAL_SERVER_ERROR;
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