import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    console.log('🔐 JwtAuthGuard - Headers:', request.headers);
    console.log('🔐 JwtAuthGuard - Authorization Header:', request.headers.authorization);
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    console.log('🔐 JwtAuthGuard.handleRequest - Error:', err);
    console.log('🔐 JwtAuthGuard.handleRequest - User:', user ? 'Present' : 'Not present');
    console.log('🔐 JwtAuthGuard.handleRequest - Info:', info);
    
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Token inválido');
    }
    return user;
  }
}
