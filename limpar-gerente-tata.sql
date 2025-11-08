-- OPÇÃO 1: Deletar o usuário gerente TataSilva completamente
-- Primeiro volta a unidade para o estado anterior (com o responsavel antigo)
UPDATE teamcruz.unidades
SET responsavel_cpf = '11111111111',  -- CPF do Joao Leite (proprietário antigo)
    responsavel_papel = 'PROPRIETARIO'
WHERE id = '8aedb511-6f21-4a75-bc73-5bf43c2dfcc2';

-- Depois deleta o usuário
DELETE FROM teamcruz.usuario_perfis WHERE usuario_id = '8ed23b72-e199-4f4f-a460-eb92a602ced0';
DELETE FROM teamcruz.usuarios WHERE id = '8ed23b72-e199-4f4f-a460-eb92a602ced0';

-- Verificar se deletou
SELECT * FROM teamcruz.usuarios WHERE cpf = '21187928089';

-- Verificar se a unidade voltou ao normal
SELECT
    id,
    nome,
    responsavel_cpf,
    responsavel_papel
FROM teamcruz.unidades
WHERE id = '8aedb511-6f21-4a75-bc73-5bf43c2dfcc2';