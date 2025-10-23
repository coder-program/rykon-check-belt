import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      console.error('❌ [JwtAuthGuard] REJEITADO - err:', err, 'info:', info);
      throw err || new UnauthorizedException(info?.message || 'Token inválido');
    }
    return user;
  }
}
