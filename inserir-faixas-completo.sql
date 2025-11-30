-- Popular tabela faixa_def com todas as faixas do Jiu-Jitsu
-- Infantil e Adulto

-- Limpar tabela (se necessário)
-- DELETE FROM teamcruz.faixa_def;

-- FAIXAS INFANTIS (categoria: INFANTIL)
-- Ordem: 1-13

-- 1. Branca Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('BRANCA_INF', 'Branca', '#FFFFFF', 1, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 2. Cinza e Branca Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('CINZA_BRANCA_INF', 'Cinza e Branca', '#808080', 2, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 3. Cinza Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('CINZA_INF', 'Cinza', '#808080', 3, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 4. Cinza e Preta Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('CINZA_PRETA_INF', 'Cinza e Preta', '#808080', 4, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 5. Amarela e Branca Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('AMAR_BRANCA_INF', 'Amarela e Branca', '#FFD700', 5, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 6. Amarela Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('AMARELA_INF', 'Amarela', '#FFD700', 6, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 7. Amarela e Preta Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('AMAR_PRETA_INF', 'Amarela e Preta', '#FFD700', 7, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 8. Laranja e Branca Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('LARA_BRANCA_INF', 'Laranja e Branca', '#FF8C00', 8, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 9. Laranja Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('LARANJA_INF', 'Laranja', '#FF8C00', 9, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 10. Laranja e Preta Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('LARA_PRETA_INF', 'Laranja e Preta', '#FF8C00', 10, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 11. Verde e Branca Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('VERDE_BRANCA_INF', 'Verde e Branca', '#008000', 11, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 12. Verde Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('VERDE_INF', 'Verde', '#008000', 12, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- 13. Verde e Preta Infantil
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('VERDE_PRETA_INF', 'Verde e Preta', '#008000', 13, 4, 40, 'INFANTIL', true)
ON CONFLICT (codigo) DO NOTHING;

-- FAIXAS ADULTAS (categoria: ADULTO)
-- Ordem: 14-18

-- 14. Branca Adulto
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('BRANCA', 'Branca', '#FFFFFF', 14, 4, 40, 'ADULTO', true)
ON CONFLICT (codigo) DO NOTHING;

-- 15. Azul Adulto
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('AZUL', 'Azul', '#0000FF', 15, 4, 40, 'ADULTO', true)
ON CONFLICT (codigo) DO NOTHING;

-- 16. Roxa Adulto
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('ROXA', 'Roxa', '#8B00FF', 16, 4, 40, 'ADULTO', true)
ON CONFLICT (codigo) DO NOTHING;

-- 17. Marrom Adulto
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('MARROM', 'Marrom', '#8B4513', 17, 4, 40, 'ADULTO', true)
ON CONFLICT (codigo) DO NOTHING;

-- 18. Preta Adulto
INSERT INTO teamcruz.faixa_def (codigo, nome_exibicao, cor_hex, ordem, graus_max, aulas_por_grau, categoria, ativo)
VALUES ('PRETA', 'Preta', '#000000', 18, 10, 40, 'ADULTO', true)
ON CONFLICT (codigo) DO NOTHING;

-- Verificar inserções
SELECT
    codigo,
    nome_exibicao,
    cor_hex,
    ordem,
    categoria,
    graus_max,
    ativo
FROM teamcruz.faixa_def
ORDER BY ordem;

-- Contar faixas por categoria
SELECT
    categoria,
    COUNT(*) as total_faixas
FROM teamcruz.faixa_def
GROUP BY categoria
ORDER BY categoria;
