-- Tornar data_nascimento e genero opcionais nas tabelas pessoas e professores
-- Permite criar professores sem esses dados se não forem informados no cadastro inicial
-- O professor preenche no complete-profile

-- Tabela pessoas (person)
ALTER TABLE teamcruz.pessoas
ALTER COLUMN data_nascimento DROP NOT NULL;

ALTER TABLE teamcruz.pessoas
ALTER COLUMN genero DROP NOT NULL;

-- Tabela professores
ALTER TABLE teamcruz.professores
ALTER COLUMN data_nascimento DROP NOT NULL;

ALTER TABLE teamcruz.professores
ALTER COLUMN genero DROP NOT NULL;

-- Tabela alunos (manter obrigatório para alunos, pois precisamos para calcular idade/faixa)
-- Não alterar alunos.data_nascimento e alunos.genero

-- Verificar estrutura após mudanças
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name IN ('pessoas', 'professores', 'alunos')
  AND column_name IN ('data_nascimento', 'genero')
ORDER BY table_name, column_name;