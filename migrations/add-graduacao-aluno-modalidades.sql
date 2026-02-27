-- Migration: add graduacao_atual e data_ultima_graduacao em aluno_modalidades
-- Para registrar a graduação do aluno em cada modalidade (exceto jiu-jitsu, que usa tabela dedicada)

ALTER TABLE teamcruz.aluno_modalidades
  ADD COLUMN IF NOT EXISTS graduacao_atual VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS data_ultima_graduacao DATE NULL;

COMMENT ON COLUMN teamcruz.aluno_modalidades.graduacao_atual IS 'Graduação atual do aluno nesta modalidade (ex: Faixa Amarela, Kyu 7, Intermediário). Não usado para jiu-jitsu (usa tabela aluno_faixa).';
COMMENT ON COLUMN teamcruz.aluno_modalidades.data_ultima_graduacao IS 'Data da última graduação do aluno nesta modalidade.';
