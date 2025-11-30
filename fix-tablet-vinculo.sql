-- ✅ FIX: Criar vínculo do tablet com a unidade

-- 1️⃣ Primeiro, vamos ver quais unidades existem para este franqueado
SELECT id, nome, franqueado_id
FROM teamcruz.unidades
WHERE franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119'
ORDER BY nome;

-- 2️⃣ Depois de identificar a unidade correta, insira o vínculo
-- SUBSTITUA 'ID_DA_UNIDADE_AQUI' pelo ID da unidade que você quer vincular o tablet

/*
INSERT INTO teamcruz.tablet_unidades (tablet_id, unidade_id, ativo, created_at, updated_at)
VALUES (
    '6caa9327-b1d8-46c6-9eb8-c91ce3489705',  -- ID do usuário tablet
    'ID_DA_UNIDADE_AQUI',                     -- ⚠️ SUBSTITUA pelo ID da unidade
    true,
    NOW(),
    NOW()
);
*/

-- 3️⃣ Verificar se o vínculo foi criado
SELECT
    tu.id,
    u.nome as tablet_nome,
    un.nome as unidade_nome,
    un.franqueado_id,
    tu.ativo
FROM teamcruz.tablet_unidades tu
JOIN teamcruz.usuarios u ON u.id = tu.tablet_id
JOIN teamcruz.unidades un ON un.id = tu.unidade_id
WHERE tu.tablet_id = '6caa9327-b1d8-46c6-9eb8-c91ce3489705';
