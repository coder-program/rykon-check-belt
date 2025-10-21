-- Inserir dados básicos de faixas na tabela faixa_def
INSERT INTO teamcruz.faixa_def (id, codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, created_at, updated_at) VALUES
  (gen_random_uuid(), 'BRANCA', 'Branca', '#FFFFFF', 1, 4, 40, 'ADULTO', NOW(), NOW()),
  (gen_random_uuid(), 'AMARELA', 'Amarela', '#FFFF00', 2, 4, 40, 'ADULTO', NOW(), NOW()),
  (gen_random_uuid(), 'LARANJA', 'Laranja', '#FFA500', 3, 4, 40, 'ADULTO', NOW(), NOW()),
  (gen_random_uuid(), 'VERDE', 'Verde', '#00FF00', 4, 4, 40, 'ADULTO', NOW(), NOW()),
  (gen_random_uuid(), 'AZUL', 'Azul', '#0000FF', 5, 4, 40, 'ADULTO', NOW(), NOW()),
  (gen_random_uuid(), 'ROXA', 'Roxa', '#8A2BE2', 6, 4, 40, 'ADULTO', NOW(), NOW()),
  (gen_random_uuid(), 'MARROM', 'Marrom', '#8B4513', 7, 4, 40, 'ADULTO', NOW(), NOW()),
  (gen_random_uuid(), 'PRETA', 'Preta', '#000000', 8, 4, 40, 'ADULTO', NOW(), NOW())
ON CONFLICT (codigo) DO NOTHING;