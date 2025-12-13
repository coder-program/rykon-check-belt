-- Fix: Aumentar tamanho do campo CPF na tabela convites_cadastro
-- Problema: Campo CPF limitado a VARCHAR(14) causava erro quando usuário inseria textos longos

-- Aumentar o tamanho do campo CPF para comportar textos maiores
ALTER TABLE teamcruz.convites_cadastro 
ALTER COLUMN cpf TYPE VARCHAR(50);

-- Comentário
COMMENT ON COLUMN teamcruz.convites_cadastro.cpf IS 'CPF para pré-cadastro (permite texto livre para casos especiais)';

-- Verificar a alteração
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_schema = 'teamcruz' 
  AND table_name = 'convites_cadastro' 
  AND column_name = 'cpf';
