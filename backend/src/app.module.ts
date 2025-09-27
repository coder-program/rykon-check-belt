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
    TypeOrmModule.forRoot({
      type: 'postgres' as const,
      host: '34.95.254.51',
      port: 5432,
      username: 'teamcruz_app',
      password: 'TeamCruz2024@',
      database: 'teamcruz_db',
      autoLoadEntities: true,
      synchronize: false,
      entities: ['dist/**/*.entity.js'],
      migrations: ['dist/src/migrations/*.js'],
      migrationsTableName: 'migrations',
      ssl: process.env.NODE_ENV === 'production',
      extra: {
        searchPath: 'teamcruz,public'
      }
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
