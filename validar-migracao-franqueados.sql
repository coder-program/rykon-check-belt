-- =============================================
-- SCRIPT DE VALIDAÇÃO PÓS-MIGRAÇÃO
-- Data: 2025-11-02
-- Descrição: Verifica se a migração foi executada corretamente
-- =============================================

-- ==============================================
-- 1. VERIFICAR ESTRUTURA DA TABELA
-- ==============================================
SELECT
    column_name,
    data_type,
    is_nullable,
    character_maximum_length,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'franqueados'
ORDER BY ordinal_position;

-- ==============================================
-- 2. VERIFICAR ÍNDICES CRIADOS
-- ==============================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'teamcruz'
  AND tablename = 'franqueados'
ORDER BY indexname;

-- ==============================================
-- 3. VERIFICAR CONSTRAINTS
-- ==============================================
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'teamcruz.franqueados'::regclass
ORDER BY conname;

-- ==============================================
-- 4. VERIFICAR FOREIGN KEYS
-- ==============================================
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'teamcruz'
  AND tc.table_name = 'franqueados';

-- ==============================================
-- 5. VERIFICAR DADOS EXISTENTES
-- ==============================================
-- Contar registros
SELECT
    COUNT(*) as total_franqueados,
    COUNT(CASE WHEN cpf IS NOT NULL THEN 1 END) as com_cpf,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as com_email,
    COUNT(CASE WHEN telefone IS NOT NULL THEN 1 END) as com_telefone,
    COUNT(CASE WHEN usuario_id IS NOT NULL THEN 1 END) as com_usuario_vinculado
FROM teamcruz.franqueados;

-- Verificar situações
SELECT
    situacao,
    COUNT(*) as quantidade
FROM teamcruz.franqueados
GROUP BY situacao
ORDER BY situacao;

-- Verificar registros com problemas
SELECT
    id,
    nome,
    cpf,
    email,
    telefone,
    situacao,
    ativo
FROM teamcruz.franqueados
WHERE cpf IS NULL
   OR email IS NULL
   OR telefone IS NULL
   OR cpf = ''
   OR email = ''
   OR telefone = ''
LIMIT 10;

-- ==============================================
-- 6. VERIFICAR INTEGRIDADE REFERENCIAL
-- ==============================================
-- Franqueados com usuario_id inválido
SELECT
    f.id,
    f.nome,
    f.usuario_id,
    'Usuario não encontrado' as problema
FROM teamcruz.franqueados f
LEFT JOIN teamcruz.usuarios u ON f.usuario_id = u.id
WHERE f.usuario_id IS NOT NULL
  AND u.id IS NULL;

-- Franqueados com endereco_id inválido
SELECT
    f.id,
    f.nome,
    f.endereco_id,
    'Endereco não encontrado' as problema
FROM teamcruz.franqueados f
LEFT JOIN teamcruz.enderecos e ON f.endereco_id = e.id
WHERE f.endereco_id IS NOT NULL
  AND e.id IS NULL;

-- ==============================================
-- 7. TESTAR INSERÇÃO DE NOVO REGISTRO
-- ==============================================
-- Teste de inserção (será feito rollback)
BEGIN;

INSERT INTO teamcruz.franqueados (
    nome,
    cpf,
    email,
    telefone,
    situacao,
    ativo
) VALUES (
    'Teste Migração',
    '12345678901',
    'teste@migração.com',
    '11999888777',
    'EM_HOMOLOGACAO',
    true
);

SELECT 'Inserção de teste: SUCESSO' as resultado;

ROLLBACK; -- Desfaz o teste

-- ==============================================
-- RESULTADO ESPERADO
-- ==============================================
/*
ESTRUTURA FINAL ESPERADA:

COLUNAS (12 no total):
1. id - UUID, PK
2. usuario_id - UUID, nullable, FK
3. nome - VARCHAR(150), NOT NULL
4. cpf - VARCHAR(14), NOT NULL, UNIQUE
5. email - VARCHAR(120), NOT NULL
6. telefone - VARCHAR(20), NOT NULL
7. endereco_id - UUID, nullable, FK
8. unidades_gerencia - TEXT[], nullable
9. situacao - ENUM, NOT NULL, default 'EM_HOMOLOGACAO'
10. ativo - BOOLEAN, NOT NULL, default true
11. created_at - TIMESTAMP, NOT NULL
12. updated_at - TIMESTAMP, NOT NULL

ÍNDICES:
- PK: franqueados_pkey
- UNIQUE: uk_franqueados_cpf
- INDEX: idx_franqueados_cpf
- INDEX: idx_franqueados_email
- INDEX: idx_franqueados_usuario_id
- INDEX: idx_franqueados_situacao
- INDEX: idx_franqueados_ativo

FOREIGN KEYS:
- fk_franqueados_usuario (usuario_id -> usuarios.id)
- fk_franqueados_endereco (endereco_id -> enderecos.id)

COLUNAS REMOVIDAS (23 campos):
- cnpj, razao_social, nome_fantasia
- inscricao_estadual, inscricao_municipal
- telefone_fixo, telefone_celular
- website, redes_sociais
- responsavel_nome, responsavel_cpf, responsavel_cargo
- responsavel_email, responsavel_telefone
- ano_fundacao, missao, visao, valores, historico
- logotipo_url, id_matriz
- data_contrato, taxa_franquia, dados_bancarios
*/