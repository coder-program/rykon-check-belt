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
    console.log('🛡️ [JwtAuthGuard] Verificando autenticação...');
    console.log(
      '🛡️ [JwtAuthGuard] Authorization header:',
      request.headers.authorization || 'NENHUM',
    );
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    console.log('🛡️ [JwtAuthGuard.handleRequest] err:', err);
    console.log(
      '🛡️ [JwtAuthGuard.handleRequest] user:',
      user ? user.id : 'NENHUM',
    );
    console.log('🛡️ [JwtAuthGuard.handleRequest] info:', info);

    if (err || !user) {
      console.error('❌ [JwtAuthGuard] REJEITADO - err:', err, 'info:', info);
      throw err || new UnauthorizedException(info?.message || 'Token inválido');
    }
    return user;
  }
}
