import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Perfis admin têm bypass total — não dependem de permissões específicas
    const ADMIN_PERFIS = ['master', 'admin', 'admin_sistema', 'super_admin'];
    const perfisNomes: string[] = (user.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toLowerCase() : (p?.nome || '').toLowerCase(),
    );
    if (perfisNomes.some((p) => ADMIN_PERFIS.includes(p))) {
      return true;
    }

    if (!user.permissions) {
      return false;
    }

    return requiredPermissions.some((permission) =>
      user.permissions?.includes(permission),
    );
  }
}
