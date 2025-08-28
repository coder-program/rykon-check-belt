const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'acesso_usuarios_db',
});

async function insertSeedData() {
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Limpar dados existentes
    await client.query('DELETE FROM perfil_permissoes');
    await client.query('DELETE FROM usuario_perfis');
    await client.query('DELETE FROM usuarios');
    await client.query('DELETE FROM permissoes');
    await client.query('DELETE FROM perfis');
    await client.query('DELETE FROM niveis_permissao');
    await client.query('DELETE FROM tipos_permissao');

    // Inserir tipos de permissão
    console.log('📝 Inserindo tipos de permissão...');
    const tiposResult = await client.query(`
      INSERT INTO tipos_permissao (codigo, nome, descricao, ordem) VALUES
      ('modulo', 'Módulo', 'Permissão de módulo completo', 1),
      ('funcionalidade', 'Funcionalidade', 'Permissão de funcionalidade específica', 2),
      ('operacao', 'Operação', 'Permissão de operação específica', 3)
      RETURNING id, codigo
    `);
    
    const tiposByCode = {};
    tiposResult.rows.forEach(row => tiposByCode[row.codigo] = row.id);
    console.log('✅ Tipos de permissão criados');

    // Inserir níveis de permissão
    console.log('📝 Inserindo níveis de permissão...');
    const niveisResult = await client.query(`
      INSERT INTO niveis_permissao (codigo, nome, descricao, ordem, cor) VALUES
      ('leitura', 'Leitura', 'Permite apenas visualizar', 1, '#28a745'),
      ('escrita', 'Escrita', 'Permite criar e editar', 2, '#ffc107'),
      ('exclusao', 'Exclusão', 'Permite deletar', 3, '#fd7e14'),
      ('administracao', 'Administração', 'Acesso administrativo completo', 4, '#dc3545')
      RETURNING id, codigo
    `);

    const niveisByCode = {};
    niveisResult.rows.forEach(row => niveisByCode[row.codigo] = row.id);
    console.log('✅ Níveis de permissão criados');

    // Inserir permissões
    console.log('📝 Inserindo permissões...');
    await client.query(`
      INSERT INTO permissoes (codigo, nome, descricao, tipo_id, nivel_id, modulo) VALUES
      ('usuarios.read', 'Visualizar Usuários', 'Permissão para visualizar usuários', $1, $2, 'usuarios'),
      ('usuarios.create', 'Criar Usuários', 'Permissão para criar usuários', $3, $4, 'usuarios'),
      ('usuarios.update', 'Atualizar Usuários', 'Permissão para atualizar usuários', $5, $6, 'usuarios'),
      ('usuarios.delete', 'Deletar Usuários', 'Permissão para deletar usuários', $7, $8, 'usuarios'),
      ('permissoes.read', 'Visualizar Permissões', 'Permissão para visualizar permissões', $9, $10, 'permissoes'),
      ('admin.all', 'Acesso Total', 'Acesso total ao sistema', $11, $12, 'sistema')
    `, [
      tiposByCode.funcionalidade, niveisByCode.leitura,
      tiposByCode.funcionalidade, niveisByCode.escrita,
      tiposByCode.operacao, niveisByCode.escrita,
      tiposByCode.operacao, niveisByCode.exclusao,
      tiposByCode.funcionalidade, niveisByCode.leitura,
      tiposByCode.modulo, niveisByCode.administracao
    ]);
    console.log('✅ Permissões criadas');

    // Criar perfis
    console.log('📝 Criando perfis...');
    const perfisResult = await client.query(`
      INSERT INTO perfis (nome, descricao) VALUES
      ('Administrador', 'Perfil com acesso total ao sistema'),
      ('Gestor', 'Perfil para gestores com acesso de leitura e escrita'),
      ('Operador', 'Perfil para operadores com acesso de leitura e algumas escritas'),
      ('Visualizador', 'Perfil somente leitura para consultas')
      RETURNING id, nome
    `);
    
    const perfisByNome = {};
    perfisResult.rows.forEach(row => perfisByNome[row.nome] = row.id);
    console.log('✅ Perfis criados');

    // Buscar permissões por código
    const permissoesResult = await client.query('SELECT id, codigo FROM permissoes');
    const permissoesByCodigo = {};
    permissoesResult.rows.forEach(row => permissoesByCodigo[row.codigo] = row.id);

    // Configurar permissões por perfil
    const perfisPermissoes = {
      'Administrador': [
        'usuarios.read', 'usuarios.create', 'usuarios.update', 'usuarios.delete',
        'permissoes.read', 'admin.all'
      ],
      'Gestor': [
        'usuarios.read', 'usuarios.create', 'usuarios.update',
        'permissoes.read'
      ],
      'Operador': [
        'usuarios.read', 'usuarios.create'
      ],
      'Visualizador': [
        'usuarios.read'
      ]
    };

    // Associar permissões aos perfis
    console.log('📝 Associando permissões aos perfis...');
    for (const [nomePeril, codigosPermissoes] of Object.entries(perfisPermissoes)) {
      const perfilId = perfisByNome[nomePeril];
      
      for (const codigoPermissao of codigosPermissoes) {
        const permissaoId = permissoesByCodigo[codigoPermissao];
        if (permissaoId) {
          await client.query(`
            INSERT INTO perfil_permissoes (perfil_id, permissao_id) VALUES ($1, $2)
          `, [perfilId, permissaoId]);
        }
      }
      console.log(`  ✅ ${nomePeril}: ${codigosPermissoes.length} permissões`);
    }

    // Criar usuários de exemplo
    console.log('📝 Criando usuários de exemplo...');
    
    const usuarios = [
      {
        username: 'admin',
        email: 'admin@sistema.com',
        password: await bcrypt.hash('admin123', 10),
        nome: 'Administrador do Sistema',
        cpf: '12345678901',
        telefone: '11999999999',
        perfil: 'Administrador'
      },
      {
        username: 'gestor',
        email: 'gestor@sistema.com', 
        password: await bcrypt.hash('gestor123', 10),
        nome: 'João Silva Gestor',
        cpf: '11111111111',
        telefone: '11988888888',
        perfil: 'Gestor'
      },
      {
        username: 'operador',
        email: 'operador@sistema.com',
        password: await bcrypt.hash('operador123', 10), 
        nome: 'Maria Santos Operadora',
        cpf: '22222222222',
        telefone: '11977777777',
        perfil: 'Operador'
      },
      {
        username: 'visualizador',
        email: 'visualizador@sistema.com',
        password: await bcrypt.hash('visual123', 10),
        nome: 'Pedro Costa Consultor',
        cpf: '33333333333', 
        telefone: '11966666666',
        perfil: 'Visualizador'
      }
    ];

    for (const userData of usuarios) {
      const usuarioResult = await client.query(`
        INSERT INTO usuarios (username, email, password, nome, cpf, telefone) VALUES
        ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [userData.username, userData.email, userData.password, userData.nome, userData.cpf, userData.telefone]);
      
      const usuarioId = usuarioResult.rows[0].id;
      const perfilId = perfisByNome[userData.perfil];

      // Associar usuário ao perfil
      await client.query(`
        INSERT INTO usuario_perfis (usuario_id, perfil_id) VALUES ($1, $2)
      `, [usuarioId, perfilId]);

      console.log(`  ✅ ${userData.username} (${userData.perfil})`);
    }

    console.log('\n🎉 Seed executado com sucesso!');
    console.log('\n📋 CREDENCIAIS DE ACESSO:');
    console.log('👤 Admin: admin / admin123');
    console.log('👤 Gestor: gestor / gestor123');
    console.log('👤 Operador: operador / operador123');
    console.log('👤 Visualizador: visualizador / visual123');
    
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
  } finally {
    await client.end();
  }
}

insertSeedData();
