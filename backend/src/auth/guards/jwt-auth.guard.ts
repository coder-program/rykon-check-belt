import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Log erro mas não deixar derrubar servidor
    if (err || !user) {
      // Log silencioso para tokens malformados (muito comum)
      if (info?.name === 'JsonWebTokenError' && info?.message?.includes('malformed')) {
        // Token malformado é comum - não precisa logar como error
        throw new UnauthorizedException('Token malformado');
      }
      
      console.warn(' [JwtAuthGuard] Token rejeitado:', info?.message || 'Token inválido');
      throw err || new UnauthorizedException(info?.message || 'Token inválido');
    }
    return user;
  }
}
