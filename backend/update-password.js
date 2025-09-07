const { DataSource } = require('typeorm');
const bcrypt = require('bcrypt');

async function updatePassword() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5436,
    username: 'teamcruz_admin',
    password: 'cruz@jiujitsu2024',
    database: 'teamcruz_db',
  });

  await dataSource.initialize();
  const newHash = bcrypt.hashSync('admin123', 10);
  console.log('Novo hash:', newHash);

  await dataSource.query(
    'UPDATE teamcruz.usuarios SET password = $1 WHERE email = $2',
    [newHash, 'admin@teamcruz.com'],
  );
  console.log('✅ Senha atualizada com sucesso!');

  await dataSource.destroy();
}

updatePassword().catch(console.error);
