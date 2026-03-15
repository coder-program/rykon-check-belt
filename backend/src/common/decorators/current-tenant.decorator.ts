import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para acessar o contexto do tenant atual nos controllers.
 *
 * Uso:
 *   @CurrentTenant()              → { slug: 'teamcruz' }
 *   @CurrentTenant('slug')        → 'teamcruz'
 *   @CurrentTenant('schema')      → 'teamcruz'
 */
export const CurrentTenant = createParamDecorator(
  (data: 'slug' | 'schema' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    if (data === 'slug') return request.tenantSlug ?? 'teamcruz';
    if (data === 'schema') return request.tenantSchema ?? 'teamcruz';
    return {
      slug: request.tenantSlug ?? 'teamcruz',
      schema: request.tenantSchema ?? 'teamcruz',
    };
  },
);
