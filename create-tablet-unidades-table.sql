-- ============================================
-- CRIAÇÃO DA TABELA tablet_unidades
-- Vincula usuários TABLET_CHECKIN às unidades
-- ============================================

-- 1. Criar tabela tablet_unidades
CREATE TABLE IF NOT EXISTS teamcruz.tablet_unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tablet_id UUID NOT NULL,
  unidade_id UUID NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Foreign Keys
  CONSTRAINT fk_tablet_usuario FOREIGN KEY (tablet_id)
    REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_tablet_unidade FOREIGN KEY (unidade_id)
    REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,

  -- Um tablet só pode estar vinculado a uma unidade
  CONSTRAINT uq_tablet_unidade UNIQUE (tablet_id, unidade_id)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tablet_unidades_tablet_id
  ON teamcruz.tablet_unidades(tablet_id);

CREATE INDEX IF NOT EXISTS idx_tablet_unidades_unidade_id
  ON teamcruz.tablet_unidades(unidade_id);

CREATE INDEX IF NOT EXISTS idx_tablet_unidades_ativo
  ON teamcruz.tablet_unidades(ativo);

-- 3. Comentários na tabela
COMMENT ON TABLE teamcruz.tablet_unidades IS
  'Vincula usuários TABLET_CHECKIN às unidades para controle de acesso';

COMMENT ON COLUMN teamcruz.tablet_unidades.tablet_id IS
  'ID do usuário com perfil TABLET_CHECKIN';

COMMENT ON COLUMN teamcruz.tablet_unidades.unidade_id IS
  'ID da unidade onde o tablet está instalado';

COMMENT ON COLUMN teamcruz.tablet_unidades.ativo IS
  'Se o vínculo está ativo (permite desativar temporariamente)';

-- 4. Migrar dados existentes de recepcionista_unidades (se houver tablets já cadastrados)
-- ATENÇÃO: Execute este comando apenas se você já tem tablets cadastrados em recepcionista_unidades
/*
INSERT INTO teamcruz.tablet_unidades (tablet_id, unidade_id, ativo, created_at, updated_at)
SELECT
  ru.recepcionista_id,
  ru.unidade_id,
  ru.ativo,
  ru.created_at,
  ru.updated_at
FROM teamcruz.recepcionista_unidades ru
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = ru.recepcionista_id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE p.nome = 'TABLET_CHECKIN'
ON CONFLICT (tablet_id, unidade_id) DO NOTHING;
*/

-- ============================================
-- SCRIPT COMPLETO PARA CRIAR USUÁRIO TABLET
-- ============================================
/*
-- Exemplo de como criar um usuário tablet completo:

-- Passo 1: Criar usuário
INSERT INTO teamcruz.usuarios (id, nome, email, senha, ativo, cadastro_completo, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Tablet Unidade Centro',
  'tablet.centro@teamcruz.com',
  '$2b$10$HASH_DA_SENHA',  -- Use bcrypt para gerar a senha
  true,
  true,  -- Não precisa completar cadastro
  NOW(),
  NOW()
) RETURNING id;

-- Passo 2: Vincular ao perfil TABLET_CHECKIN
-- Substitua 'ID_DO_USUARIO_CRIADO' pelo ID retornado no passo 1
INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
SELECT
  'ID_DO_USUARIO_CRIADO',
  id
FROM teamcruz.perfis
WHERE nome = 'TABLET_CHECKIN';

-- Passo 3: Vincular à unidade usando a NOVA tabela
INSERT INTO teamcruz.tablet_unidades (tablet_id, unidade_id, ativo, created_at, updated_at)
VALUES (
  'ID_DO_USUARIO_CRIADO',
  'ID_DA_UNIDADE',
  true,
  NOW(),
  NOW()
);
*/
