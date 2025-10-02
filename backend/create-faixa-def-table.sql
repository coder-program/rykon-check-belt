-- ============================================
-- CRIAR TABELA FAIXA_DEF E POPULAR COM FAIXAS
-- Definição de faixas de Jiu-Jitsu (Adulto e Infantil)
-- ============================================

-- 1. Criar tabela de definição de faixas
CREATE TABLE IF NOT EXISTS teamcruz.faixa_def (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nome_exibicao VARCHAR(40) NOT NULL,
  cor_hex VARCHAR(7) NOT NULL,
  ordem INTEGER NOT NULL,
  graus_max INTEGER DEFAULT 4,
  aulas_por_grau INTEGER DEFAULT 40,
  categoria VARCHAR(20) DEFAULT 'ADULTO',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_faixa_def_codigo ON teamcruz.faixa_def(codigo);
CREATE INDEX IF NOT EXISTS idx_faixa_def_categoria ON teamcruz.faixa_def(categoria);
CREATE INDEX IF NOT EXISTS idx_faixa_def_ordem ON teamcruz.faixa_def(ordem);

-- 3. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION teamcruz.update_faixa_def_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_faixa_def_updated_at ON teamcruz.faixa_def;
CREATE TRIGGER update_faixa_def_updated_at
BEFORE UPDATE ON teamcruz.faixa_def
FOR EACH ROW
EXECUTE FUNCTION teamcruz.update_faixa_def_updated_at();

-- 4. Popular tabela com faixas ADULTO (Brazilian Jiu-Jitsu)
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES
  -- Faixas Adulto
  ('BRANCA', 'Faixa Branca', '#FFFFFF', 1, 4, 40, 'ADULTO', true),
  ('AZUL', 'Faixa Azul', '#0066CC', 2, 4, 40, 'ADULTO', true),
  ('ROXA', 'Faixa Roxa', '#663399', 3, 4, 40, 'ADULTO', true),
  ('MARROM', 'Faixa Marrom', '#8B4513', 4, 4, 40, 'ADULTO', true),
  ('PRETA', 'Faixa Preta', '#000000', 5, 6, 50, 'ADULTO', true),
  ('CORAL', 'Faixa Coral', '#FF6B6B', 6, 0, 0, 'ADULTO', true),
  ('VERMELHA', 'Faixa Vermelha', '#DC143C', 7, 0, 0, 'ADULTO', true)
ON CONFLICT (codigo) DO UPDATE SET
  nome_exibicao = EXCLUDED.nome_exibicao,
  cor_hex = EXCLUDED.cor_hex,
  ordem = EXCLUDED.ordem,
  graus_max = EXCLUDED.graus_max,
  aulas_por_grau = EXCLUDED.aulas_por_grau,
  categoria = EXCLUDED.categoria,
  ativo = EXCLUDED.ativo;

-- 5. Popular tabela com faixas INFANTIL (até 15 anos)
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES
  -- Faixas Infantil
  ('CINZA_BRANCA', 'Faixa Cinza-Branca', '#E8E8E8', 1, 4, 30, 'INFANTIL', true),
  ('CINZA', 'Faixa Cinza', '#808080', 2, 4, 30, 'INFANTIL', true),
  ('CINZA_PRETA', 'Faixa Cinza-Preta', '#505050', 3, 4, 30, 'INFANTIL', true),
  ('AMARELA_BRANCA', 'Faixa Amarela-Branca', '#FFEB99', 4, 4, 30, 'INFANTIL', true),
  ('AMARELA', 'Faixa Amarela', '#FFD700', 5, 4, 30, 'INFANTIL', true),
  ('AMARELA_PRETA', 'Faixa Amarela-Preta', '#CCB300', 6, 4, 30, 'INFANTIL', true),
  ('LARANJA_BRANCA', 'Faixa Laranja-Branca', '#FFB366', 7, 4, 30, 'INFANTIL', true),
  ('LARANJA', 'Faixa Laranja', '#FF8C00', 8, 4, 30, 'INFANTIL', true),
  ('LARANJA_PRETA', 'Faixa Laranja-Preta', '#CC7000', 9, 4, 30, 'INFANTIL', true),
  ('VERDE_BRANCA', 'Faixa Verde-Branca', '#90EE90', 10, 4, 30, 'INFANTIL', true),
  ('VERDE', 'Faixa Verde', '#008000', 11, 4, 30, 'INFANTIL', true),
  ('VERDE_PRETA', 'Faixa Verde-Preta', '#006400', 12, 4, 30, 'INFANTIL', true)
ON CONFLICT (codigo) DO UPDATE SET
  nome_exibicao = EXCLUDED.nome_exibicao,
  cor_hex = EXCLUDED.cor_hex,
  ordem = EXCLUDED.ordem,
  graus_max = EXCLUDED.graus_max,
  aulas_por_grau = EXCLUDED.aulas_por_grau,
  categoria = EXCLUDED.categoria,
  ativo = EXCLUDED.ativo;

-- 6. Registrar migration
INSERT INTO teamcruz.migrations (timestamp, name) 
VALUES (1757100000000, 'CreateGraduacaoTables1757100000000')
ON CONFLICT DO NOTHING;

-- 7. Verificar resultado
SELECT 
  categoria,
  COUNT(*) as total_faixas,
  STRING_AGG(nome_exibicao, ', ' ORDER BY ordem) as faixas
FROM teamcruz.faixa_def
WHERE ativo = true
GROUP BY categoria
ORDER BY categoria;

-- Listar todas as faixas cadastradas
SELECT 
  codigo,
  nome_exibicao,
  cor_hex,
  ordem,
  graus_max,
  aulas_por_grau,
  categoria,
  ativo
FROM teamcruz.faixa_def
ORDER BY categoria, ordem;
