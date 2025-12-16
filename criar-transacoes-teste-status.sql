-- Criar transações de teste com diferentes status
-- Para testar os filtros e badges coloridos

-- 1. Criar uma transação PENDENTE (aguardando confirmação)
INSERT INTO teamcruz.transacoes (
  id, tipo, origem, categoria, descricao, valor, 
  status, metodo_pagamento, unidade_id, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'ENTRADA',
  'VENDA',
  'PRODUTO',
  'Venda aguardando pagamento - Teste',
  150.00,
  'PENDENTE',
  'PIX',
  u.id,
  NOW(),
  NOW()
FROM teamcruz.unidades u
WHERE u.nome ILIKE '%Tatuapé%'
LIMIT 1;

-- 2. Criar uma transação CANCELADA
INSERT INTO teamcruz.transacoes (
  id, tipo, origem, categoria, descricao, valor, 
  status, metodo_pagamento, unidade_id, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  'ENTRADA',
  'VENDA',
  'MENSALIDADE',
  'Venda cancelada pelo cliente - Teste',
  200.00,
  'CANCELADA',
  'CARTAO',
  u.id,
  NOW(),
  NOW()
FROM teamcruz.unidades u
WHERE u.nome ILIKE '%Tatuapé%'
LIMIT 1;

-- 3. Criar uma transação ESTORNADA
INSERT INTO teamcruz.transacoes (
  id, tipo, origem, categoria, descricao, valor, 
  status, metodo_pagamento, unidade_id, created_at, updated_at, observacoes
)
SELECT 
  gen_random_uuid(),
  'SAIDA',
  'ESTORNO',
  'OUTRO',
  'Estorno de pagamento - Teste',
  350.00,
  'ESTORNADA',
  'PIX',
  u.id,
  NOW(),
  NOW(),
  'Estorno referente à venda VND2025000029'
FROM teamcruz.unidades u
WHERE u.nome ILIKE '%Tatuapé%'
LIMIT 1;

-- Verificar as transações criadas
SELECT 
  tipo,
  status,
  descricao,
  valor,
  created_at
FROM teamcruz.transacoes
WHERE descricao ILIKE '%Teste%'
ORDER BY created_at DESC;
