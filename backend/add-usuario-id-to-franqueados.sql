-- Adicionar coluna usuario_id à tabela franqueados
-- Esta coluna vincula o franqueado ao usuário do sistema

-- 1. Verificar se a coluna já existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'franqueados'
  AND column_name = 'usuario_id';

-- 2. Adicionar a coluna se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'teamcruz'
      AND table_name = 'franqueados'
      AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE teamcruz.franqueados
    ADD COLUMN usuario_id UUID NULL;

    RAISE NOTICE 'Coluna usuario_id adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'Coluna usuario_id já existe!';
  END IF;
END $$;

-- 3. Adicionar constraint de foreign key (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'teamcruz'
      AND table_name = 'franqueados'
      AND constraint_name = 'fk_franqueados_usuario'
  ) THEN
    ALTER TABLE teamcruz.franqueados
    ADD CONSTRAINT fk_franqueados_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES teamcruz.usuarios(id)
    ON DELETE SET NULL;

    RAISE NOTICE 'Foreign key fk_franqueados_usuario criada com sucesso!';
  ELSE
    RAISE NOTICE 'Foreign key fk_franqueados_usuario já existe!';
  END IF;
END $$;

-- 4. Criar índice para melhorar performance de buscas por usuario_id
CREATE INDEX IF NOT EXISTS idx_franqueados_usuario_id
ON teamcruz.franqueados(usuario_id);

-- 5. Verificar a estrutura final
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'franqueados'
ORDER BY ordinal_position;

-- 6. Testar a nova coluna
SELECT id, nome, cnpj, usuario_id, created_at
FROM teamcruz.franqueados
ORDER BY created_at DESC
LIMIT 5;
