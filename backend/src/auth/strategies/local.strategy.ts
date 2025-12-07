import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'emailOrUsername', // Aceita email OU username
      passwordField: 'password',
    });
  }

  async validate(emailOrUsername: string, password: string): Promise<any> {
    const result = await this.authService.validateUser(
      emailOrUsername,
      password,
    );

    if (!result.user) {
      console.error(' LocalStrategy.validate -', result.error);
      throw new UnauthorizedException(result.error || 'Credenciais inválidas');
    }

    return result.user;
  }
}
