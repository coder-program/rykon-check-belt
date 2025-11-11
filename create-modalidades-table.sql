-- ==================================================================
-- SISTEMA DE MODALIDADES POR UNIDADE
-- ==================================================================
-- Data: 2024
-- Objetivo: Cada unidade cadastra suas modalidades (Jiu-Jitsu, Muay Thai, etc.)
--           com valores personalizados. SEM DADOS MOCKADOS.
-- ==================================================================

-- ==================================================================
-- 1. CRIAR TABELA MODALIDADES
-- ==================================================================

CREATE TABLE IF NOT EXISTS teamcruz.modalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL, -- FK para unidades
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  valor_mensalidade DECIMAL(10, 2) NOT NULL, -- Valor da modalidade nesta unidade
  ativo BOOLEAN DEFAULT TRUE,
  cor VARCHAR(7) DEFAULT '#1E3A8A', -- Código hex para UI (#FF5733)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraint: nome único por unidade (mesma unidade não pode ter 2 "Jiu-Jitsu")
  CONSTRAINT uk_modalidade_unidade_nome UNIQUE (unidade_id, nome)
);

-- Foreign Key para unidades
ALTER TABLE teamcruz.modalidades
ADD CONSTRAINT fk_modalidades_unidade
FOREIGN KEY (unidade_id)
REFERENCES teamcruz.unidades(id)
ON DELETE CASCADE;

-- Índices
CREATE INDEX IF NOT EXISTS idx_modalidades_unidade ON teamcruz.modalidades(unidade_id);
CREATE INDEX IF NOT EXISTS idx_modalidades_ativo ON teamcruz.modalidades(ativo);
CREATE INDEX IF NOT EXISTS idx_modalidades_nome ON teamcruz.modalidades(nome);

-- Comentários
COMMENT ON TABLE teamcruz.modalidades IS 'Modalidades de artes marciais cadastradas por cada unidade';
COMMENT ON COLUMN teamcruz.modalidades.unidade_id IS 'Unidade que oferece esta modalidade';
COMMENT ON COLUMN teamcruz.modalidades.nome IS 'Nome da modalidade (ex: Jiu-Jitsu, Muay Thai)';
COMMENT ON COLUMN teamcruz.modalidades.valor_mensalidade IS 'Valor da mensalidade para esta modalidade nesta unidade';
COMMENT ON COLUMN teamcruz.modalidades.cor IS 'Cor identificadora da modalidade em formato hex (#FF5733)';

-- ==================================================================
-- 2. SEM DADOS MOCKADOS
-- ==================================================================
-- Cada unidade cadastrará suas próprias modalidades pela interface
-- Exemplo de INSERT manual (caso necessário):
--
-- INSERT INTO teamcruz.modalidades (unidade_id, nome, descricao, valor_mensalidade, cor)
-- VALUES (
--   'UUID_DA_UNIDADE',
--   'Jiu-Jitsu',
--   'Brazilian Jiu-Jitsu - Técnicas de solo',
--   250.00,
--   '#1E3A8A'
-- );

-- ==================================================================
-- 3. CRIAR TABELA ALUNO_MODALIDADES (MANY-TO-MANY)
-- ==================================================================
-- Aluno pode estar matriculado em MÚLTIPLAS modalidades!
-- Ex: João faz Jiu-Jitsu + Muay Thai = R$ 250 + R$ 220 = R$ 470/mês

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
-- 4. REMOVER CAMPO ANTIGO (SE EXISTIR)
-- ==================================================================
-- Remove o campo modalidade_id da tabela alunos (se foi criado antes)

ALTER TABLE teamcruz.alunos
DROP CONSTRAINT IF EXISTS fk_alunos_modalidade;

ALTER TABLE teamcruz.alunos
DROP COLUMN IF EXISTS modalidade_id;

-- ==================================================================
-- 5. VERIFICAÇÕES
-- ==================================================================

-- Ver modalidades criadas por unidade
SELECT
  m.id,
  u.nome AS unidade,
  m.nome AS modalidade,
  m.descricao,
  m.valor_mensalidade,
  m.ativo,
  m.cor,
  m.created_at
FROM teamcruz.modalidades m
INNER JOIN teamcruz.unidades u ON m.unidade_id = u.id
ORDER BY u.nome, m.nome;

-- Ver alunos com suas modalidades (many-to-many)
SELECT
  a.id,
  a.nome AS aluno_nome,
  STRING_AGG(m.nome, ', ') AS modalidades,
  SUM(COALESCE(am.valor_praticado, m.valor_mensalidade)) AS valor_total_mensal
FROM teamcruz.alunos a
LEFT JOIN teamcruz.aluno_modalidades am ON a.id = am.aluno_id AND am.ativo = TRUE
LEFT JOIN teamcruz.modalidades m ON am.modalidade_id = m.id
WHERE a.ativo = TRUE
GROUP BY a.id, a.nome
LIMIT 10;

