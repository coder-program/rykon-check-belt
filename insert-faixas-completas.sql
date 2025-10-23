-- Script para inserir todas as faixas (cores de faixas) no sistema
-- Baseado na estrutura: id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at

-- Faixas já existentes (para referência):
-- ROXA, AZUL, BRANCA

-- Inserindo as faixas restantes com cores padrão

-- 1. MARROM
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'MARROM',
  'MARROM',
  '#8B4513',
  2,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 2. PRETA
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'PRETA',
  'PRETA',
  '#000000',
  3,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 3. CINZA
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'CINZA',
  'CINZA',
  '#808080',
  4,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 4. CINZA COM BRANCO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'CINZA_BRANCO',
  'CINZA COM BRANCO',
  '#A9A9A9',
  5,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 5. CINZA COM PRETO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'CINZA_PRETO',
  'CINZA COM PRETO',
  '#696969',
  6,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 6. AMARELO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AMARELO',
  'AMARELO',
  '#FFFF00',
  7,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 7. AMARELO COM BRANCO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AMARELO_BRANCO',
  'AMARELO COM BRANCO',
  '#FFFFE0',
  8,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 8. AMARELO COM PRETO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'AMARELO_PRETO',
  'AMARELO COM PRETO',
  '#DAA520',
  9,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 9. LARANJA
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'LARANJA',
  'LARANJA',
  '#FFA500',
  10,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 10. LARANJA COM BRANCO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'LARANJA_BRANCO',
  'LARANJA COM BRANCO',
  '#FFDAB9',
  11,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 11. LARANJA COM PRETO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'LARANJA_PRETO',
  'LARANJA COM PRETO',
  '#FF8C00',
  12,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 12. VERDE
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'VERDE',
  'VERDE',
  '#008000',
  13,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 13. VERDE COM BRANCO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'VERDE_BRANCO',
  'VERDE COM BRANCO',
  '#90EE90',
  14,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 14. VERDE COM PRETO
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'VERDE_PRETO',
  'VERDE COM PRETO',
  '#006400',
  15,
  4,
  40,
  'ADULTO',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- ============================================
-- VERSÃO ALTERNATIVA: Faixas infantis (caso necessário)
-- ============================================

-- Se também precisar das mesmas faixas para categoria INFANTIL, descomente as linhas abaixo:

/*
-- FAIXAS INFANTIS (mesmas cores, categoria diferente)

-- 1. MARROM INFANTIL
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'MARROM_INF',
  'MARROM',
  '#8B4513',
  2,
  4,
  20,
  'INFANTIL',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- 2. PRETA INFANTIL
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'PRETA_INF',
  'PRETA',
  '#000000',
  3,
  4,
  20,
  'INFANTIL',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Continue o padrão para as demais cores infantis...
*/

-- ============================================
-- VERIFICAÇÃO DOS DADOS INSERIDOS
-- ============================================

-- Para verificar se as faixas foram inseridas corretamente:
-- SELECT id, codigo, nome_exibicao, cor_hex, ordem, categoria, ativo FROM teamcruz.faixa_def ORDER BY categoria, ordem;