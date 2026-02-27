-- =========================================================
--  MIGRAÇÃO: Sistema Multi-Modalidades
--  Descrição: Cria as tabelas para suporte a múltiplas
--             modalidades esportivas paralelas ao BJJ
-- =========================================================

-- 1. Tabela: modalidade_niveis
--    Níveis/graduações definidos por modalidade (ex: Nível 1, 2, 3 do Muay Thai)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS teamcruz.modalidade_niveis (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  modalidade_id UUID NOT NULL REFERENCES teamcruz.modalidades(id) ON DELETE CASCADE,
  nome          VARCHAR(100) NOT NULL,
  ordem         INT DEFAULT 0 NOT NULL,
  cor_hex       VARCHAR(7) NULL,
  descricao     TEXT NULL,
  ativo         BOOLEAN DEFAULT TRUE NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_modalidade_niveis_modalidade ON teamcruz.modalidade_niveis(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_modalidade_niveis_ordem ON teamcruz.modalidade_niveis(modalidade_id, ordem);

COMMENT ON TABLE teamcruz.modalidade_niveis IS
  'Níveis/graduações definidos para cada modalidade. Usados quando tipo_graduacao != NENHUM.';


-- 2. Tabela: aluno_modalidade_graduacao
--    Graduação atual de cada aluno em cada modalidade
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS teamcruz.aluno_modalidade_graduacao (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id            UUID NOT NULL REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
  modalidade_id       UUID NOT NULL REFERENCES teamcruz.modalidades(id) ON DELETE CASCADE,
  nivel_id            UUID NULL REFERENCES teamcruz.modalidade_niveis(id) ON DELETE SET NULL,
  graus               INT DEFAULT 0 NOT NULL,
  dt_ultima_graduacao TIMESTAMP NULL,
  ativo               BOOLEAN DEFAULT TRUE NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  CONSTRAINT uq_aluno_modalidade_graduacao UNIQUE (aluno_id, modalidade_id)
);

CREATE INDEX IF NOT EXISTS idx_aluno_mod_grad_aluno ON teamcruz.aluno_modalidade_graduacao(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_mod_grad_modalidade ON teamcruz.aluno_modalidade_graduacao(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_aluno_mod_grad_ativo ON teamcruz.aluno_modalidade_graduacao(ativo);

COMMENT ON TABLE teamcruz.aluno_modalidade_graduacao IS
  'Graduação atual de cada aluno em cada modalidade com tipo_graduacao != NENHUM.';


-- 3. Tabela: aluno_modalidade_graduacao_historico
--    Histórico de todas as graduações realizadas
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS teamcruz.aluno_modalidade_graduacao_historico (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  aluno_id      UUID NOT NULL REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
  modalidade_id UUID NOT NULL REFERENCES teamcruz.modalidades(id) ON DELETE CASCADE,
  nivel_id      UUID NULL REFERENCES teamcruz.modalidade_niveis(id) ON DELETE SET NULL,
  graus         INT DEFAULT 0 NOT NULL,
  dt_graduacao  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observacao    TEXT NULL,
  graduado_por  UUID NULL,   -- UUID do usuário que registrou (sem FK para evitar problemas)
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aluno_mod_grad_hist_aluno ON teamcruz.aluno_modalidade_graduacao_historico(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_mod_grad_hist_mod ON teamcruz.aluno_modalidade_graduacao_historico(modalidade_id);
CREATE INDEX IF NOT EXISTS idx_aluno_mod_grad_hist_dt ON teamcruz.aluno_modalidade_graduacao_historico(dt_graduacao DESC);

COMMENT ON TABLE teamcruz.aluno_modalidade_graduacao_historico IS
  'Histórico de todas as graduações realizadas em modalidades não-BJJ.';


-- 4. Verificação: garantir que aluno_modalidades tem coluna valor_praticado
--    (criada nas sessões anteriores; idempotente)
-- ---------------------------------------------------------
ALTER TABLE teamcruz.aluno_modalidades
  ADD COLUMN IF NOT EXISTS valor_praticado NUMERIC(10,2) NULL;

COMMENT ON COLUMN teamcruz.aluno_modalidades.valor_praticado IS
  'Valor mensal praticado para este aluno nesta modalidade (NULL = usar valor padrão da modalidade)';


-- 5. Verificar que modalidades tem colunas tipo_graduacao e icone
--    (adicionadas nas sessões anteriores; idempotente)
-- ---------------------------------------------------------
ALTER TABLE teamcruz.modalidades
  ADD COLUMN IF NOT EXISTS tipo_graduacao VARCHAR(20) DEFAULT 'NENHUM' NOT NULL,
  ADD COLUMN IF NOT EXISTS icone VARCHAR(50) NULL;

COMMENT ON COLUMN teamcruz.modalidades.tipo_graduacao IS
  'Sistema de graduação: NENHUM | FAIXA | GRAU | KYU_DAN | CORDAO | LIVRE';
COMMENT ON COLUMN teamcruz.modalidades.icone IS
  'Índice ou nome do ícone para exibição visual da modalidade';
