-- ============================================
-- SCRIPT PARA POPULAR DADOS FINANCEIROS
-- ============================================
-- Execute este script para criar dados de teste no Dashboard Financeiro
-- Substitua os IDs pelos IDs reais do seu banco de dados

-- ============================================
-- 1. CRIAR PLANOS
-- ============================================
INSERT INTO teamcruz.planos (id, nome, descricao, valor, periodicidade, duracao_meses, ativo, criado_em)
VALUES
  (gen_random_uuid(), 'Plano Mensal', 'Mensalidade padrão', 150.00, 'MENSAL', 1, true, NOW()),
  (gen_random_uuid(), 'Plano Trimestral', 'Pacote 3 meses com desconto', 400.00, 'TRIMESTRAL', 3, true, NOW()),
  (gen_random_uuid(), 'Plano Anual', 'Pacote anual promocional', 1500.00, 'ANUAL', 12, true, NOW());

-- ============================================
-- 2. BUSCAR IDs NECESSÁRIOS
-- ============================================
-- Copie os IDs gerados acima e substitua nas variáveis abaixo:

-- Exemplo de como buscar IDs:
-- SELECT id, nome FROM teamcruz.planos;
-- SELECT id, nome FROM teamcruz.alunos WHERE unidade_id = 'SEU_UNIDADE_ID' LIMIT 5;

-- ============================================
-- 3. CRIAR ASSINATURAS (SUBSTITUA OS IDs)
-- ============================================
-- Substitua:
-- - <ALUNO_ID> pelo ID de um aluno existente
-- - <PLANO_ID> pelo ID do plano criado acima
-- - <UNIDADE_ID> pelo ID da sua unidade
-- - <USUARIO_ID> pelo ID do usuário que está criando

-- EXEMPLO 1: Assinatura Ativa
INSERT INTO teamcruz.assinaturas (
  id,
  aluno_id,
  plano_id,
  unidade_id,
  valor,
  status,
  data_inicio,
  data_proxima_cobranca,
  criado_por,
  criado_em
) VALUES (
  gen_random_uuid(),
  '<ALUNO_ID_1>', -- SUBSTITUIR
  (SELECT id FROM teamcruz.planos WHERE nome = 'Plano Mensal' LIMIT 1),
  '<UNIDADE_ID>', -- SUBSTITUIR
  150.00,
  'ATIVA',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'),
  '<USUARIO_ID>', -- SUBSTITUIR
  NOW()
);

-- EXEMPLO 2: Mais assinaturas
INSERT INTO teamcruz.assinaturas (
  id, aluno_id, plano_id, unidade_id, valor, status,
  data_inicio, data_proxima_cobranca, criado_por, criado_em
) VALUES
  (gen_random_uuid(), '<ALUNO_ID_2>', (SELECT id FROM teamcruz.planos WHERE nome = 'Plano Mensal' LIMIT 1), '<UNIDADE_ID>', 150.00, 'ATIVA', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'), '<USUARIO_ID>', NOW()),
  (gen_random_uuid(), '<ALUNO_ID_3>', (SELECT id FROM teamcruz.planos WHERE nome = 'Plano Trimestral' LIMIT 1), '<UNIDADE_ID>', 400.00, 'ATIVA', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE + INTERVAL '3 month'), '<USUARIO_ID>', NOW());

-- ============================================
-- 4. CRIAR FATURAS
-- ============================================
-- Criar faturas do mês atual (PAGAS)
INSERT INTO teamcruz.faturas (
  id,
  assinatura_id,
  aluno_id,
  numero_fatura,
  valor_original,
  valor_desconto,
  valor_acrescimo,
  valor_total,
  valor_pago,
  status,
  data_emissao,
  data_vencimento,
  data_pagamento,
  criado_por,
  criado_em
)
SELECT
  gen_random_uuid(),
  a.id,
  a.aluno_id,
  'FAT-' || LPAD((ROW_NUMBER() OVER ())::text, 6, '0'),
  a.valor,
  0,
  0,
  a.valor,
  a.valor, -- valor_pago = valor_total (fatura paga)
  'PAGA',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '10 days',
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '8 days',
  a.criado_por,
  NOW()
FROM teamcruz.assinaturas a
WHERE a.status = 'ATIVA'
  AND a.unidade_id = '<UNIDADE_ID>' -- SUBSTITUIR
LIMIT 10;

-- Criar faturas PENDENTES (não pagas ainda)
INSERT INTO teamcruz.faturas (
  id,
  assinatura_id,
  aluno_id,
  numero_fatura,
  valor_original,
  valor_desconto,
  valor_acrescimo,
  valor_total,
  valor_pago,
  status,
  data_emissao,
  data_vencimento,
  criado_por,
  criado_em
)
SELECT
  gen_random_uuid(),
  a.id,
  a.aluno_id,
  'FAT-' || LPAD((1000 + ROW_NUMBER() OVER ())::text, 6, '0'),
  a.valor,
  0,
  0,
  a.valor,
  0, -- valor_pago = 0 (fatura pendente)
  'PENDENTE',
  DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'),
  DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month') + INTERVAL '10 days',
  a.criado_por,
  NOW()
FROM teamcruz.assinaturas a
WHERE a.status = 'ATIVA'
  AND a.unidade_id = '<UNIDADE_ID>' -- SUBSTITUIR
LIMIT 5;

