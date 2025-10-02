-- ============================================
-- FIX GRADUAÇÃO SYSTEM
-- Ajustes no sistema de graduação para usar tabela alunos
-- e adicionar aprovação do professor
-- ============================================

-- 1. Adicionar campo aprovado e aprovado_por em aluno_graduacao
ALTER TABLE teamcruz.aluno_graduacao 
ADD COLUMN IF NOT EXISTS aprovado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS aprovado_por UUID,
ADD COLUMN IF NOT EXISTS dt_aprovacao TIMESTAMP;

-- Adicionar foreign key para aprovado_por
DO $$ BEGIN
  ALTER TABLE teamcruz.aluno_graduacao
  ADD CONSTRAINT FK_aluno_graduacao_aprovado_por
  FOREIGN KEY (aprovado_por) REFERENCES teamcruz.usuarios(id)
  ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Adicionar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_aluno_graduacao_aprovado 
ON teamcruz.aluno_graduacao(aprovado);

CREATE INDEX IF NOT EXISTS idx_aluno_graduacao_aluno_id 
ON teamcruz.aluno_graduacao(aluno_id);

CREATE INDEX IF NOT EXISTS idx_aluno_graduacao_dt_graduacao 
ON teamcruz.aluno_graduacao(dt_graduacao);

-- 3. Atualizar foreign keys para apontar para tabela alunos (se necessário)
-- NOTA: Isso só funciona se as chaves já existirem em alunos
-- Verificar primeiro se os dados estão corretos antes de executar

-- Remover foreign keys antigas se existirem
ALTER TABLE teamcruz.aluno_faixa 
DROP CONSTRAINT IF EXISTS FK_aluno_faixa_aluno;

ALTER TABLE teamcruz.aluno_graduacao 
DROP CONSTRAINT IF EXISTS FK_aluno_graduacao_aluno;

-- Adicionar novas foreign keys apontando para alunos
DO $$ BEGIN
  ALTER TABLE teamcruz.aluno_faixa
  ADD CONSTRAINT FK_aluno_faixa_aluno
  FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id)
  ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN 
    -- Se falhar, tentar com pessoas
    ALTER TABLE teamcruz.aluno_faixa
    ADD CONSTRAINT FK_aluno_faixa_aluno
    FOREIGN KEY (aluno_id) REFERENCES teamcruz.pessoas(id)
    ON DELETE CASCADE;
END $$;

DO $$ BEGIN
  ALTER TABLE teamcruz.aluno_graduacao
  ADD CONSTRAINT FK_aluno_graduacao_aluno
  FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id)
  ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN 
    -- Se falhar, tentar com pessoas
    ALTER TABLE teamcruz.aluno_graduacao
    ADD CONSTRAINT FK_aluno_graduacao_aluno
    FOREIGN KEY (aluno_id) REFERENCES teamcruz.pessoas(id)
    ON DELETE CASCADE;
END $$;

