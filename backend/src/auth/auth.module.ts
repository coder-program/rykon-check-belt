import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PasswordReset } from './entities/password-reset.entity';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthController } from './google.controller';
import { PeopleModule } from '../people/people.module';

const controllers: any[] = [AuthController];
if (process.env.GOOGLE_CLIENT_ID) {
  controllers.push(GoogleAuthController);
}

const providers: any[] = [AuthService, LocalStrategy, JwtStrategy];
if (process.env.GOOGLE_CLIENT_ID) {
  providers.push(GoogleStrategy);
}

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordReset]),
    UsuariosModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'jwt_secret_muito_forte_para_producao_123456789',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    PeopleModule,
  ],
  controllers,
  providers,
  exports: [AuthService],
})
export class AuthModule {}
