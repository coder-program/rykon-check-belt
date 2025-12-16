const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'teamcruz',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados');

    // 1. Adicionar coluna duracao_dias
    console.log('Adicionando coluna duracao_dias...');
    await client.query(`
      ALTER TABLE teamcruz.planos
      ADD COLUMN IF NOT EXISTS duracao_dias INT;
    `);
    console.log('✅ Coluna duracao_dias adicionada');

    // 2. Preencher duracao_dias baseado em duracao_meses
    console.log('Preenchendo duracao_dias...');
    const updateResult = await client.query(`
      UPDATE teamcruz.planos
      SET duracao_dias = duracao_meses * 30
      WHERE duracao_dias IS NULL;
    `);
    console.log(`✅ ${updateResult.rowCount} registros atualizados`);

    // 3. Adicionar coluna max_alunos
    console.log('Adicionando coluna max_alunos...');
    await client.query(`
      ALTER TABLE teamcruz.planos
      ADD COLUMN IF NOT EXISTS max_alunos INT;
    `);
    console.log('✅ Coluna max_alunos adicionada');

    // 4. Verificar colunas
    console.log('\nVerificando colunas adicionadas:');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'teamcruz'
      AND table_name = 'planos'
      AND column_name IN ('duracao_dias', 'max_alunos')
      ORDER BY column_name;
    `);
    console.table(columns.rows);

    // 5. Ver dados de exemplo
    console.log('\nDados de exemplo:');
    const sample = await client.query(`
      SELECT id, nome, tipo, duracao_meses, duracao_dias, max_alunos
      FROM teamcruz.planos
      LIMIT 5;
    `);
    console.table(sample.rows);

  } catch (error) {
    console.error('❌ Erro na migration:', error);
  } finally {
    await client.end();
    console.log('Conexão fechada');
  }
}

runMigration();
