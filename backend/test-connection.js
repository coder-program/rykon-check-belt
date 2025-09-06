const { DataSource } = require('typeorm');
require('dotenv').config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'acesso_usuarios_db',
  synchronize: false,
  ssl: false,
  entities: [],
});

async function testConnection() {
  try {
    console.log('🔧 Configuração:', {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS ? '***' : 'default',
      database: process.env.DB_NAME || 'acesso_usuarios_db',
    });

    console.log('🚀 Tentando conectar...');
    await dataSource.initialize();
    console.log('✅ TypeORM conectado com sucesso!');

    const result = await dataSource.query('SELECT COUNT(*) FROM usuarios');
    console.log('📊 Usuários no banco:', result[0].count);

    await dataSource.destroy();
    console.log('🔚 Conexão fechada.');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

testConnection();
