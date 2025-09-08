const { Client } = require('pg');
const fs = require('fs');

async function setupDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5436,
    user: 'teamcruz_admin',
    password: 'cruz@jiujitsu2024',
    database: 'teamcruz_db'
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();

    // Ler o arquivo SQL
    const sql = fs.readFileSync('create-pessoas-table.sql', 'utf8');

    console.log('📝 Executando script SQL...');
    await client.query(sql);

    console.log('✅ Tabela pessoas criada com sucesso!');

    // Verificar se foi criada
    const result = await client.query(`
      SELECT COUNT(*) as total, tipo_cadastro 
      FROM pessoas 
      GROUP BY tipo_cadastro
    `);

    console.log('\n📊 Dados inseridos:');
    result.rows.forEach(row => {
      console.log(`   - ${row.tipo_cadastro}: ${row.total} registro(s)`);
    });

    // Mostrar alguns registros
    const pessoas = await client.query('SELECT nome_completo, tipo_cadastro, cpf FROM pessoas LIMIT 5');
    console.log('\n👥 Pessoas cadastradas:');
    pessoas.rows.forEach(p => {
      console.log(`   - ${p.nome_completo} (${p.tipo_cadastro}) - CPF: ${p.cpf}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🎉 Setup concluído!');
  }
}

setupDatabase();
