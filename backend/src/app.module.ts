// Polyfill para crypto (Node.js < 20)
if (!globalThis.crypto) {
  const { webcrypto } = require('node:crypto');
  globalThis.crypto = webcrypto as any;
}

import { Module, MiddlewareConsumer, Logger } from '@nestjs/common';
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
import { PresencaModule } from './presenca/presenca.module';
import { AulaModule } from './presenca/aula.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CompeticoesModule } from './competicoes/competicoes.module';
import { SupportModule } from './support/support.module';
import { ModalidadesModule } from './modalidades/modalidades.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { PaytimeModule } from './paytime/paytime.module';
import { HubUnidadeModule } from './hub-unidade/hub-unidade.module';
import { TenantModule } from './tenants/tenant.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { TenantSchemaSubscriber } from './common/tenant-schema.subscriber';
import { TenantQueryPatcherService } from './common/tenant-query-patcher.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dbHost = configService.get('DB_HOST', 'localhost');
        const isSocketConnection = dbHost.startsWith('/cloudsql/');
        const isLocalhost = dbHost === 'localhost' || dbHost === '127.0.0.1';

        const config = {
          type: 'postgres' as const,
          host: dbHost,
          port: isSocketConnection
            ? undefined
            : parseInt(configService.get('DB_PORT', '5432')),
          username: configService.get('DB_USER'),
          password: configService.get('DB_PASS'),
          database: configService.get('DB_NAME'),
          autoLoadEntities: true,
          synchronize: false,
          entities: ['dist/**/*.entity.js'],
          migrations: ['dist/src/migrations/*.js'],
          migrationsTableName: 'migrations',
          
          // ========== RETRY E RESILIÊNCIA ==========
          maxQueryExecutionTime: 30000,        // 30s para queries
          
          // ========== POOL + TIMEOUTS via extra (pg-pool aplica corretamente aqui) ==========
          extra: isLocalhost
            ? {
                max: 20,
                min: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000,
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000,
                options: '-c search_path=teamcruz,public',
              }
            : {
                max: 20,
                min: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 10000,
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000,
                options: '-c search_path=teamcruz,public',
                ssl: {
                  rejectUnauthorized: false,
                },
              },
          
          // ========== LOGGING ==========
          logging: (configService.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error']) as any,
          
          // ========== SSL ==========
          ssl: isLocalhost ? false : true,
          
          // ========== SUBSCRIBER DE TENANT (search_path dinâmico) ==========
          // subscribers: removido - patch dinâmico feito pelo TenantQueryPatcherService
        };

        return config;
      },
    }),
    AuthModule,
    AuditModule,
    UsuariosModule,
    CampanhasModule,
    PresencasModule,
    PresencaModule,
    AulaModule,
    PeopleModule,
    EnderecosModule,
    GraduacaoModule,
    DashboardModule,
    CompeticoesModule,
    SupportModule,
    ModalidadesModule,
    FinanceiroModule,
    PaytimeModule,
    HubUnidadeModule,
    TenantModule,
  ],
  providers: [TenantQueryPatcherService],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}
