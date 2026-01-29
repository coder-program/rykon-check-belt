import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);
  private readonly REQUEST_TIMEOUT = 30000; // 30 segundos

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      timeout(this.REQUEST_TIMEOUT),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          this.logger.error(`⏱️ Timeout em ${method} ${url} após ${this.REQUEST_TIMEOUT}ms`);
          
          return throwError(
            () =>
              new ServiceUnavailableException({
                statusCode: 503,
                message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
                error: 'Service Unavailable',
                timeout: true,
              }),
          );
        }

        // Se for erro de conexão com banco
        if (
          err.message?.includes('timeout exceeded when trying to connect') ||
          err.message?.includes('Connection terminated unexpectedly') ||
          err.message?.includes('ECONNREFUSED')
        ) {
          this.logger.error(`🔌 Erro de conexão com banco em ${method} ${url}: ${err.message}`);
          
          return throwError(
            () =>
              new ServiceUnavailableException({
                statusCode: 503,
                message: 'Banco de dados temporariamente indisponível. Tente novamente em alguns instantes.',
                error: 'Database Connection Error',
                detail: 'Nossos serviços estão passando por instabilidade. Por favor, aguarde alguns minutos e tente novamente.',
              }),
          );
        }

        // Propagar outros erros
        return throwError(() => err);
      }),
    );
  }
}
