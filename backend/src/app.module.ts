// Polyfill para crypto (Node.js < 20)
if (!globalThis.crypto) {
  const { webcrypto } = require('node:crypto');
  globalThis.crypto = webcrypto as any;
}

import { Module, MiddlewareConsumer, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { tenantAsyncStorage } from './common/tenant-context';
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
// Multi-tenant
import { TenantModule } from './tenants/tenant.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

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
                max: 20,                              // 100 max_connections - 10 admin = 90 disponíveis; 20 é seguro e suporta pico
                min: 5,                               // manter 5 prontas para horário de pico das academias
                idleTimeoutMillis: 30000,             // fechar idle após 30s (balanceia pico/off-peak)
                connectionTimeoutMillis: 10000,       // 10s para obter conexão do pool
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000,
              }
            : {
                max: 20,                              // 100 max_connections - 10 admin = 90 disponíveis; 20 é seguro e suporta pico
                min: 5,                               // manter 5 prontas para horário de pico das academias
                idleTimeoutMillis: 30000,             // fechar idle após 30s (balanceia pico/off-peak)
                connectionTimeoutMillis: 10000,       // 10s para obter conexão do pool
                keepAlive: true,
                keepAliveInitialDelayMillis: 10000,
                ssl: {
                  rejectUnauthorized: false,
                },
              },
          
          // ========== LOGGING ==========
          logging: (configService.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error']) as any,
          
          // ========== SSL ==========
          ssl: isLocalhost ? false : true,
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
    TenantModule, // ← Multi-tenant
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit() {
    // Patch do pg.Pool para injetar SET search_path por request via AsyncLocalStorage.
    // TypeORM chama pool.connect(callback) — precisamos lidar com AMBAS as formas:
    // 1) pool.connect()          → retorna Promise<PoolClient>
    // 2) pool.connect(callback)  → chama callback(err, client, release) ← usado pelo TypeORM
    const driver = (this.dataSource.driver as any);
    const pool = driver.master; // pg.Pool do TypeORM PostgresDriver

    if (!pool || pool.__tenantPatched) {
      return; // Evita double-patch em hot reload
    }
    pool.__tenantPatched = true;

    const originalConnect = pool.connect.bind(pool);

    const applySearchPath = async (client: any) => {
      const store = tenantAsyncStorage.getStore();
      const schema = store?.schema;
      if (schema && schema !== 'public') {
        try {
          await client.query(`SET search_path TO "${schema}", public`);
        } catch (_err) { /* não bloquear */ }
      }
    };

    pool.connect = function (callbackOrUndefined?: any) {
      if (typeof callbackOrUndefined === 'function') {
        // Forma callback: pool.connect((err, client, release) => ...) — usada pelo TypeORM
        originalConnect((err: any, client: any, release: any) => {
          if (err) return callbackOrUndefined(err, client, release);
          applySearchPath(client)
            .then(() => callbackOrUndefined(null, client, release))
            .catch(() => callbackOrUndefined(null, client, release));
        });
      } else {
        // Forma Promise: await pool.connect()
        return originalConnect().then(async (client: any) => {
          await applySearchPath(client);
          return client;
        });
      }
    };

    this.logger.log('pg.Pool patched: SET search_path injeção ativa via AsyncLocalStorage');
  }

  configure(consumer: MiddlewareConsumer) {
    // TenantMiddleware PRIMEIRO — resolve o tenant antes de tudo
    consumer.apply(TenantMiddleware).forRoutes('*');
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}