-- Criar faturas VENCIDAS (atrasadas)
INSERT INTO teamcruz.faturas (
  id,
  assinatura_id,
  aluno_id,
  numero_fatura,
  valor_original,
  valor_desconto,
  valor_acrescimo,
  valor_total,
  valor_pago,
  status,
  data_emissao,
  data_vencimento,
  criado_por,
  criado_em
)
SELECT
  gen_random_uuid(),
  a.id,
  a.aluno_id,
  'FAT-' || LPAD((2000 + ROW_NUMBER() OVER ())::text, 6, '0'),
  a.valor,
  0,
  10, -- acréscimo de R$ 10 por atraso
  a.valor + 10,
  0,
  'VENCIDA',
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month'),
  DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '10 days',
  a.criado_por,
  NOW()
FROM teamcruz.assinaturas a
WHERE a.status = 'ATIVA'
  AND a.unidade_id = '<UNIDADE_ID>' -- SUBSTITUIR
LIMIT 3;

-- ============================================
-- 5. VERIFICAR DADOS CRIADOS
-- ============================================
-- Planos
SELECT COUNT(*) as total_planos, SUM(CASE WHEN ativo THEN 1 ELSE 0 END) as ativos
FROM teamcruz.planos;

-- Assinaturas
SELECT status, COUNT(*) as total
FROM teamcruz.assinaturas
GROUP BY status;

-- Faturas por status
SELECT status, COUNT(*) as quantidade, SUM(valor_total) as total_valor
FROM teamcruz.faturas
GROUP BY status;

-- Receita do mês atual
SELECT
  SUM(CASE WHEN status = 'PAGA' THEN valor_pago ELSE 0 END) as receita_paga,
  SUM(CASE WHEN status = 'PENDENTE' THEN valor_total ELSE 0 END) as receita_pendente,
  SUM(CASE WHEN status = 'VENCIDA' THEN valor_total ELSE 0 END) as receita_vencida
FROM teamcruz.faturas
WHERE DATE_TRUNC('month', data_emissao) = DATE_TRUNC('month', CURRENT_DATE);

-- ============================================
-- 6. SCRIPT RÁPIDO PARA TESTE (OPCIONAL)
-- ============================================
-- Use este script se você já tem alunos cadastrados e quer popular rapidamente

-- Buscar primeiro aluno e primeira unidade
DO $$
DECLARE
  v_aluno_id UUID;
  v_unidade_id UUID;
  v_usuario_id UUID;
  v_plano_id UUID;
  v_assinatura_id UUID;
BEGIN
  -- Pegar primeiro aluno
  SELECT id, unidade_id INTO v_aluno_id, v_unidade_id
  FROM teamcruz.alunos
  WHERE unidade_id IS NOT NULL
  LIMIT 1;

  -- Pegar primeiro usuário franqueado
  SELECT id INTO v_usuario_id
  FROM teamcruz.usuarios
  WHERE tipo_usuario = 'FRANQUEADO'
  LIMIT 1;

  IF v_aluno_id IS NULL THEN
    RAISE NOTICE ' Nenhum aluno encontrado! Cadastre alunos primeiro.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Aluno encontrado: %', v_aluno_id;
  RAISE NOTICE '✅ Unidade: %', v_unidade_id;

  -- Criar plano se não existir
  INSERT INTO teamcruz.planos (id, nome, valor, periodicidade, duracao_meses, ativo, criado_em)
  VALUES (gen_random_uuid(), 'Plano Teste', 150.00, 'MENSAL', 1, true, NOW())
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_plano_id;

  IF v_plano_id IS NULL THEN
    SELECT id INTO v_plano_id FROM teamcruz.planos LIMIT 1;
  END IF;

  -- Criar assinatura
  INSERT INTO teamcruz.assinaturas (
    id, aluno_id, plano_id, unidade_id, valor, status,
    data_inicio, data_proxima_cobranca, criado_por, criado_em
  ) VALUES (
    gen_random_uuid(), v_aluno_id, v_plano_id, v_unidade_id, 150.00, 'ATIVA',
    CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', v_usuario_id, NOW()
  )
  RETURNING id INTO v_assinatura_id;

  RAISE NOTICE '✅ Assinatura criada: %', v_assinatura_id;

  -- Criar fatura PAGA (mês atual)
  INSERT INTO teamcruz.faturas (
    id, assinatura_id, aluno_id, numero_fatura,
    valor_original, valor_desconto, valor_acrescimo, valor_total, valor_pago,
    status, data_emissao, data_vencimento, data_pagamento, criado_por, criado_em
  ) VALUES (
    gen_random_uuid(), v_assinatura_id, v_aluno_id, 'FAT-000001',
    150.00, 0, 0, 150.00, 150.00,
    'PAGA', CURRENT_DATE, CURRENT_DATE + 10, CURRENT_DATE + 5, v_usuario_id, NOW()
  );

  -- Criar fatura PENDENTE
  INSERT INTO teamcruz.faturas (
    id, assinatura_id, aluno_id, numero_fatura,
    valor_original, valor_desconto, valor_acrescimo, valor_total, valor_pago,
    status, data_emissao, data_vencimento, criado_por, criado_em
  ) VALUES (
    gen_random_uuid(), v_assinatura_id, v_aluno_id, 'FAT-000002',
    150.00, 0, 0, 150.00, 0,
    'PENDENTE', CURRENT_DATE + 30, CURRENT_DATE + 40, v_usuario_id, NOW()
  );

  RAISE NOTICE '✅ Faturas criadas com sucesso!';
  RAISE NOTICE '🎉 Dashboard deve mostrar dados agora!';
END $$;
