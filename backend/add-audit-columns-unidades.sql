-- Script para adicionar colunas de auditoria na tabela unidades
-- Execute este script no banco de dados para corrigir a estrutura

ALTER TABLE teamcruz.unidades
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Criar trigger para atualizar automatically o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar o trigger na tabela unidades
DROP TRIGGER IF EXISTS update_unidades_updated_at ON teamcruz.unidades;
CREATE TRIGGER update_unidades_updated_at
    BEFORE UPDATE ON teamcruz.unidades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Preencher created_at para registros existentes (se houver)
UPDATE teamcruz.unidades
SET created_at = NOW()
WHERE created_at IS NULL;

-- Comentário para documentação
COMMENT ON COLUMN teamcruz.unidades.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN teamcruz.unidades.updated_at IS 'Data da última atualização do registro';