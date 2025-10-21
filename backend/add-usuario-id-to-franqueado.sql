-- =========================================
-- ADICIONAR CAMPO usuario_id EM FRANQUEADOS
-- Para vincular franqueado ao usuário logado
-- =========================================

-- Adicionar coluna usuario_id
ALTER TABLE teamcruz.franqueados
ADD COLUMN IF NOT EXISTS usuario_id UUID;

-- Adicionar foreign key para usuarios
ALTER TABLE teamcruz.franqueados
ADD CONSTRAINT fk_franqueado_usuario
FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id)
ON DELETE SET NULL;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_franqueados_usuario_id
ON teamcruz.franqueados(usuario_id);

-- Verificar estrutura
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'franqueados'
  AND column_name IN ('id', 'nome', 'email', 'usuario_id')
ORDER BY ordinal_position;

-- =========================================
-- EXEMPLO: Vincular usuário existente ao franqueado
-- =========================================

-- Listar usuários com perfil FRANQUEADO
SELECT
    u.id as usuario_id,
    u.nome as usuario_nome,
    u.email as usuario_email,
    STRING_AGG(p.nome, ', ') as perfis
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.usuario_perfis up ON u.id = up.usuario_id
LEFT JOIN teamcruz.perfis p ON up.perfil_id = p.id
WHERE EXISTS (
    SELECT 1
    FROM teamcruz.usuario_perfis up2
    INNER JOIN teamcruz.perfis p2 ON up2.perfil_id = p2.id
    WHERE up2.usuario_id = u.id
    AND p2.nome = 'FRANQUEADO'
)
GROUP BY u.id, u.nome, u.email;

-- Listar franqueados sem usuário vinculado
SELECT
    id,
    nome,
    email,
    cnpj,
    usuario_id
FROM teamcruz.franqueados
WHERE usuario_id IS NULL
ORDER BY nome;

-- =========================================
-- VINCULAR USUÁRIO AO FRANQUEADO
-- Execute este UPDATE após identificar o usuário correto
-- =========================================

-- Exemplo: Vincular pelo email
-- UPDATE teamcruz.franqueados f
-- SET usuario_id = u.id
-- FROM teamcruz.usuarios u
-- WHERE f.email = u.email
-- AND f.usuario_id IS NULL;

-- Ou vincular manualmente:
-- UPDATE teamcruz.franqueados
-- SET usuario_id = 'UUID_DO_USUARIO'
-- WHERE id = 'UUID_DO_FRANQUEADO';

COMMENT ON COLUMN teamcruz.franqueados.usuario_id IS 'ID do usuário responsável pelo franqueado';
