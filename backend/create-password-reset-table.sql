-- Script de criação da tabela password_reset_tokens
-- Baseado na entidade PasswordReset.entity.ts

-- Criar o schema teamcruz se não existir
CREATE SCHEMA IF NOT EXISTS teamcruz;

-- Criar a tabela password_reset_tokens
CREATE TABLE IF NOT EXISTS teamcruz.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL UNIQUE,
    usuario_id UUID NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON teamcruz.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_usuario_id ON teamcruz.password_reset_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON teamcruz.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_used ON teamcruz.password_reset_tokens(used);
CREATE INDEX IF NOT EXISTS idx_password_reset_created_at ON teamcruz.password_reset_tokens(created_at);

-- Criar índice composto para consultas otimizadas
CREATE INDEX IF NOT EXISTS idx_password_reset_token_used_expires ON teamcruz.password_reset_tokens(token, used, expires_at);

-- Adicionar foreign key constraint se a tabela usuarios existir no mesmo schema
-- Descomente a linha abaixo se a tabela teamcruz.usuarios existir
-- ALTER TABLE teamcruz.password_reset_tokens
-- ADD CONSTRAINT fk_password_reset_usuario
-- FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE;

-- Comentários na tabela e colunas para documentação
COMMENT ON TABLE teamcruz.password_reset_tokens IS 'Tabela para armazenar tokens de recuperação de senha';
COMMENT ON COLUMN teamcruz.password_reset_tokens.id IS 'Identificador único do token de reset';
COMMENT ON COLUMN teamcruz.password_reset_tokens.token IS 'Token único para recuperação de senha';
COMMENT ON COLUMN teamcruz.password_reset_tokens.usuario_id IS 'ID do usuário que solicitou a recuperação';
COMMENT ON COLUMN teamcruz.password_reset_tokens.used IS 'Indica se o token já foi utilizado';
COMMENT ON COLUMN teamcruz.password_reset_tokens.expires_at IS 'Data e hora de expiração do token';
COMMENT ON COLUMN teamcruz.password_reset_tokens.created_at IS 'Data e hora de criação do token';

-- Criar função para limpeza automática de tokens expirados (opcional)
CREATE OR REPLACE FUNCTION teamcruz.cleanup_expired_password_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM teamcruz.password_reset_tokens
    WHERE expires_at < NOW() OR used = TRUE;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentário na função
COMMENT ON FUNCTION teamcruz.cleanup_expired_password_tokens() IS 'Função para remover tokens expirados ou já utilizados';

-- Verificar se a tabela foi criada com sucesso
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'teamcruz'
AND tablename = 'password_reset_tokens';

-- Mostrar estrutura da tabela criada
\d teamcruz.password_reset_tokens;

-- Exemplo de como usar a função de limpeza (execute quando necessário)
-- SELECT teamcruz.cleanup_expired_password_tokens();