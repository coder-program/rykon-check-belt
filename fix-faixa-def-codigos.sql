-- Atualizar os códigos da tabela faixa_def para corresponder ao enum PostgreSQL
-- O enum usa formato feminino (CINZA_BRANCA, AMARELA_BRANCA, etc.)
-- mas a tabela estava com formato masculino (CINZA_BRANCO, AMARELO_BRANCO)

UPDATE teamcruz.faixa_def SET codigo = 'CINZA_BRANCA' WHERE codigo = 'CINZA_BRANCO';
UPDATE teamcruz.faixa_def SET codigo = 'AMARELA_BRANCA' WHERE codigo = 'AMARELO_BRANCO';
UPDATE teamcruz.faixa_def SET codigo = 'AMARELA' WHERE codigo = 'AMARELO';
UPDATE teamcruz.faixa_def SET codigo = 'AMARELA_PRETA' WHERE codigo = 'AMARELO_PRETO';
UPDATE teamcruz.faixa_def SET codigo = 'LARANJA_BRANCA' WHERE codigo = 'LARANJA_BRANCO';
UPDATE teamcruz.faixa_def SET codigo = 'LARANJA_PRETA' WHERE codigo = 'LARANJA_PRETO';
UPDATE teamcruz.faixa_def SET codigo = 'VERDE_BRANCA' WHERE codigo = 'VERDE_BRANCO';
UPDATE teamcruz.faixa_def SET codigo = 'VERDE_PRETA' WHERE codigo = 'VERDE_PRETO';
