-- Popular tabela faixa_def com faixas de BJJ
-- Categoria ADULTO

INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES
  -- Faixas Adultas
  ('BRANCA', 'Branca', '#FFFFFF', 1, 4, 40, 'ADULTO', true),
  ('AZUL', 'Azul', '#0066CC', 2, 4, 40, 'ADULTO', true),
  ('ROXA', 'Roxa', '#9933CC', 3, 4, 40, 'ADULTO', true),
  ('MARROM', 'Marrom', '#6F4E37', 4, 4, 40, 'ADULTO', true),
  ('PRETA', 'Preta', '#000000', 5, 4, 40, 'ADULTO', true),
  ('CORAL', 'Coral', '#FF6B6B', 6, 0, 0, 'MESTRE', true),
  ('VERMELHA', 'Vermelha', '#FF0000', 7, 0, 0, 'MESTRE', true),

  -- Faixas Infantis
  ('BRANCA_INFANTIL', 'Branca', '#FFFFFF', 1, 4, 30, 'INFANTIL', true),
  ('CINZA_BRANCA', 'Cinza-Branca', '#A9A9A9', 2, 4, 30, 'INFANTIL', true),
  ('CINZA', 'Cinza', '#808080', 3, 4, 30, 'INFANTIL', true),
  ('CINZA_PRETA', 'Cinza-Preta', '#505050', 4, 4, 30, 'INFANTIL', true),
  ('AMARELA_BRANCA', 'Amarela-Branca', '#FFD700', 5, 4, 30, 'INFANTIL', true),
  ('AMARELA', 'Amarela', '#FFD700', 6, 4, 30, 'INFANTIL', true),
  ('AMARELA_PRETA', 'Amarela-Preta', '#CCAA00', 7, 4, 30, 'INFANTIL', true),
  ('LARANJA_BRANCA', 'Laranja-Branca', '#FF8C00', 8, 4, 30, 'INFANTIL', true),
  ('LARANJA', 'Laranja', '#FF6600', 9, 4, 30, 'INFANTIL', true),
  ('LARANJA_PRETA', 'Laranja-Preta', '#CC5500', 10, 4, 30, 'INFANTIL', true),
  ('VERDE_BRANCA', 'Verde-Branca', '#00AA00', 11, 4, 30, 'INFANTIL', true),
  ('VERDE', 'Verde', '#008800', 12, 4, 30, 'INFANTIL', true),
  ('VERDE_PRETA', 'Verde-Preta', '#006600', 13, 4, 30, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- Verificar resultado
SELECT codigo, nome_exibicao, categoria, ordem FROM teamcruz.faixa_def ORDER BY categoria, ordem;
