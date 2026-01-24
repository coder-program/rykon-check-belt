import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'jwt_secret_muito_forte_para_producao_123456789',
    });
  }

  async validate(payload: JwtPayload) {
    try {
      // Verificar se payload tem dados mínimos necessários
      if (!payload || !payload.sub) {
        console.error(' [JwtStrategy.validate] Payload inválido ou sem sub');
        throw new UnauthorizedException('Token inválido');
      }

      const user = await this.authService.validateToken(payload);

      if (!user) {
        console.error(
          ' [JwtStrategy.validate] Usuário não encontrado para payload',
        );
        throw new UnauthorizedException('Usuário não encontrado');
      }

      return {
        ...user,
        permissions: payload.permissions || [],
      };
    } catch (error) {
      // Garantir que qualquer erro aqui não derrube o sistema
      console.error(' [JwtStrategy.validate] Erro durante validação:', error.message);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Qualquer outro erro é tratado como unauthorized
      throw new UnauthorizedException('Erro na validação do token');
    }
  }
}
