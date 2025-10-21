-- Executar migração das colunas de aprovação
\c teamcruz;

-- Adicionar colunas de aprovação na tabela alunos
ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS status_aprovacao VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status_aprovacao IN ('PENDENTE', 'APROVADO', 'REJEITADO'));

ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS aprovado_por_id UUID REFERENCES teamcruz.usuarios(id);

ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP;

ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS observacao_aprovacao TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_alunos_status_unidade
ON teamcruz.alunos(unidade_id, status_aprovacao)
WHERE status_aprovacao = 'PENDENTE';

SELECT 'Colunas adicionadas com sucesso!' AS resultado;
