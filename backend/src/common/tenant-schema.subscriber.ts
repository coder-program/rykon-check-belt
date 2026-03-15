import { EventSubscriber, EntitySubscriberInterface } from 'typeorm';
import { tenantAsyncStorage } from './tenant-context';

/**
 * TypeORM Subscriber que seta o search_path do PostgreSQL antes de cada query.
 *
 * Lê o schema do tenant via AsyncLocalStorage (preenchido pelo TenantMiddleware)
 * e aplica SET search_path diretamente no pg.Client, garantindo que todas as
 * queries TypeORM (repositórios, query builders, etc.) operem no schema correto
 * sem precisar de schema explícito em nenhum service.
 *
 * Cacheamos o schema atual na conexão (pg.Client._tenantSchema) para evitar
 * um round-trip ao banco quando a conexão já está configurada para o schema certo.
 */
@EventSubscriber()
export class TenantSchemaSubscriber implements EntitySubscriberInterface {
  beforeQuery(event: any): void | Promise<void> {
    // Ignora comandos SET/RESET para evitar recursão infinita
    const q: string = event.query || '';
    if (q.startsWith('SET ') || q.startsWith('RESET ') || q.startsWith('set ')) {
      return;
    }

    const store = tenantAsyncStorage.getStore();
    const schema = store?.schema || 'teamcruz';

    const queryRunner = event.queryRunner;
    if (!queryRunner) return;

    // dbConn é o pg.Client bruto
    const dbConn = (queryRunner as any).databaseConnection;
    if (!dbConn) return;

    // Cache por conexão: só executa SET quando o schema muda
    if ((dbConn as any)._tenantSchema === schema) return;

    return new Promise<void>((resolve, reject) => {
      dbConn.query(
        `SET search_path TO "${schema}", public`,
        (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            (dbConn as any)._tenantSchema = schema;
            resolve();
          }
        },
      );
    });
  }
}