-- Contar alunos por modalidade e unidade (many-to-many)
SELECT
  u.nome AS unidade,
  m.nome AS modalidade,
  m.cor,
  COUNT(DISTINCT am.aluno_id) AS total_alunos,
  m.valor_mensalidade,
  SUM(COALESCE(am.valor_praticado, m.valor_mensalidade)) AS faturamento_real
FROM teamcruz.modalidades m
INNER JOIN teamcruz.unidades u ON m.unidade_id = u.id
LEFT JOIN teamcruz.aluno_modalidades am ON m.id = am.modalidade_id AND am.ativo = TRUE
LEFT JOIN teamcruz.alunos a ON am.aluno_id = a.id AND a.ativo = TRUE
GROUP BY u.id, u.nome, m.id, m.nome, m.cor, m.valor_mensalidade
ORDER BY u.nome, total_alunos DESC;

-- ==================================================================
-- 6. QUERIES ÚTEIS PARA RELATÓRIOS
-- ==================================================================

-- Faturamento por modalidade e unidade (many-to-many)
SELECT
  u.nome AS unidade,
  m.nome AS modalidade,
  COUNT(DISTINCT am.aluno_id) AS total_alunos,
  AVG(COALESCE(am.valor_praticado, m.valor_mensalidade)) AS ticket_medio,
  SUM(COALESCE(am.valor_praticado, m.valor_mensalidade)) AS faturamento_mensal
FROM teamcruz.aluno_modalidades am
INNER JOIN teamcruz.modalidades m ON am.modalidade_id = m.id
INNER JOIN teamcruz.alunos a ON am.aluno_id = a.id
INNER JOIN teamcruz.unidades u ON a.unidade_id = u.id
WHERE a.ativo = TRUE AND am.ativo = TRUE
GROUP BY u.id, u.nome, m.id, m.nome
ORDER BY u.nome, faturamento_mensal DESC;

-- Comparar modalidades (Jiu-Jitsu vs Muay Thai)
SELECT
  m.nome AS modalidade,
  COUNT(DISTINCT am.aluno_id) AS total_alunos,
  AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.data_nascimento))) AS idade_media,
  SUM(COALESCE(am.valor_praticado, m.valor_mensalidade)) AS faturamento_total
FROM teamcruz.aluno_modalidades am
INNER JOIN teamcruz.modalidades m ON am.modalidade_id = m.id
INNER JOIN teamcruz.alunos a ON am.aluno_id = a.id
WHERE a.ativo = TRUE AND am.ativo = TRUE
  AND m.nome IN ('Jiu-Jitsu', 'Muay Thai')
GROUP BY m.nome;

-- Alunos que treinam MÚLTIPLAS modalidades
SELECT
  a.nome AS aluno,
  COUNT(am.id) AS quantidade_modalidades,
  STRING_AGG(m.nome, ' + ') AS modalidades,
  SUM(COALESCE(am.valor_praticado, m.valor_mensalidade)) AS mensalidade_total
FROM teamcruz.alunos a
INNER JOIN teamcruz.aluno_modalidades am ON a.id = am.aluno_id
INNER JOIN teamcruz.modalidades m ON am.modalidade_id = m.id
WHERE a.ativo = TRUE AND am.ativo = TRUE
GROUP BY a.id, a.nome
HAVING COUNT(am.id) > 1
ORDER BY quantidade_modalidades DESC;

-- Calcular faturamento total de um aluno específico
-- SELECT
--   a.nome,
--   STRING_AGG(m.nome, ', ') AS modalidades,
--   SUM(COALESCE(am.valor_praticado, m.valor_mensalidade)) AS total_mensal
-- FROM teamcruz.alunos a
-- INNER JOIN teamcruz.aluno_modalidades am ON a.id = am.aluno_id
-- INNER JOIN teamcruz.modalidades m ON am.modalidade_id = m.id
-- WHERE a.id = 'UUID_DO_ALUNO' AND am.ativo = TRUE
-- GROUP BY a.id, a.nome;

-- ==================================================================
-- NOTAS
-- ==================================================================
-- 1. MANY-TO-MANY: Aluno pode treinar MÚLTIPLAS modalidades simultaneamente
-- 2. Cada modalidade pertence a UMA unidade específica
-- 3. Cada unidade cadastra suas próprias modalidades e valores
-- 4. SEM DADOS MOCKADOS - tudo cadastrado pela interface
-- 5. valor_praticado permite desconto individual (ex: combo Jiu-Jitsu + Muay Thai)
-- 6. Mensalidade total do aluno = SOMA de todas suas modalidades ativas
-- 7. aluno_modalidades.ativo permite pausar uma modalidade sem deletar
-- 8. ON DELETE CASCADE - se aluno deletado, suas matrículas também são
--
-- EXEMPLOS:
-- João treina Jiu-Jitsu (R$ 250) + Muay Thai (R$ 220) = R$ 470/mês
-- Maria treina só MMA (R$ 280) = R$ 280/mês
-- Pedro treina Jiu-Jitsu + Muay Thai + MMA (R$ 750/mês)
