const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5436,
  database: 'teamcruz_db',
  user: 'teamcruz_admin',
  password: 'TeamCruz@2025!',
});

async function criarAlunosFicticios() {
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // IDs das entidades existentes
    const unidadeId = 'd005d686-e975-4c68-a205-188103e48113'; // TeamCruz Matriz
    const faixaBrancaId = '27c53d94-d1e1-4cfb-bf3c-9531b1acf65e'; // Faixa Branca
    const faixaCinzaId = '04accc12-33e1-400e-9081-3f26fa88e5a5'; // Faixa Cinza
    const faixaAmarelaId = 'de884888-5b08-488e-b36e-2bf4c33d3c04'; // Faixa Amarela

    // Dados fictícios de alunos
    const alunos = [
      {
        nome: 'João Silva Santos',
        cpf: '12345678901',
        telefone: '11987654321',
        email: 'joao.silva@email.com',
        data_nascimento: '1995-03-15',
        faixa_atual_id: faixaBrancaId,
        graus_atual: 2,
        numero_matricula: 'TC00001'
      },
      {
        nome: 'Maria Oliveira Costa',
        cpf: '98765432109',
        telefone: '11876543210',
        email: 'maria.oliveira@email.com',
        data_nascimento: '1988-07-22',
        faixa_atual_id: faixaCinzaId,
        graus_atual: 1,
        numero_matricula: 'TC00002'
      },
      {
        nome: 'Pedro Rodrigues Lima',
        cpf: '45678912345',
        telefone: '11765432109',
        email: 'pedro.lima@email.com',
        data_nascimento: '1992-11-08',
        faixa_atual_id: faixaBrancaId,
        graus_atual: 3,
        numero_matricula: 'TC00003'
      },
      {
        nome: 'Ana Paula Ferreira',
        cpf: '78912345678',
        telefone: '11654321098',
        email: 'ana.ferreira@email.com',
        data_nascimento: '1985-01-30',
        faixa_atual_id: faixaAmarelaId,
        graus_atual: 0,
        numero_matricula: 'TC00004'
      },
      {
        nome: 'Carlos Eduardo Souza',
        cpf: '32165498765',
        telefone: '11543210987',
        email: 'carlos.souza@email.com',
        data_nascimento: '1990-09-12',
        faixa_atual_id: faixaBrancaId,
        graus_atual: 4,
        numero_matricula: 'TC00005'
      },
      {
        nome: 'Lucia Fernandes',
        cpf: '65432178901',
        telefone: '11432109876',
        email: 'lucia.fernandes@email.com',
        data_nascimento: '1993-05-18',
        faixa_atual_id: faixaCinzaId,
        graus_atual: 2,
        numero_matricula: 'TC00006'
      },
      {
        nome: 'Roberto Alves',
        cpf: '14725836901',
        telefone: '11321098765',
        email: 'roberto.alves@email.com',
        data_nascimento: '1987-12-03',
        faixa_atual_id: faixaBrancaId,
        graus_atual: 1,
        numero_matricula: 'TC00007'
      },
      {
        nome: 'Julia Nascimento',
        cpf: '85296374185',
        telefone: '11210987654',
        email: 'julia.nascimento@email.com',
        data_nascimento: '1991-08-25',
        faixa_atual_id: faixaCinzaId,
        graus_atual: 3,
        numero_matricula: 'TC00008'
      }
    ];

    // Verificar se já existem alunos
    const existingCount = await client.query('SELECT COUNT(*) FROM teamcruz.alunos');
    console.log(`📊 Alunos existentes: ${existingCount.rows[0].count}`);

    if (parseInt(existingCount.rows[0].count) > 0) {
      console.log('⚠️ Já existem alunos cadastrados. Deseja continuar? (y/n)');
      // Por segurança, vamos apenas mostrar os dados que seriam inseridos
      console.log('📋 Dados que seriam inseridos:');
      alunos.forEach((aluno, index) => {
        console.log(`${index + 1}. ${aluno.nome} - CPF: ${aluno.cpf} - Tel: ${aluno.telefone}`);
      });
      return;
    }

    // Inserir cada aluno
    for (const aluno of alunos) {
      const query = `
        INSERT INTO teamcruz.alunos (
          id, nome, cpf, telefone, email, data_nascimento, 
          faixa_atual_id, graus_atual, unidade_id, numero_matricula,
          status, consent_lgpd, data_matricula, aulas_desde_ultimo_grau,
          created_at, updated_at
        ) VALUES (
          uuid_generate_v4(), $1, $2, $3, $4, $5, 
          $6, $7, $8, $9,
          'ativo', true, CURRENT_DATE, 0,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING id, nome;
      `;

      const result = await client.query(query, [
        aluno.nome,
        aluno.cpf,
        aluno.telefone,
        aluno.email,
        aluno.data_nascimento,
        aluno.faixa_atual_id,
        aluno.graus_atual,
        unidadeId,
        aluno.numero_matricula
      ]);

      console.log(`✅ Aluno criado: ${result.rows[0].nome} (ID: ${result.rows[0].id})`);
    }

    console.log('\n🎉 Dados fictícios de alunos criados com sucesso!');
    console.log('\n📋 Resumo dos alunos criados:');
    
    // Mostrar resumo
    const resumo = await client.query(`
      SELECT 
        a.id,
        a.nome,
        a.cpf,
        a.telefone,
        a.numero_matricula,
        f.nome as faixa,
        a.graus_atual
      FROM teamcruz.alunos a
      JOIN teamcruz.faixas f ON a.faixa_atual_id = f.id
      ORDER BY a.numero_matricula
    `);

    resumo.rows.forEach(aluno => {
      console.log(`📝 ${aluno.numero_matricula} - ${aluno.nome}`);
      console.log(`   📱 Tel: ${aluno.telefone} | CPF: ${aluno.cpf}`);
      console.log(`   🥋 ${aluno.faixa} ${aluno.graus_atual}º grau`);
      console.log(`   🆔 ID: ${aluno.id}`);
      console.log('');
    });

    console.log('\n🧪 Para testar o check-in, use:');
    console.log('- CPF ou telefone de qualquer aluno listado acima');
    console.log(`- ID da unidade: ${unidadeId}`);
    console.log('- Ou use diretamente o ID do aluno para QR Code');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('Código de erro:', error.code);
  } finally {
    await client.end();
  }
}

criarAlunosFicticios();
