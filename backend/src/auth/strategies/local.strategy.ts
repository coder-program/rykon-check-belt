import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Diz ao Passport para usar 'email' em vez de 'username'
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    const result = await this.authService.validateUser(email, password);

    if (!result.user) {
      console.error('❌ LocalStrategy.validate -', result.error);
      throw new UnauthorizedException(result.error || 'Credenciais inválidas');
    }

    return result.user;
  }
}
