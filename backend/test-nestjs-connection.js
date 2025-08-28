const { NestFactory } = require('@nestjs/core');
const { Module } = require('@nestjs/common');
const { TypeOrmModule } = require('@nestjs/typeorm');
require('dotenv').config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'acesso_usuarios_db',
      autoLoadEntities: false,
      synchronize: false,
      ssl: false,
      logging: true,
    }),
  ],
})
class TestModule {}

async function bootstrap() {
  console.log('🔧 Configuração:', {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS ? '***' : 'default',
    database: process.env.DB_NAME || 'acesso_usuarios_db',
  });
  
  try {
    const app = await NestFactory.create(TestModule);
    console.log('✅ NestJS + TypeORM conectado com sucesso!');
    await app.close();
  } catch (error) {
    console.error('❌ Erro NestJS:', error.message);
  }
}

bootstrap();
