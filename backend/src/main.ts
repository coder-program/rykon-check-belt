import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();

  const app = await NestFactory.create(AppModule);

  // Configuração CORS para produção
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  const port = process.env.PORT || 4001;
  await app.listen(port, '0.0.0.0'); // Importante para Vercel
  console.log(`🚀 Backend rodando em http://localhost:${port}`);
}
bootstrap();
