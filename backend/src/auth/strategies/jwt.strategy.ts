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
    console.log('🔐 [JwtStrategy.validate] Payload recebido:', payload);

    const user = await this.authService.validateToken(payload);

    console.log(
      '🔐 [JwtStrategy.validate] User validado:',
      user ? user.id : 'NENHUM',
    );

    if (!user) {
      console.error(
        '❌ [JwtStrategy.validate] Usuário não encontrado para payload',
      );
      throw new UnauthorizedException();
    }

    return {
      ...user,
      permissions: payload.permissions,
    };
  }
}
