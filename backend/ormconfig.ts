import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

export default new DataSource({
  type: 'postgres',
  host: DB_HOST || '34.39.173.213',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: DB_USER || 'teamcruz_app',
  password: DB_PASS || 'TeamCruz2024@',
  database: DB_NAME || 'teamcruz_db',
  entities: ['dist/src/**/*.entity.js'],
  migrations: ['dist/src/migrations/*.js'],
  migrationsTableName: 'migrations',
  synchronize: false,
  ssl: {
    rejectUnauthorized: false,
  },
});
