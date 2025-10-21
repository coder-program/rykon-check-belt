-- Script consolidado para adicionar colunas de auditoria em todas as tabelas necessárias
-- Execute este script no banco de dados PostgreSQL

-- 1. Adicionar colunas de auditoria na tabela unidades (se não existirem)
ALTER TABLE teamcruz.unidades
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Verificar se outras tabelas principais também precisam das colunas
-- (pode ser necessário para consistência de auditoria)

-- Verificar franqueados
ALTER TABLE teamcruz.franqueados
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Nota: A tabela professores já contém alunos e professores (tabela unificada)
-- Não é necessário criar tabela alunos separada-- Verificar professores (renomeado de pessoas)
ALTER TABLE teamcruz.professores
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Verificar enderecos
ALTER TABLE teamcruz.enderecos
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();-- 3. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Criar triggers para todas as tabelas principais
-- Trigger para unidades
DROP TRIGGER IF EXISTS update_unidades_updated_at ON teamcruz.unidades;
CREATE TRIGGER update_unidades_updated_at
    BEFORE UPDATE ON teamcruz.unidades
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para franqueados
DROP TRIGGER IF EXISTS update_franqueados_updated_at ON teamcruz.franqueados;
CREATE TRIGGER update_franqueados_updated_at
    BEFORE UPDATE ON teamcruz.franqueados
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Nota: Trigger para alunos não necessário - eles estão na tabela professores-- Trigger para professores
DROP TRIGGER IF EXISTS update_professores_updated_at ON teamcruz.professores;
CREATE TRIGGER update_professores_updated_at
    BEFORE UPDATE ON teamcruz.professores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para enderecos
DROP TRIGGER IF EXISTS update_enderecos_updated_at ON teamcruz.enderecos;
CREATE TRIGGER update_enderecos_updated_at
    BEFORE UPDATE ON teamcruz.enderecos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Preencher created_at para registros existentes (se houver e estiverem NULL)
UPDATE teamcruz.unidades
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE teamcruz.franqueados
SET created_at = NOW()
WHERE created_at IS NULL;

-- Alunos estão na tabela professores - não necessário atualização separadaUPDATE teamcruz.professores
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE teamcruz.enderecos
SET created_at = NOW()
WHERE created_at IS NULL;

-- 6. Adicionar comentários para documentação
COMMENT ON COLUMN teamcruz.unidades.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN teamcruz.unidades.updated_at IS 'Data da última atualização do registro';

COMMENT ON COLUMN teamcruz.franqueados.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN teamcruz.franqueados.updated_at IS 'Data da última atualização do registro';

-- Comentários para alunos não necessários - estão na tabela professores

COMMENT ON COLUMN teamcruz.professores.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN teamcruz.professores.updated_at IS 'Data da última atualização do registro';

COMMENT ON COLUMN teamcruz.enderecos.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN teamcruz.enderecos.updated_at IS 'Data da última atualização do registro';

-- Verificar se as colunas foram criadas corretamente
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name IN ('unidades', 'franqueados', 'professores', 'enderecos')
  AND column_name IN ('created_at', 'updated_at')
ORDER BY table_name, column_name;