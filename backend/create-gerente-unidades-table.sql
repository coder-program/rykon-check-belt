-- =================================================================
-- CRIAÇÃO DA TABELA GERENTE_UNIDADES
-- Vincula gerentes de unidade às suas respectivas unidades
-- =================================================================

BEGIN;

-- Criar tabela de vínculo gerente-unidade
CREATE TABLE IF NOT EXISTS teamcruz.gerente_unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  unidade_id UUID NOT NULL,
  data_vinculo TIMESTAMP DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Foreign Keys
  CONSTRAINT fk_gerente_usuario FOREIGN KEY (usuario_id)
    REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_gerente_unidade FOREIGN KEY (unidade_id)
    REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,

  -- Constraint única: um gerente pode estar em apenas uma unidade
  CONSTRAINT uk_gerente_unidade UNIQUE (usuario_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_gerente_unidades_usuario
  ON teamcruz.gerente_unidades(usuario_id);

CREATE INDEX IF NOT EXISTS idx_gerente_unidades_unidade
  ON teamcruz.gerente_unidades(unidade_id);

CREATE INDEX IF NOT EXISTS idx_gerente_unidades_ativo
  ON teamcruz.gerente_unidades(ativo);

-- Comentários
COMMENT ON TABLE teamcruz.gerente_unidades IS
  'Vínculo entre gerentes de unidade e suas unidades';
COMMENT ON COLUMN teamcruz.gerente_unidades.usuario_id IS
  'ID do usuário com perfil GERENTE_UNIDADE';
COMMENT ON COLUMN teamcruz.gerente_unidades.unidade_id IS
  'ID da unidade que o gerente administra';
COMMENT ON COLUMN teamcruz.gerente_unidades.ativo IS
  'Se o vínculo está ativo (permite desativar sem deletar)';

COMMIT;

-- =================================================================
-- VERIFICAR RESULTADO
-- =================================================================
SELECT 'Tabela gerente_unidades criada com sucesso!' as status;
