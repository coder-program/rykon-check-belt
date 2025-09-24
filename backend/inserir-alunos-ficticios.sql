-- Script SQL para inserir dados fictícios de alunos
-- Execute com: docker exec -i container_name psql -U user -d database < este_arquivo.sql

-- Dados fictícios de alunos para teste do sistema de check-in
INSERT INTO teamcruz.alunos (
  id, nome, cpf, telefone, email, data_nascimento, 
  faixa_atual_id, graus_atual, unidade_id, numero_matricula,
  status, consent_lgpd, data_matricula, aulas_desde_ultimo_grau,
  created_at, updated_at
) VALUES 
-- Aluno 1: João Silva Santos
(
  uuid_generate_v4(), 
  'João Silva Santos',
  '12345678901',
  '11987654321',
  'joao.silva@email.com',
  '1995-03-15',
  '27c53d94-d1e1-4cfb-bf3c-9531b1acf65e', -- Faixa Branca
  2,
  'd005d686-e975-4c68-a205-188103e48113', -- TeamCruz Matriz
  'TC00001',
  'ativo',
  true,
  CURRENT_DATE,
  15,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
-- Aluno 2: Maria Oliveira Costa
(
  uuid_generate_v4(), 
  'Maria Oliveira Costa',
  '98765432109',
  '11876543210',
  'maria.oliveira@email.com',
  '1988-07-22',
  '04accc12-33e1-400e-9081-3f26fa88e5a5', -- Faixa Cinza
  1,
  'd005d686-e975-4c68-a205-188103e48113', -- TeamCruz Matriz
  'TC00002',
  'ativo',
  true,
  CURRENT_DATE,
  8,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
-- Aluno 3: Pedro Rodrigues Lima
(
  uuid_generate_v4(), 
  'Pedro Rodrigues Lima',
  '45678912345',
  '11765432109',
  'pedro.lima@email.com',
  '1992-11-08',
  '27c53d94-d1e1-4cfb-bf3c-9531b1acf65e', -- Faixa Branca
  3,
  'd005d686-e975-4c68-a205-188103e48113', -- TeamCruz Matriz
  'TC00003',
  'ativo',
  true,
  CURRENT_DATE,
  22,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
-- Aluno 4: Ana Paula Ferreira
(
  uuid_generate_v4(), 
  'Ana Paula Ferreira',
  '78912345678',
  '11654321098',
  'ana.ferreira@email.com',
  '1985-01-30',
  'de884888-5b08-488e-b36e-2bf4c33d3c04', -- Faixa Amarela
  0,
  'd005d686-e975-4c68-a205-188103e48113', -- TeamCruz Matriz
  'TC00004',
  'ativo',
  true,
  CURRENT_DATE,
  5,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
-- Aluno 5: Carlos Eduardo Souza
(
  uuid_generate_v4(), 
  'Carlos Eduardo Souza',
  '32165498765',
  '11543210987',
  'carlos.souza@email.com',
  '1990-09-12',
  '27c53d94-d1e1-4cfb-bf3c-9531b1acf65e', -- Faixa Branca
  4,
  'd005d686-e975-4c68-a205-188103e48113', -- TeamCruz Matriz
  'TC00005',
  'ativo',
  true,
  CURRENT_DATE,
  35,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
-- Aluno 6: Lucia Fernandes
(
  uuid_generate_v4(), 
  'Lucia Fernandes',
  '65432178901',
  '11432109876',
  'lucia.fernandes@email.com',
  '1993-05-18',
  '04accc12-33e1-400e-9081-3f26fa88e5a5', -- Faixa Cinza
  2,
  'd005d686-e975-4c68-a205-188103e48113', -- TeamCruz Matriz
  'TC00006',
  'ativo',
  true,
  CURRENT_DATE,
  12,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
-- Aluno 7: Roberto Alves
(
  uuid_generate_v4(), 
  'Roberto Alves',
  '14725836901',
  '11321098765',
  'roberto.alves@email.com',
  '1987-12-03',
  '27c53d94-d1e1-4cfb-bf3c-9531b1acf65e', -- Faixa Branca
  1,
  'd005d686-e975-4c68-a205-188103e48113', -- TeamCruz Matriz
  'TC00007',
  'ativo',
  true,
  CURRENT_DATE,
  7,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
-- Aluno 8: Julia Nascimento
(
  uuid_generate_v4(), 
  'Julia Nascimento',
  '85296374185',
  '11210987654',
  'julia.nascimento@email.com',
  '1991-08-25',
  '04accc12-33e1-400e-9081-3f26fa88e5a5', -- Faixa Cinza
  3,
  'd005d686-e975-4c68-a205-188103e48113', -- TeamCruz Matriz
  'TC00008',
  'ativo',
  true,
  CURRENT_DATE,
  18,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Mostrar os alunos criados
SELECT 
  a.id,
  a.numero_matricula,
  a.nome,
  a.cpf,
  a.telefone,
  f.nome as faixa,
  a.graus_atual,
  a.aulas_desde_ultimo_grau
FROM teamcruz.alunos a
JOIN teamcruz.faixas f ON a.faixa_atual_id = f.id
WHERE a.numero_matricula LIKE 'TC%'
ORDER BY a.numero_matricula;
