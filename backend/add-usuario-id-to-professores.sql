-- Adicionar coluna usuario_id à tabela professores
-- Data: 18 de Outubro de 2025
-- Descrição: Permite vincular professores aos seus usuários no sistema

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
          AND table_name = 'professores'
          AND column_name = 'usuario_id'
    ) THEN
        ALTER TABLE teamcruz.professores
        ADD COLUMN usuario_id UUID NULL;

        RAISE NOTICE 'Coluna usuario_id adicionada com sucesso à tabela professores';
    ELSE
        RAISE NOTICE 'Coluna usuario_id já existe na tabela professores';
    END IF;
END $$;

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_professores_usuario_id
ON teamcruz.professores(usuario_id);

-- Comentar a coluna
COMMENT ON COLUMN teamcruz.professores.usuario_id IS 'Referência ao usuário que representa este professor no sistema';

-- Verificar a estrutura atualizada
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'professores'
  AND column_name = 'usuario_id';
