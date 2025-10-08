-- Corrigir regras de graduação conforme especificação
-- Faixa Branca: 20 aulas por grau
-- Faixas Azul, Roxa, Marrom: 40 aulas por grau
-- Todas as faixas: máximo 4 graus

UPDATE teamcruz.faixa_def SET
    aulas_por_grau = 20,
    graus_max = 4
WHERE codigo = 'BRANCA';

UPDATE teamcruz.faixa_def SET
    aulas_por_grau = 40,
    graus_max = 4
WHERE codigo IN ('AZUL', 'ROXA', 'MARROM');

-- Verificar as alterações
SELECT codigo, nome_exibicao, aulas_por_grau, graus_max
FROM teamcruz.faixa_def
WHERE codigo IN ('BRANCA', 'AZUL', 'ROXA', 'MARROM')
ORDER BY ordem;