import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ProfileCompleteGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Verificar se o endpoint permite cadastro incompleto via decorator
    const allowIncomplete = this.reflector.get<boolean>(
      'allowIncomplete',
      context.getHandler(),
    );

    if (allowIncomplete) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    if (user.cadastro_completo === false) {
      throw new ForbiddenException(
        'Cadastro incompleto. Complete seu perfil antes de acessar esta funcionalidade.',
      );
    }

    return true;
  }
}
