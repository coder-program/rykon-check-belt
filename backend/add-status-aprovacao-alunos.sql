-- Adicionar campo status_aprovacao na tabela alunos
ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS status_aprovacao VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status_aprovacao IN ('PENDENTE', 'APROVADO', 'REJEITADO'));

-- Adicionar campos de auditoria da aprovação
ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS aprovado_por_id UUID REFERENCES teamcruz.usuarios(id);

ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP;

ALTER TABLE teamcruz.alunos
ADD COLUMN IF NOT EXISTS observacao_aprovacao TEXT;

-- Criar índice para consultas rápidas de alunos pendentes por unidade
CREATE INDEX IF NOT EXISTS idx_alunos_status_unidade
ON teamcruz.alunos(unidade_id, status_aprovacao)
WHERE status_aprovacao = 'PENDENTE';

-- Comentários
COMMENT ON COLUMN teamcruz.alunos.status_aprovacao IS 'Status da aprovação do cadastro: PENDENTE, APROVADO, REJEITADO';
COMMENT ON COLUMN teamcruz.alunos.aprovado_por_id IS 'ID do usuário (gerente/franqueado/recepcionista) que aprovou';
COMMENT ON COLUMN teamcruz.alunos.aprovado_em IS 'Data e hora da aprovação';
COMMENT ON COLUMN teamcruz.alunos.observacao_aprovacao IS 'Observação do aprovador (motivo da rejeição, etc)';
