import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService, AuditLogData } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private auditService: AuditService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const originalJson = res.json;
    const startTime = Date.now();

    // Interceptar resposta para capturar mudanças
    res.json = function (body) {
      const responseTime = Date.now() - startTime;

      // Só auditar se há usuário autenticado
      if (req.user) {
        const method = req.method;
        const url = req.originalUrl;
        const statusCode = res.statusCode;

        // Determinar ação baseada no método HTTP
        let action: AuditAction;
        switch (method) {
          case 'POST':
            action = AuditAction.CREATE;
            break;
          case 'PUT':
          case 'PATCH':
            action = AuditAction.UPDATE;
            break;
          case 'DELETE':
            action = AuditAction.DELETE;
            break;
          default:
            action = AuditAction.ACCESS;
        }

        // Extrair nome da entidade da URL
        const entityName = AuditMiddleware.extractEntityFromUrl(url);

        // Extrair ID da entidade se presente
        const entityId = AuditMiddleware.extractEntityIdFromUrl(url);

        const auditData: AuditLogData = {
          action,
          entityName,
          entityId,
          userId: (req.user as any).id,
          username: (req.user as any).username,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          newValues:
            method !== 'GET' && method !== 'DELETE' ? req.body : undefined,
          description: `${method} ${url} - Status: ${statusCode} - Response time: ${responseTime}ms`,
        };

        // Log assíncrono para não bloquear resposta
        setImmediate(() => {
          this.auditService.log(auditData);
        });
      }

      return originalJson.call(this, body);
    }.bind(res);

    next();
  }

  private static extractEntityFromUrl(url: string): string {
    // Remove query parameters
    const cleanUrl = url.split('?')[0];

    // Extract entity name from URL pattern /api/entity/...
    const parts = cleanUrl.split('/').filter((part) => part);

    if (parts.length >= 2) {
      return parts[1]; // Assume second part is entity name
    }

    return 'unknown';
  }

  private static extractEntityIdFromUrl(url: string): string | undefined {
    // Remove query parameters
    const cleanUrl = url.split('?')[0];

    // Extract ID from URL pattern /api/entity/id
    const parts = cleanUrl.split('/').filter((part) => part);

    if (parts.length >= 3) {
      const possibleId = parts[2];
      // Check if it looks like a UUID or number
      if (
        possibleId.match(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        ) ||
        possibleId.match(/^\d+$/)
      ) {
        return possibleId;
      }
    }

    return undefined;
  }
}
