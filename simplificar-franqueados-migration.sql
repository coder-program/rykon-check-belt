-- =============================================
-- MIGRAÇÃO: SIMPLIFICAR TABELA FRANQUEADOS
-- Data: 2025-11-02
-- Descrição: Remove campos desnecessários focando apenas na pessoa física responsável
-- =============================================

-- ATENÇÃO: EXECUTE ESTE SCRIPT EM PRODUÇÃO APENAS APÓS BACKUP!
-- Este script remove colunas permanentemente!

BEGIN;

-- ==============================================
-- 1. BACKUP DOS DADOS EXISTENTES (OPCIONAL)
-- ==============================================
-- Descomente se quiser fazer backup antes da migração
/*
CREATE TABLE IF NOT EXISTS teamcruz.franqueados_backup_20251102 AS
SELECT * FROM teamcruz.franqueados;
*/

-- ==============================================
-- 2. ADICIONAR NOVA COLUNA CPF (se não existir)
-- ==============================================
-- Adicionar coluna CPF que será nossa nova chave única
ALTER TABLE teamcruz.franqueados
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- ==============================================
-- 3. MIGRAR DADOS EXISTENTES
-- ==============================================
-- Copiar responsavel_cpf para cpf (se existir)
UPDATE teamcruz.franqueados
SET cpf = responsavel_cpf
WHERE responsavel_cpf IS NOT NULL AND cpf IS NULL;

-- Garantir que email não seja nulo (usar responsavel_email se necessário)
UPDATE teamcruz.franqueados
SET email = responsavel_email
WHERE email IS NULL AND responsavel_email IS NOT NULL;

-- Garantir que telefone não seja nulo (usar responsavel_telefone se necessário)
UPDATE teamcruz.franqueados
SET telefone = responsavel_telefone
WHERE telefone IS NULL AND responsavel_telefone IS NOT NULL;

-- ==============================================
-- 4. REMOVER ÍNDICES DAS COLUNAS QUE SERÃO DROPADAS
-- ==============================================
DROP INDEX IF EXISTS idx_franqueados_cnpj;

-- ==============================================
-- 5. REMOVER FOREIGN KEYS QUE REFERENCIAM COLUNAS A SEREM DROPADAS
-- ==============================================
-- Verificar se há foreign key para id_matriz e remover temporariamente
ALTER TABLE teamcruz.franqueados
DROP CONSTRAINT IF EXISTS fk_franqueados_matriz;

-- ==============================================
-- 6. DROPAR COLUNAS DESNECESSÁRIAS
-- ==============================================

-- Dados de Pessoa Jurídica
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS cnpj;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS razao_social;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS nome_fantasia;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS inscricao_estadual;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS inscricao_municipal;

-- Dados Corporativos Excessivos
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS website;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS redes_sociais;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS ano_fundacao;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS missao;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS visao;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS valores;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS historico;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS logotipo_url;

-- Relacionamento Hierárquico (complexo demais)
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS id_matriz;

-- Dados Financeiros (podem ser módulo separado)
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS data_contrato;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS taxa_franquia;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS dados_bancarios;

-- Campos de contato duplicados (mantemos apenas os principais)
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS telefone_fixo;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS telefone_celular;

-- Dados do responsável (agora são dados diretos do franqueado)
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS responsavel_nome;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS responsavel_cpf;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS responsavel_cargo;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS responsavel_email;
ALTER TABLE teamcruz.franqueados DROP COLUMN IF EXISTS responsavel_telefone;

-- ==============================================
-- 7. AJUSTAR CONSTRAINTS DAS COLUNAS RESTANTES
-- ==============================================

-- Tornar CPF obrigatório e único
UPDATE teamcruz.franqueados SET cpf = 'TEMP_' || id::text WHERE cpf IS NULL;
ALTER TABLE teamcruz.franqueados ALTER COLUMN cpf SET NOT NULL;
ALTER TABLE teamcruz.franqueados ADD CONSTRAINT uk_franqueados_cpf UNIQUE (cpf);

-- Tornar email obrigatório
UPDATE teamcruz.franqueados SET email = 'noreply+' || id::text || '@franquia.com' WHERE email IS NULL;
ALTER TABLE teamcruz.franqueados ALTER COLUMN email SET NOT NULL;

-- Tornar telefone obrigatório
UPDATE teamcruz.franqueados SET telefone = '11999999999' WHERE telefone IS NULL;
ALTER TABLE teamcruz.franqueados ALTER COLUMN telefone SET NOT NULL;

-- Ajustar tamanho do campo nome se necessário
ALTER TABLE teamcruz.franqueados ALTER COLUMN nome TYPE VARCHAR(150);

-- ==============================================
-- 8. CRIAR NOVOS ÍNDICES
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_franqueados_cpf ON teamcruz.franqueados(cpf);
CREATE INDEX IF NOT EXISTS idx_franqueados_email ON teamcruz.franqueados(email);
CREATE INDEX IF NOT EXISTS idx_franqueados_usuario_id ON teamcruz.franqueados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_franqueados_situacao ON teamcruz.franqueados(situacao);
CREATE INDEX IF NOT EXISTS idx_franqueados_ativo ON teamcruz.franqueados(ativo);

-- ==============================================
-- 9. ADICIONAR FOREIGN KEY PARA USUARIO_ID
-- ==============================================
-- Garantir integridade referencial com tabela usuarios
ALTER TABLE teamcruz.franqueados
ADD CONSTRAINT fk_franqueados_usuario
FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL;

-- ==============================================
-- 10. VERIFICAÇÃO FINAL
-- ==============================================
-- Mostrar estrutura final da tabela
SELECT column_name, data_type, is_nullable, character_maximum_length, column_default
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'franqueados'
ORDER BY ordinal_position;

-- Mostrar quantidade de registros
SELECT COUNT(*) as total_franqueados FROM teamcruz.franqueados;

-- Mostrar índices da tabela
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'teamcruz'
  AND tablename = 'franqueados';

COMMIT;

-- ==============================================
-- ESTRUTURA FINAL ESPERADA:
-- ==============================================
/*
COLUNAS RESTANTES:
- id (UUID) - Primary Key
- usuario_id (UUID) - FK para usuarios
- nome (VARCHAR(150)) - Nome do responsável
- cpf (VARCHAR(14)) - CPF único do responsável
- email (VARCHAR(120)) - Email principal
- telefone (VARCHAR(20)) - Telefone/WhatsApp
- endereco_id (UUID) - FK para enderecos (opcional)
- unidades_gerencia (TEXT[]) - Array de IDs das unidades
- situacao (ENUM) - Status da franquia
- ativo (BOOLEAN) - Ativo/Inativo
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
*/