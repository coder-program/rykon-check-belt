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
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      // Log erro mas não derrubar servidor
      this.logger.error(`Erro não tratado: ${exception.message}`, exception.stack);
      
      // Erros específicos que não devem derrubar servidor
      if (exception.message.includes('Connection timeout') || 
          exception.message.includes('SMTP') || 
          exception.message.includes('ENOTFOUND') ||
          exception.message.includes('ETIMEDOUT')) {
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

    this.logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify(errorResponse),
    );

    response.status(status).json(errorResponse);
  }
}