-- Script para adicionar usuario_id na tabela professor_unidades
-- E permitir professor_id NULL (será preenchido no complete-profile)

-- Adicionar coluna usuario_id para rastrear usuário mesmo sem professor criado
ALTER TABLE teamcruz.professor_unidades
ADD COLUMN IF NOT EXISTS usuario_id UUID;

-- Criar foreign key para usuarios
ALTER TABLE teamcruz.professor_unidades
ADD CONSTRAINT fk_professor_unidades_usuario
FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE;

-- Permitir professor_id NULL (será preenchido quando completar cadastro)
ALTER TABLE teamcruz.professor_unidades
ALTER COLUMN professor_id DROP NOT NULL;

-- Criar índice para usuario_id
CREATE INDEX IF NOT EXISTS idx_professor_unidades_usuario_id
ON teamcruz.professor_unidades(usuario_id);

-- Modificar constraint unique para usar usuario_id quando professor_id for NULL
ALTER TABLE teamcruz.professor_unidades
DROP CONSTRAINT IF EXISTS uk_professor_unidade;

-- Nova constraint: ou professor_id+unidade_id únicos, ou usuario_id+unidade_id únicos
CREATE UNIQUE INDEX IF NOT EXISTS uk_professor_unidade_id
ON teamcruz.professor_unidades(professor_id, unidade_id)
WHERE professor_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_usuario_unidade_id
ON teamcruz.professor_unidades(usuario_id, unidade_id)
WHERE usuario_id IS NOT NULL;

-- Comentários
COMMENT ON COLUMN teamcruz.professor_unidades.usuario_id IS 'ID do usuário - usado quando professor ainda não completou cadastro';
COMMENT ON COLUMN teamcruz.professor_unidades.professor_id IS 'ID do professor - NULL até completar cadastro';

SELECT 'Tabela professor_unidades atualizada com sucesso!' as status;
