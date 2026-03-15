import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../../tenants/tenant.service';
import { tenantAsyncStorage } from '../tenant-context';

// Extende o Request do Express para carregar o contexto do tenant
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantSlug?: string;
      tenantSchema?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    let slug: string | undefined;

    // 1. Header explícito (APIs, mobile, Postman)
    if (req.headers['x-tenant-id']) {
      slug = req.headers['x-tenant-id'] as string;
    }

    // 2. Subdomínio (teamcruz.rykon.com.br → 'teamcruz')
    if (!slug && req.hostname) {
      const parts = req.hostname.split('.');
      if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'api') {
        slug = parts[0];
      }
    }

    // 3. Query param (desenvolvimento: ?tenant=teamcruz)
    if (!slug && req.query?.tenant) {
      slug = req.query.tenant as string;
    }

    // 4. Fallback legado — TeamCruz por padrão (retrocompatibilidade)
    if (!slug) {
      slug = 'teamcruz';
    }

    // Sanitiza o slug
    slug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '');

    try {
      const tenant = await this.tenantService.findBySlug(slug);
      req.tenantSlug = tenant.slug;
      req.tenantSchema = tenant.schemaName;
    } catch {
      // Tenant desconhecido → fallback seguro para teamcruz
      this.logger.warn(`Tenant '${slug}' não encontrado, usando fallback teamcruz`);
      req.tenantSlug = 'teamcruz';
      req.tenantSchema = 'teamcruz';
    }

    // Propaga o schema pelo AsyncLocalStorage para que o pg.Pool
    // possa definir SET search_path automaticamente em cada conexão
    tenantAsyncStorage.run({ schema: req.tenantSchema }, () => next());
  }
}
