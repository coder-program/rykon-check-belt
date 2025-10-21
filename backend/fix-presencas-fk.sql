-- Corrigir a foreign key da tabela presencas
-- O campo aluno_id deve referenciar a tabela alunos, não professores

-- 1. Primeiro, remover a constraint incorreta
ALTER TABLE teamcruz.presencas 
DROP CONSTRAINT IF EXISTS fk_presencas_aluno;

-- 2. Adicionar a constraint correta apontando para a tabela alunos
ALTER TABLE teamcruz.presencas 
ADD CONSTRAINT fk_presencas_aluno 
FOREIGN KEY (aluno_id) 
REFERENCES teamcruz.alunos(id) 
ON DELETE CASCADE;

-- 3. Verificar se existe alguma outra constraint relacionada
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'teamcruz'
  AND tc.table_name = 'presencas'
  AND kcu.column_name = 'aluno_id';