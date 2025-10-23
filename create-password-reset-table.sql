-- Criar tabela password_reset_tokens se não existir
-- Execute este script no banco de dados teamcruz_db

CREATE TABLE IF NOT EXISTS teamcruz.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL,
    usuario_id UUID NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);

-- Verificar se a tabela foi criada
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
AND table_name = 'password_reset_tokens'
ORDER BY ordinal_position;