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
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        console.log('Ambiente:', configService.get('NODE_ENV'));

        if (isProduction) {
          const { Client } = require('pg');
          const client = new Client({
            user: configService.get('DB_USER'),
            password: configService.get('DB_PASS'),
            database: configService.get('DB_NAME'),
            host: '/cloudsql/teamcruz-controle-alunos:southamerica-east1:teamcruz-db'
          });

          try {
            await client.connect();
            console.log('Teste de conexão direto com pg: Sucesso!');
            await client.end();
          } catch (err) {
            console.error('Erro ao testar conexão:', err);
          }
        }

        const config = {
          type: 'postgres' as const,
          host: configService.get('DB_HOST', 'localhost'),
          port: isProduction ? undefined : configService.get('DB_PORT', 5436),
          username: configService.get('DB_USER', 'teamcruz_admin'),
          password: configService.get('DB_PASS', 'cruz@jiujitsu2024'),
          database: configService.get('DB_NAME', 'teamcruz_db'),
          autoLoadEntities: true,
          synchronize: false,
          ssl: false,
          logging: !isProduction,
          extra: isProduction ? {
            host: '/cloudsql/teamcruz-controle-alunos:southamerica-east1:teamcruz-db'
          } : {
            searchPath: 'teamcruz,public'
          }
        };

        console.log('Config TypeORM:', JSON.stringify(config, null, 2));
        return config;
      },
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
