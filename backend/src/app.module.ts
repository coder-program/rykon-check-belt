// Polyfill para crypto (Node.js < 20)
if (!globalThis.crypto) {
  const { webcrypto } = require('node:crypto');
  globalThis.crypto = webcrypto as any;
}

import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
        type: 'postgres' as const,
        host: configService.get('DB_HOST', 'localhost'),
        port: 5432,
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        autoLoadEntities: true,
        synchronize: false,
        ssl: configService.get('NODE_ENV') === 'production',
        logging: configService.get('NODE_ENV') === 'development',
        extra: {
          searchPath: 'teamcruz,public'
        },
      }),
    }),

    // Módulos Funcionais
    AuthModule,
    AuditModule,
    UsuariosModule,
    // TeamCruz
    CampanhasModule,
    PresencasModule,
    PeopleModule,
    EnderecosModule,
    GraduacaoModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*'); // Aplicar auditoria em todas as rotas
  }
}
