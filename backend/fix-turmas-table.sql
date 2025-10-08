-- Script para ajustar as tabelas turmas e aulas removendo referências de instrutor e usando apenas professor/pessoa

-- ========== AJUSTAR TABELA TURMAS ==========
-- Remover a constraint de foreign key para instrutores (se existir)
ALTER TABLE teamcruz.turmas DROP CONSTRAINT IF EXISTS turmas_instrutor_id_fkey;

-- Remover a coluna instrutor_id completamente
ALTER TABLE teamcruz.turmas DROP COLUMN IF EXISTS instrutor_id;

-- Adicionar coluna professor_id se não existir
ALTER TABLE teamcruz.turmas ADD COLUMN IF NOT EXISTS professor_id UUID;

-- Adicionar constraint de foreign key referenciando a tabela people
ALTER TABLE teamcruz.turmas
ADD CONSTRAINT turmas_professor_id_fkey
FOREIGN KEY (professor_id) REFERENCES teamcruz.people(id);

-- ========== AJUSTAR TABELA AULAS ==========
-- Remover a constraint de foreign key para instrutores na tabela aulas (se existir)
ALTER TABLE teamcruz.aulas DROP CONSTRAINT IF EXISTS aulas_instrutor_id_fkey;

-- Tornar a coluna instrutor_id nullable primeiro
ALTER TABLE teamcruz.aulas ALTER COLUMN instrutor_id DROP NOT NULL;

-- Remover a coluna instrutor_id completamente
ALTER TABLE teamcruz.aulas DROP COLUMN IF EXISTS instrutor_id;

-- A coluna professor_id já existe na entidade Aula, então não precisa adicionar

-- ========== VERIFICAÇÕES ==========
-- Verificar a estrutura final da tabela turmas
SELECT 'TURMAS' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
AND table_name = 'turmas'
ORDER BY ordinal_position;

-- Verificar a estrutura final da tabela aulas
SELECT 'AULAS' as tabela, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
AND table_name = 'aulas'
ORDER BY ordinal_position;