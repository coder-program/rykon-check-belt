-- Script de criação da tabela audit_logs
-- Baseado na entidade AuditLog.entity.ts

-- Criar o schema teamcruz se não existir
CREATE SCHEMA IF NOT EXISTS teamcruz;

-- Criar o enum para as ações de auditoria
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action_enum') THEN
        CREATE TYPE teamcruz.audit_action_enum AS ENUM (
            'CREATE',
            'UPDATE',
            'DELETE',
            'LOGIN',
            'LOGOUT',
            'ACCESS'
        );
    END IF;
END $$;

-- Criar a tabela audit_logs
CREATE TABLE IF NOT EXISTS teamcruz.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action teamcruz.audit_action_enum NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    user_id VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent VARCHAR(500),
    old_values TEXT,
    new_values TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON teamcruz.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_name ON teamcruz.audit_logs(entity_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON teamcruz.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON teamcruz.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON teamcruz.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON teamcruz.audit_logs(username);

-- Comentários na tabela e colunas para documentação
COMMENT ON TABLE teamcruz.audit_logs IS 'Tabela de auditoria para rastrear ações dos usuários no sistema';
COMMENT ON COLUMN teamcruz.audit_logs.id IS 'Identificador único do log de auditoria';
COMMENT ON COLUMN teamcruz.audit_logs.action IS 'Tipo de ação realizada (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACCESS)';
COMMENT ON COLUMN teamcruz.audit_logs.entity_name IS 'Nome da entidade que foi afetada';
COMMENT ON COLUMN teamcruz.audit_logs.entity_id IS 'ID da entidade que foi afetada';
COMMENT ON COLUMN teamcruz.audit_logs.user_id IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN teamcruz.audit_logs.username IS 'Nome de usuário que realizou a ação';
COMMENT ON COLUMN teamcruz.audit_logs.ip_address IS 'Endereço IP de origem da ação';
COMMENT ON COLUMN teamcruz.audit_logs.user_agent IS 'User Agent do navegador/cliente';
COMMENT ON COLUMN teamcruz.audit_logs.old_values IS 'Valores antigos antes da alteração (JSON)';
COMMENT ON COLUMN teamcruz.audit_logs.new_values IS 'Valores novos após a alteração (JSON)';
COMMENT ON COLUMN teamcruz.audit_logs.description IS 'Descrição adicional da ação';
COMMENT ON COLUMN teamcruz.audit_logs.created_at IS 'Data e hora de criação do log';

-- Verificar se a tabela foi criada com sucesso
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'teamcruz'
AND tablename = 'audit_logs';

-- Mostrar estrutura da tabela criada
\d teamcruz.audit_logs;