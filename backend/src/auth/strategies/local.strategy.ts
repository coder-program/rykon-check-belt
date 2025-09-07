import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email', // Diz ao Passport para usar 'email' em vez de 'username'
      passwordField: 'password'
    });
  }

  async validate(email: string, password: string): Promise<any> {
    console.log('🔑 LocalStrategy.validate - Email:', email);
    console.log('🔑 LocalStrategy.validate - Password length:', password?.length);
    
    const user = await this.authService.validateUser(email, password);
    console.log('🔑 LocalStrategy.validate - User validated?', !!user);

    if (!user) {
      console.error('❌ LocalStrategy.validate - Credenciais inválidas');
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return user;
  }
}
