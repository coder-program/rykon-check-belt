import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config();

// Log de debug
console.log('Ambiente:', process.env.NODE_ENV);

const config = {
  type: 'postgres' as const,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'teamcruz_db',
  extra: process.env.NODE_ENV === 'production' ? {
    socketPath: '/cloudsql/teamcruz-controle-alunos:southamerica-east1:teamcruz-db'
  } : undefined,
  host: process.env.NODE_ENV === 'production' 
    ? null
    : process.env.DB_HOST || 'localhost',
  port: process.env.NODE_ENV === 'production'
    ? null
    : parseInt(process.env.DB_PORT || '5432', 10),
};

// Log de debug
console.log('Configuração TypeORM:', JSON.stringify(config, null, 2));

export default new DataSource(config);
  // Entities não são necessárias para rodar migrations, mas deixamos o padrão
  entities: [path.join(__dirname, 'src/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, 'src/migrations/*{.ts,.js}')],
  synchronize: false,
  logging: true,
});
