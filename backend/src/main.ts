import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Polyfill para crypto (Node.js < 20)
if (!globalThis.crypto) {
  const { webcrypto } = require('node:crypto');
  globalThis.crypto = webcrypto;
}

async function bootstrap() {
  dotenv.config();

  let app;
  
  try {
    app = await NestFactory.create(AppModule, {
      bodyParser: true,
      // ⚠️ NÃO ABORTAR SE DATABASE FALHAR
      abortOnError: false,
    });
  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao criar aplicação:', error.message);
    console.log('⚠️ Tentando iniciar sem conexão ao banco...');
    
    // Tentar criar app mesmo sem DB
    try {
      app = await NestFactory.create(AppModule, {
        bodyParser: true,
        abortOnError: false,
      });
    } catch (retryError) {
      console.error('❌ FALHA TOTAL ao criar aplicação:', retryError.message);
      process.exit(1);
    }
  }

  // ========== HANDLERS PARA EVITAR CRASH ==========
  process.on('unhandledRejection', (reason: any, promise) => {
    console.error('❌ Unhandled Rejection:', reason?.message || reason);
    console.error('Stack:', reason?.stack);
    // NÃO SAIR - continuar rodando
  });

  process.on('uncaughtException', (error: Error) => {
    console.error('❌ Uncaught Exception:', error.message);
    console.error('Stack:', error.stack);
    // NÃO SAIR - continuar rodando
  });

  // Aumentar limite de tamanho do body para 10MB (para upload de imagens)
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

  app.use(cookieParser());

  // Filtro global para evitar crashes
  app.useGlobalFilters(new GlobalExceptionFilter());

  // ========== INTERCEPTOR DE TIMEOUT ==========
  const { TimeoutInterceptor } = require('./common/interceptors/timeout.interceptor');
  app.useGlobalInterceptors(new TimeoutInterceptor());

  // Configuração CORS para produção - Vercel + Domínio customizado
  const allowedOrigins = [
    'https://rykon-check-belt.vercel.app',
    'https://teamcruz.rykonfit.com.br',
    'http://teamcruz.rykonfit.com.br',
    'https://api.rykonfit.com.br',
    'http://localhost:3000', // Desenvolvimento local frontend
    'http://localhost:3001', // Desenvolvimento local frontend alternativo
    'http://localhost:4000', // Desenvolvimento local backend
    'http://127.0.0.1:3000', // Desenvolvimento local frontend
    'http://127.0.0.1:4000', // Desenvolvimento local backend
    process.env.CORS_ORIGIN,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (mobile apps, Postman, etc)
      if (!origin) {
        return callback(null, true);
      }

      // Verifica se a origin está na lista permitida ou é do Vercel
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        console.error('CORS bloqueado:', origin);
        console.error('   Origens permitidas:', allowedOrigins);
        // Em desenvolvimento, permite mesmo assim com warning
        if (process.env.NODE_ENV === 'development') {
          console.warn('MODO DESENVOLVIMENTO: Permitindo origin não listada');
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Swagger - Configurar ANTES do prefixo global
  const config = new DocumentBuilder()
    .setTitle('🥋 TeamCruz API - Sistema de Gestão')
    .setDescription(
      `
      ## Sistema Completo de Gestão para Academias de Jiu-Jitsu

      Esta API oferece funcionalidades completas para:
      - 🔐 **Autenticação**: Login, registro e gestão de usuários
      - 👥 **Gestão de Pessoas**: Alunos, professores e funcionários
      - 🏢 **Unidades**: Controle de academias e franquias
      - 🎓 **Graduação**: Sistema de faixas e progressão
      - 📍 **Endereços**: Gestão completa de localização
      - 📊 **Relatórios**: Dashboards e estatísticas

      ### 🚀 Como usar a autenticação JWT:

      **PASSO 1:** Obtenha o token JWT
      1. Vá para a seção **"🔐 Auth"** → **POST /auth/login**
      2. Clique em **"Try it out"**
      3. Use as credenciais de teste (veja abaixo)
      4. Clique em **"Execute"**
      5. **Copie o access_token** da resposta

      **PASSO 2:** Autorize no Swagger
      1. Clique no botão **"Authorize" 🔒** no topo da página
      2. **Cole o token** no campo JWT-auth
      3. Pode colar direto ou com "Bearer " na frente
      4. Clique em **"Authorize"**
      5. **Pronto!** Agora pode testar todos endpoints protegidos 🎉

      ### 👤 Credenciais de teste:

      **Admin Master - Acesso total:**
      - Email: admin@teamcruz.com
      - Password: 123456

      **Franqueado - Gestão de unidades:**
      - Email: franqueado@test.com
      - Password: 123456

      **Aluno - Acesso limitado:**
      - Email: aluno@test.com
      - Password: 123456

      ### 💡 Dicas importantes:
      - ✅ **Token expira em 24h** - refaça login se necessário
      - ✅ **Endpoints com 🔒 precisam de autenticação**
      - ✅ **Use "Try it out"** para testar diretamente
      - ✅ **Respostas em JSON** com códigos HTTP padronizados
    `,
    )
    .setVersion('1.0.0')
    .setContact(
      'Team Cruz Development',
      'https://teamcruz.com.br',
      'dev@teamcruz.com.br',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:4000', 'Ambiente de Desenvolvimento Local')
    .addServer('https://api.teamcruz.com.br', 'Ambiente de Produção')

    // Configuração de Autenticação JWT
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Insira o token JWT no formato: Bearer {token}',
        in: 'header',
      },
      'JWT-auth', // Nome de referência para usar nos controllers
    )

    // Configuração de Cookie Authentication (para refresh token)
    .addCookieAuth('rt', {
      type: 'apiKey',
      in: 'cookie',
      name: 'rt',
      description: 'Refresh token via cookie httpOnly',
    })

    // Tags organizadas
    .addTag('🔐 Auth', 'Autenticação, login, registro e gestão de sessões')
    .addTag('👥 Usuários', 'CRUD de usuários e permissões do sistema')
    .addTag('🎓 Alunos', 'Gestão completa de alunos e matrículas')
    .addTag('👨‍🏫 Professores', 'Gestão de professores e instrutores')
    .addTag('🏢 Unidades', 'Academias, filiais e infraestrutura')
    .addTag('🏪 Franqueados', 'Gestão de franquias e parcerias')
    .addTag('🥋 Graduação', 'Sistema de faixas, graus e progressão')
    .addTag('📍 Endereços', 'Gestão de endereços e localização')
    .addTag('📊 Relatórios', 'Dashboards, estatísticas e analytics')
    .addTag('🎯 Presença', 'Controle de frequência e check-in')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Configurações avançadas do Swagger UI
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Mantém token entre recarregamentos
      docExpansion: 'none', // Colapsa todas as seções por padrão
      filter: true, // Habilita filtro de busca
      showRequestDuration: true, // Mostra tempo de resposta
      tryItOutEnabled: true, // Habilita "Try it out" por padrão
      requestInterceptor: (req) => {
        // Log das requisições para debug
        return req;
      },
      responseInterceptor: (res) => {
        // Log das respostas para debug
        return res;
      },
    },
    customSiteTitle: '🥋 TeamCruz API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #1f2937; }
      .swagger-ui .scheme-container {
        background: #f3f4f6;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 20px;
      }
      .swagger-ui .auth-container .auth-btn-wrapper { margin-bottom: 10px; }
      .swagger-ui .btn.authorize {
        background: #059669;
        border-color: #059669;
        color: white;
        font-weight: bold;
      }
      .swagger-ui .btn.authorize:hover {
        background: #047857;
        border-color: #047857;
      }
    `,
  });

  // Health endpoint for Railway (before global prefix)
  const router = app.getHttpAdapter().getInstance();
  router.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'teamcruz-backend',
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Adiciona prefixo global /api
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 8080;
  const server = await app.listen(port, '0.0.0.0');
  
  // CONFIGURAÇÕES DE TIMEOUT PARA EVITAR TRAVAMENTOS
  server.timeout = 60000;        // 60 segundos timeout geral
  server.keepAliveTimeout = 65000; // Keep-alive timeout  
  server.headersTimeout = 66000;   // Headers timeout

  console.log(`🚀 Aplicação rodando na porta ${port}`);
  console.log(`📖 Swagger disponível em: http://localhost:${port}/api/docs`);
  console.log(`❤️ Health check: http://localhost:${port}/health`);
  console.log(`⏰ Timeout configurado: 60s`);
}
bootstrap();
