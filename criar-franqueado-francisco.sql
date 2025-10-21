-- Criar/Verificar Franqueado para o usuário Francisco
-- Email do USUÁRIO: francisco@gmail.com
-- Usuario ID: 3234f80a-2c1b-47da-91cf-52239bfd8122

-- 1. Verificar se já existe franqueado vinculado a este usuário
SELECT * FROM teamcruz.franqueados WHERE usuario_id = '3234f80a-2c1b-47da-91cf-52239bfd8122';

-- 2. Se não existir, criar:
-- IMPORTANTE: O email aqui é o EMAIL DA FRANQUIA (institucional), não do usuário!
INSERT INTO teamcruz.franqueados (
  nome,
  email,
  telefone,
  usuario_id,
  created_at,
  updated_at
) VALUES (
  'Franquia São Paulo',  -- Nome da FRANQUIA
  'contato@franquiasp.com.br',  -- Email INSTITUCIONAL da franquia
  '11960656956',
  '3234f80a-2c1b-47da-91cf-52239bfd8122',  -- ID do USUÁRIO DONO
  NOW(),
  NOW()
) RETURNING *;

-- 3. Verificar o ID gerado
SELECT id, nome, email, usuario_id FROM teamcruz.franqueados
WHERE usuario_id = '3234f80a-2c1b-47da-91cf-52239bfd8122';

-- 4. AGORA precisamos vincular as unidades a este franqueado
-- Primeiro, veja quais unidades existem:
SELECT id, nome, franqueado_id FROM teamcruz.unidades ORDER BY nome;

-- 5. Atualizar as unidades que devem pertencer a este franqueado
-- SUBSTITUA os IDs abaixo pelos IDs corretos das unidades que você quer vincular:
UPDATE teamcruz.unidades
SET franqueado_id = (SELECT id FROM teamcruz.franqueados WHERE lower(email) = lower('francisco@gmail.com'))
WHERE id IN (
  -- COLE AQUI OS IDs DAS UNIDADES que pertencem ao Francisco
  -- Exemplo:
  -- '1127b98c-67a1-4c56-95f8-1a1d5fcf8c05',
  -- '4b3f5aac-fa68-4d33-b209-b3b0ac2f9dc3'
);

-- 6. Verificar se funcionou
SELECT
  u.id,
  u.nome as unidade_nome,
  f.nome as franqueado_nome,
  f.email as franqueado_email
FROM teamcruz.unidades u
LEFT JOIN teamcruz.franqueados f ON u.franqueado_id = f.id
WHERE f.email = 'francisco@gmail.com';

-- 7. Ver quantos alunos o franqueado vai poder ver
SELECT COUNT(*) as total_alunos
FROM teamcruz.alunos a
WHERE a.unidade_id IN (
  SELECT id FROM teamcruz.unidades
  WHERE franqueado_id = (
    SELECT id FROM teamcruz.franqueados
    WHERE lower(email) = lower('francisco@gmail.com')
  )
);