-- 4. Criar função para validar tempo mínimo na faixa
CREATE OR REPLACE FUNCTION teamcruz.validar_tempo_minimo_faixa(
  p_aluno_id UUID,
  p_faixa_atual VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_dt_inicio DATE;
  v_meses_na_faixa INT;
  v_tempo_minimo_meses INT;
BEGIN
  -- Buscar data de início da faixa atual
  SELECT dt_inicio INTO v_dt_inicio
  FROM teamcruz.aluno_faixa
  WHERE aluno_id = p_aluno_id
  AND ativa = TRUE
  LIMIT 1;

  IF v_dt_inicio IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calcular meses na faixa
  v_meses_na_faixa := EXTRACT(YEAR FROM AGE(CURRENT_DATE, v_dt_inicio)) * 12 + 
                       EXTRACT(MONTH FROM AGE(CURRENT_DATE, v_dt_inicio));

  -- Definir tempo mínimo por faixa
  v_tempo_minimo_meses := CASE 
    WHEN p_faixa_atual = 'BRANCA' THEN 12  -- 1 ano
    ELSE 24  -- 2 anos para demais faixas
  END;

  -- Retornar se cumpre o tempo mínimo
  RETURN v_meses_na_faixa >= v_tempo_minimo_meses;
END;
$$ LANGUAGE plpgsql;

-- 5. Criar view para dashboard de graduações pendentes de aprovação
CREATE OR REPLACE VIEW teamcruz.v_graduacoes_pendentes AS
SELECT 
  ag.id,
  ag.aluno_id,
  COALESCE(a.nome_completo, p.nome_completo) as aluno_nome,
  fo.nome_exibicao as faixa_origem,
  fo.cor_hex as cor_origem,
  fd.nome_exibicao as faixa_destino,
  fd.cor_hex as cor_destino,
  ag.dt_graduacao,
  ag.concedido_por,
  u.nome as professor_nome,
  ag.observacao,
  ag.aprovado,
  ag.aprovado_por,
  ag.dt_aprovacao
FROM teamcruz.aluno_graduacao ag
LEFT JOIN teamcruz.alunos a ON a.id = ag.aluno_id
LEFT JOIN teamcruz.pessoas p ON p.id = ag.aluno_id
LEFT JOIN teamcruz.faixa_def fo ON fo.id = ag.faixa_origem_id
LEFT JOIN teamcruz.faixa_def fd ON fd.id = ag.faixa_destino_id
LEFT JOIN teamcruz.usuarios u ON u.id = ag.concedido_por
WHERE ag.aprovado = FALSE
ORDER BY ag.dt_graduacao DESC;

-- 6. Criar view para histórico completo de graduações
CREATE OR REPLACE VIEW teamcruz.v_historico_graduacoes AS
SELECT 
  ag.id,
  ag.aluno_id,
  COALESCE(a.nome_completo, p.nome_completo) as aluno_nome,
  COALESCE(a.unidade_id, p.unidade_id) as unidade_id,
  fo.nome_exibicao as faixa_origem,
  fo.cor_hex as cor_origem,
  fd.nome_exibicao as faixa_destino,
  fd.cor_destino,
  ag.dt_graduacao,
  ag.concedido_por,
  u.nome as professor_nome,
  ag.observacao,
  ag.aprovado,
  ag.aprovado_por,
  ua.nome as aprovado_por_nome,
  ag.dt_aprovacao,
  ag.created_at
FROM teamcruz.aluno_graduacao ag
LEFT JOIN teamcruz.alunos a ON a.id = ag.aluno_id
LEFT JOIN teamcruz.pessoas p ON p.id = ag.aluno_id
LEFT JOIN teamcruz.faixa_def fo ON fo.id = ag.faixa_origem_id
LEFT JOIN teamcruz.faixa_def fd ON fd.id = ag.faixa_destino_id
LEFT JOIN teamcruz.usuarios u ON u.id = ag.concedido_por
LEFT JOIN teamcruz.usuarios ua ON ua.id = ag.aprovado_por
ORDER BY ag.dt_graduacao DESC;

-- 7. Atualizar graduações já existentes como aprovadas
UPDATE teamcruz.aluno_graduacao
SET aprovado = TRUE,
    dt_aprovacao = dt_graduacao
WHERE aprovado IS FALSE OR aprovado IS NULL;

-- 8. Registrar migration
INSERT INTO teamcruz.migrations (timestamp, name) 
VALUES (1738468000000, 'FixGraduacaoSystem1738468000000')
ON CONFLICT DO NOTHING;

-- Verificar resultado
SELECT 'Graduações pendentes de aprovação:' as info, COUNT(*) as total 
FROM teamcruz.v_graduacoes_pendentes
UNION ALL
SELECT 'Total de graduações:' as info, COUNT(*) as total 
FROM teamcruz.aluno_graduacao
UNION ALL
SELECT 'Alunos com faixa ativa:' as info, COUNT(*) as total 
FROM teamcruz.aluno_faixa WHERE ativa = TRUE;
