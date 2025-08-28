import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTeamCruzDbConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('TEAMCRUZ_DB_HOST', 'localhost'),
  port: configService.get('TEAMCRUZ_DB_PORT', 5433),
  username: configService.get('TEAMCRUZ_DB_USER', 'teamcruz_admin'),
  password: configService.get('TEAMCRUZ_DB_PASSWORD', 'cruz@jiujitsu2024'),
  database: configService.get('TEAMCRUZ_DB_NAME', 'teamcruz_db'),
  schema: 'teamcruz',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: configService.get('NODE_ENV') !== 'production',
  logging: configService.get('NODE_ENV') === 'development',
  ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
  autoLoadEntities: true,
});
