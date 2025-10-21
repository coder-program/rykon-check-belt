-- ========================================================================
-- SCRIPT PARA LIMPAR CPFS E TELEFONES FORMATADOS
-- Remove pontos, traços, parênteses e espaços
-- ========================================================================

BEGIN;

-- 1. LIMPAR CPFs NA TABELA USUARIOS
-- ========================================================================
UPDATE teamcruz.usuarios
SET cpf = REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL
  AND cpf ~ '[^0-9]'; -- Só atualiza se tiver caracteres não numéricos

-- 2. LIMPAR TELEFONES NA TABELA USUARIOS
-- ========================================================================
UPDATE teamcruz.usuarios
SET telefone = REGEXP_REPLACE(telefone, '[^0-9]', '', 'g')
WHERE telefone IS NOT NULL
  AND telefone ~ '[^0-9]'; -- Só atualiza se tiver caracteres não numéricos

-- 3. LIMPAR CPFs NA TABELA PROFESSORES
-- ========================================================================
UPDATE teamcruz.professores
SET cpf = REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL
  AND cpf ~ '[^0-9]';

-- 4. LIMPAR TELEFONES NA TABELA PROFESSORES
-- ========================================================================
UPDATE teamcruz.professores
SET telefone_whatsapp = REGEXP_REPLACE(telefone_whatsapp, '[^0-9]', '', 'g')
WHERE telefone_whatsapp IS NOT NULL
  AND telefone_whatsapp ~ '[^0-9]';

UPDATE teamcruz.professores
SET telefone_fixo = REGEXP_REPLACE(telefone_fixo, '[^0-9]', '', 'g')
WHERE telefone_fixo IS NOT NULL
  AND telefone_fixo ~ '[^0-9]';

-- 5. LIMPAR CPFs NA TABELA ALUNOS
-- ========================================================================
UPDATE teamcruz.alunos
SET cpf = REGEXP_REPLACE(cpf, '[^0-9]', '', 'g')
WHERE cpf IS NOT NULL
  AND cpf ~ '[^0-9]';

-- 6. LIMPAR TELEFONES NA TABELA ALUNOS
-- ========================================================================
UPDATE teamcruz.alunos
SET telefone_whatsapp = REGEXP_REPLACE(telefone_whatsapp, '[^0-9]', '', 'g')
WHERE telefone_whatsapp IS NOT NULL
  AND telefone_whatsapp ~ '[^0-9]';

UPDATE teamcruz.alunos
SET telefone_fixo = REGEXP_REPLACE(telefone_fixo, '[^0-9]', '', 'g')
WHERE telefone_fixo IS NOT NULL
  AND telefone_fixo ~ '[^0-9]';

-- 7. LIMPAR responsavel_cpf NA TABELA UNIDADES
-- ========================================================================
UPDATE teamcruz.unidades
SET responsavel_cpf = REGEXP_REPLACE(responsavel_cpf, '[^0-9]', '', 'g')
WHERE responsavel_cpf IS NOT NULL
  AND responsavel_cpf ~ '[^0-9]';

-- 8. VERIFICAR RESULTADOS
-- ========================================================================
SELECT 'USUARIOS' as tabela, COUNT(*) as total_limpos
FROM teamcruz.usuarios
WHERE cpf IS NOT NULL OR telefone IS NOT NULL

UNION ALL

SELECT 'PROFESSORES' as tabela, COUNT(*) as total_limpos
FROM teamcruz.professores
WHERE cpf IS NOT NULL OR telefone_whatsapp IS NOT NULL

UNION ALL

SELECT 'ALUNOS' as tabela, COUNT(*) as total_limpos
FROM teamcruz.alunos
WHERE cpf IS NOT NULL OR telefone_whatsapp IS NOT NULL

UNION ALL

SELECT 'UNIDADES' as tabela, COUNT(*) as total_limpos
FROM teamcruz.unidades
WHERE responsavel_cpf IS NOT NULL;

-- Mostrar alguns exemplos
SELECT
    'USUARIOS' as tabela,
    username,
    cpf,
    telefone
FROM teamcruz.usuarios
WHERE cpf IS NOT NULL
LIMIT 5;

COMMIT;

-- ========================================================================
-- INFORMAÇÕES
-- ========================================================================
--
-- Este script remove TODA formatação de CPFs e telefones:
-- - Remove pontos (.)
-- - Remove traços (-)
-- - Remove parênteses ()
-- - Remove espaços
--
-- Exemplo:
-- ANTES: "123.456.789-00"
-- DEPOIS: "12345678900"
--
-- ANTES: "(11) 99999-9999"
-- DEPOIS: "11999999999"
--
-- ========================================================================
