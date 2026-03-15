import { AsyncLocalStorage } from 'async_hooks';

/**
 * Contexto de tenant por request usando AsyncLocalStorage.
 * Armazena o schema do tenant ativo (ex: 'teamcruz', 'rykon') para a
 * duração de cada requisição HTTP, permitindo que serviços e o driver
 * do banco de dados usem o schema correto sem precisar receber o schema
 * como parâmetro em cada método.
 */
export const tenantAsyncStorage = new AsyncLocalStorage<{ schema: string }>();
