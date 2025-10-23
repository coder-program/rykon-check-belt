import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuardAllowInactive extends AuthGuard('jwt') {
  constructor(private authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extrair e validar o token manualmente
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const token = authHeader.substring(7);

    try {
      const jwt = require('jsonwebtoken');
      const secret =
        process.env.JWT_SECRET ||
        'jwt_secret_muito_forte_para_producao_123456789';
      const payload = jwt.verify(token, secret);

      // Validar com allowInactive = true
      const user = await this.authService.validateToken(payload, true);

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado');
      }

      request.user = {
        ...user,
        permissions: payload.permissions,
      };

      return true;
    } catch (error) {
      console.error('❌ [JwtAuthGuardAllowInactive] Erro:', error.message);
      throw new UnauthorizedException('Token inválido');
    }
  }
}
