-- =========================================
-- VERIFICAR SE FRANQUEADOS EXISTEM
-- =========================================

-- Listar todos os franqueados
SELECT
    id,
    nome,
    cnpj,
    razao_social,
    responsavel_nome,
    situacao,
    ativo,
    created_at
FROM teamcruz.franqueados
ORDER BY nome;

-- Verificar CNPJs específicos que serão usados nas unidades
SELECT
    'TeamCruz SP' as franqueado,
    id,
    nome,
    cnpj
FROM teamcruz.franqueados
WHERE cnpj = '12.345.678/0001-90'

UNION ALL

SELECT
    'TeamCruz RJ' as franqueado,
    id,
    nome,
    cnpj
FROM teamcruz.franqueados
WHERE cnpj = '98.765.432/0001-10';

-- Se nenhum resultado aparecer acima, execute:
-- \i insert-franqueados-exemplo.sql
