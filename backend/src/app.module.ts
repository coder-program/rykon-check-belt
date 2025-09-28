// Polyfill para crypto (Node.js < 20)
if (!globalThis.crypto) {
  const { webcrypto } = require('node:crypto');
  globalThis.crypto = webcrypto as any;
}

import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsuariosModule } from './usuarios/usuarios.module';

// Módulos de Segurança
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { AuditMiddleware } from './audit/audit.middleware';
import { CampanhasModule } from './teamcruz/campanhas/campanhas.module';
import { PresencasModule } from './teamcruz/presencas/presencas.module';
import { PeopleModule } from './people/people.module';
import { EnderecosModule } from './enderecos/enderecos.module';
import { GraduacaoModule } from './graduacao/graduacao.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: process.env.NODE_ENV === 'production'
          ? 'teamcruz-db.private.postgres.database.cloud.google.com'
          : 'localhost',
        port: 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '••••••••••••',
        database: process.env.DB_NAME || 'postgres',
        autoLoadEntities: true,
        synchronize: false,
        ssl: process.env.NODE_ENV === 'production',
        extra: {
          searchPath: 'teamcruz,public',
          ssl: process.env.NODE_ENV === 'production' ? {
            rejectUnauthorized: false
          } : undefined
        }
      })
    }),
    AuthModule,
    AuditModule,
    UsuariosModule,
    CampanhasModule,
    PresencasModule,
    PeopleModule,
    EnderecosModule,
    GraduacaoModule
  ]
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}
