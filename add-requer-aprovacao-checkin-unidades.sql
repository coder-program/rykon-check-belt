-- Adicionar campo para parametrizar se a unidade requer aprovação de check-ins
-- Se TRUE, todos os check-ins da unidade vão para a tela de aprovações
-- Se FALSE, os check-ins são aprovados automaticamente

ALTER TABLE teamcruz.unidades
ADD COLUMN IF NOT EXISTS requer_aprovacao_checkin BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN teamcruz.unidades.requer_aprovacao_checkin IS
'Define se os check-ins desta unidade precisam ser aprovados por gerente/recepcionista/professor.
TRUE = Check-ins vão para tela de aprovações (PENDENTE)
FALSE = Check-ins são aprovados automaticamente (APROVADO)';

-- Atualizar unidades existentes para FALSE (não requer aprovação) por padrão
UPDATE teamcruz.unidades
SET requer_aprovacao_checkin = FALSE
WHERE requer_aprovacao_checkin IS NULL;
