import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { tenantAsyncStorage } from './tenant-context';

/**
 * Instala um patch no PostgresQueryRunner para que TODA query executada pelo
 * TypeORM (repositórios, QueryBuilder, dataSource.query()) seja precedida de
 * um SET search_path dinamicamente baseado no tenant do request atual
 * (lido via AsyncLocalStorage).
 *
 * O patch é idempotente: só executa SET quando o schema muda na mesma conexão.
 */
@Injectable()
export class TenantQueryPatcherService implements OnModuleInit {
  private readonly logger = new Logger(TenantQueryPatcherService.name);
  private static patched = false;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    if (TenantQueryPatcherService.patched) return;
    TenantQueryPatcherService.patched = true;

    try {
      // Acessa a classe PostgresQueryRunner via o driver interno do TypeORM
      const driver = (this.dataSource.driver as any);
      const QueryRunnerClass = Object.getPrototypeOf(driver.createQueryRunner('master')).constructor;

      const originalQuery = QueryRunnerClass.prototype.query;

      QueryRunnerClass.prototype.query = async function (
        query: string,
        parameters?: any[],
        useStructuredResult = false,
      ) {
        // Não intercepta comandos de controle de sessão (evita recursão)
        const trimmed = (query || '').trimStart().toUpperCase();
        if (
          trimmed.startsWith('SET ') ||
          trimmed.startsWith('RESET ') ||
          trimmed.startsWith('START TRANSACTION') ||
          trimmed.startsWith('COMMIT') ||
          trimmed.startsWith('ROLLBACK') ||
          trimmed.startsWith('SAVEPOINT') ||
          trimmed.startsWith('RELEASE SAVEPOINT')
        ) {
          return originalQuery.call(this, query, parameters, useStructuredResult);
        }

        const store = tenantAsyncStorage.getStore();
        const schema = store?.schema || 'teamcruz';

        // Garante que a conexão pg.Client existe ANTES de tentar o SET
        // (this.databaseConnection é null até connect() ser chamado)
        let dbConn = this.databaseConnection;
        if (!dbConn) {
          try {
            dbConn = await this.connect();
          } catch {
            // Se connect() falhar, deixa o originalQuery lidar com o erro
            return originalQuery.call(this, query, parameters, useStructuredResult);
          }
        }

        if ((dbConn as any)._tenantSchema !== schema) {
          try {
            await dbConn.query(`SET search_path TO "${schema}", public`);
            (dbConn as any)._tenantSchema = schema;
          } catch {
            // Ignora falha no SET (não bloqueia a query original)
          }
        }

        return originalQuery.call(this, query, parameters, useStructuredResult);
      };

      this.logger.log('✅ PostgresQueryRunner.query patched para multi-tenant search_path');
    } catch (err) {
      this.logger.error('❌ Falha ao aplicar patch no PostgresQueryRunner:', err);
    }
  }
}
