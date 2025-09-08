const { Client } = require('pg');

async function checkMigrations() {
  const client = new Client({
    host: 'localhost',
    port: 5436,
    user: 'teamcruz_admin',
    password: 'cruz@jiujitsu2024',
    database: 'teamcruz_db'
  });

  try {
    await client.connect();
    console.log('📋 Verificando migrations...\n');

    // Verificar se a tabela migrations existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'migrations'
      );
    `);

    if (tableCheck.rows[0].exists) {
      const migrations = await client.query('SELECT name, timestamp FROM migrations ORDER BY id');
      
      if (migrations.rows.length > 0) {
        console.log('✅ Migrations já executadas:');
        migrations.rows.forEach(m => {
          console.log(`   - ${m.name}`);
        });
      } else {
        console.log('⚠️  Tabela migrations existe mas está vazia');
      }
    } else {
      console.log('❌ Tabela migrations não existe');
      console.log('   Execute: npm run migration:run');
    }

    // Verificar se a tabela pessoas existe
    const pessoasCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pessoas'
      );
    `);

    console.log('\n📊 Status da tabela pessoas:');
    if (pessoasCheck.rows[0].exists) {
      const count = await client.query('SELECT COUNT(*) as total FROM pessoas');
      console.log(`   ✅ Tabela existe com ${count.rows[0].total} registros`);
    } else {
      console.log('   ❌ Tabela não existe');
    }

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkMigrations();
