-- ==================================================================
-- MIGRAÇÃO: Modalidades para Many-to-Many com Unidades
-- ==================================================================
-- Este script ATUALIZA a estrutura existente de modalidades
-- para suportar:
-- 1. Modalidades específicas por unidade
-- 2. Aluno pode ter MÚLTIPLAS modalidades (Many-to-Many)
-- ==================================================================

-- ==================================================================
-- PASSO 1: BACKUP DOS DADOS EXISTENTES
-- ==================================================================

-- Criar tabela temporária com dados atuais
CREATE TEMP TABLE temp_modalidades_backup AS
SELECT * FROM teamcruz.modalidades;

-- Criar tabela temporária para alunos com modalidade antiga
CREATE TEMP TABLE temp_alunos_modalidade_backup AS
SELECT id AS aluno_id, modalidade_id
FROM teamcruz.alunos
WHERE modalidade_id IS NOT NULL;

-- ==================================================================
-- PASSO 2: REMOVER CONSTRAINTS E CAMPO ANTIGO DE ALUNOS
-- ==================================================================

-- Remover FK de alunos.modalidade_id (se existir)
ALTER TABLE teamcruz.alunos
DROP CONSTRAINT IF EXISTS fk_alunos_modalidade;

-- Remover coluna modalidade_id de alunos
ALTER TABLE teamcruz.alunos
DROP COLUMN IF EXISTS modalidade_id;

-- ==================================================================
-- PASSO 3: ATUALIZAR ESTRUTURA DA TABELA MODALIDADES
-- ==================================================================

-- Remover constraint unique antiga (nome global)
ALTER TABLE teamcruz.modalidades
DROP CONSTRAINT IF EXISTS modalidades_nome_key;

-- Adicionar coluna unidade_id
ALTER TABLE teamcruz.modalidades
ADD COLUMN IF NOT EXISTS unidade_id UUID;

-- Tornar valor_mensalidade obrigatório
ALTER TABLE teamcruz.modalidades
ALTER COLUMN valor_mensalidade SET NOT NULL;

-- Adicionar cor padrão se não tiver
ALTER TABLE teamcruz.modalidades
ALTER COLUMN cor SET DEFAULT '#1E3A8A';

-- Atualizar modalidades existentes com a primeira unidade do sistema
-- (você pode ajustar isso depois manualmente)
UPDATE teamcruz.modalidades
SET unidade_id = (SELECT id FROM teamcruz.unidades LIMIT 1)
WHERE unidade_id IS NULL;

-- Tornar unidade_id obrigatório
ALTER TABLE teamcruz.modalidades
ALTER COLUMN unidade_id SET NOT NULL;

-- Adicionar FK para unidades
ALTER TABLE teamcruz.modalidades
ADD CONSTRAINT fk_modalidades_unidade
FOREIGN KEY (unidade_id)
REFERENCES teamcruz.unidades(id)
ON DELETE CASCADE;

-- Adicionar constraint unique (unidade_id, nome)
ALTER TABLE teamcruz.modalidades
ADD CONSTRAINT uk_modalidade_unidade_nome UNIQUE (unidade_id, nome);

-- Adicionar índice em unidade_id
CREATE INDEX IF NOT EXISTS idx_modalidades_unidade ON teamcruz.modalidades(unidade_id);

-- ==================================================================
-- PASSO 4: CRIAR TABELA ALUNO_MODALIDADES (MANY-TO-MANY)
-- ==================================================================

CREATE TABLE IF NOT EXISTS teamcruz.aluno_modalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL,
  modalidade_id UUID NOT NULL,
  data_matricula TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valor_praticado DECIMAL(10, 2), -- Valor específico (pode ter desconto)
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Um aluno não pode estar matriculado 2x na mesma modalidade
  CONSTRAINT uk_aluno_modalidade UNIQUE (aluno_id, modalidade_id)
);

