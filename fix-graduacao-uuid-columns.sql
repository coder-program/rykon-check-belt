-- Fix: Alterar tipo das colunas concedido_por e aprovado_por de VARCHAR para UUID
-- Problema: TypeORM estava tentando fazer JOIN com UUID = VARCHAR causando erro
-- Solução: Converter colunas para UUID usando CAST

-- Verificar dados atuais
SELECT
  id,
  concedido_por,
  aprovado_por,
  pg_typeof(concedido_por) as tipo_concedido,
  pg_typeof(aprovado_por) as tipo_aprovado
FROM teamcruz.aluno_graduacao
LIMIT 5;

-- Converter coluna concedido_por para UUID
ALTER TABLE teamcruz.aluno_graduacao
  ALTER COLUMN concedido_por TYPE UUID USING concedido_por::uuid;

-- Converter coluna aprovado_por para UUID
ALTER TABLE teamcruz.aluno_graduacao
  ALTER COLUMN aprovado_por TYPE UUID USING aprovado_por::uuid;

-- Verificar resultado
SELECT
  id,
  concedido_por,
  aprovado_por,
  pg_typeof(concedido_por) as tipo_concedido,
  pg_typeof(aprovado_por) as tipo_aprovado
FROM teamcruz.aluno_graduacao
LIMIT 5;

-- Confirmar que os JOINs funcionam
SELECT ag.id, ag.concedido_por, u.nome
FROM teamcruz.aluno_graduacao ag
LEFT JOIN teamcruz.usuarios u ON u.id = ag.concedido_por
WHERE ag.concedido_por IS NOT NULL
LIMIT 5;