-- Foreign Keys
ALTER TABLE teamcruz.aluno_modalidades
ADD CONSTRAINT fk_aluno_modalidades_aluno
FOREIGN KEY (aluno_id)
REFERENCES teamcruz.alunos(id)
ON DELETE CASCADE;

ALTER TABLE teamcruz.aluno_modalidades
ADD CONSTRAINT fk_aluno_modalidades_modalidade
FOREIGN KEY (modalidade_id)
REFERENCES teamcruz.modalidades(id)
ON DELETE CASCADE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aluno_modalidades_aluno ON teamcruz.aluno_modalidades(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_modalidades_modalidade ON teamcruz.aluno_modalidades(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_aluno_modalidades_ativo ON teamcruz.aluno_modalidades(ativo);

-- Comentários
COMMENT ON TABLE teamcruz.aluno_modalidades IS 'Relacionamento many-to-many entre alunos e modalidades';
COMMENT ON COLUMN teamcruz.aluno_modalidades.valor_praticado IS 'Valor específico desta modalidade para este aluno (pode ter desconto/promoção)';
COMMENT ON COLUMN teamcruz.aluno_modalidades.ativo IS 'Se a matrícula nesta modalidade está ativa (aluno pode pausar uma modalidade sem sair do sistema)';

-- ==================================================================
-- PASSO 5: MIGRAR DADOS ANTIGOS PARA NOVO FORMATO
-- ==================================================================

-- Migrar relacionamentos antigos (aluno tinha UMA modalidade)
-- para novo formato (aluno pode ter MÚLTIPLAS modalidades)
INSERT INTO teamcruz.aluno_modalidades (aluno_id, modalidade_id, ativo)
SELECT
  aluno_id,
  modalidade_id,
  TRUE
FROM temp_alunos_modalidade_backup
WHERE EXISTS (
  SELECT 1 FROM teamcruz.alunos a WHERE a.id = temp_alunos_modalidade_backup.aluno_id
)
AND EXISTS (
  SELECT 1 FROM teamcruz.modalidades m WHERE m.id = temp_alunos_modalidade_backup.modalidade_id
)
ON CONFLICT (aluno_id, modalidade_id) DO NOTHING;

-- ==================================================================
-- PASSO 6: VERIFICAÇÕES
-- ==================================================================

-- Ver modalidades por unidade
SELECT
  u.nome AS unidade,
  m.nome AS modalidade,
  m.valor_mensalidade,
  m.cor,
  COUNT(am.id) AS total_matriculas
FROM teamcruz.modalidades m
INNER JOIN teamcruz.unidades u ON m.unidade_id = u.id
LEFT JOIN teamcruz.aluno_modalidades am ON m.id = am.modalidade_id AND am.ativo = TRUE
GROUP BY u.id, u.nome, m.id, m.nome, m.valor_mensalidade, m.cor
ORDER BY u.nome, m.nome;

-- Ver alunos com suas modalidades migradas
SELECT
  a.nome AS aluno,
  STRING_AGG(m.nome, ', ') AS modalidades,
  COUNT(am.id) AS quantidade_modalidades
FROM teamcruz.alunos a
INNER JOIN teamcruz.aluno_modalidades am ON a.id = am.aluno_id
INNER JOIN teamcruz.modalidades m ON am.modalidade_id = m.id
WHERE a.ativo = TRUE AND am.ativo = TRUE
GROUP BY a.id, a.nome
ORDER BY quantidade_modalidades DESC
LIMIT 20;

-- ==================================================================
-- RESULTADO
-- ==================================================================
SELECT
  '✅ Migração concluída!' AS status,
  (SELECT COUNT(*) FROM teamcruz.modalidades) AS total_modalidades,
  (SELECT COUNT(*) FROM teamcruz.aluno_modalidades) AS total_matriculas,
  (SELECT COUNT(DISTINCT aluno_id) FROM teamcruz.aluno_modalidades WHERE ativo = TRUE) AS alunos_com_modalidade;
