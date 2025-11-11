-- =================================================================
-- SIMPLIFICAÇÃO DA TABELA UNIDADES
-- Remove campos desnecessários conforme solicitado
-- =================================================================

-- Backup dos dados antes de remover (opcional, mas recomendado)
-- CREATE TABLE teamcruz.unidades_backup AS SELECT * FROM teamcruz.unidades;

BEGIN;

-- Remover campos do RESPONSÁVEL
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS responsavel_nome CASCADE;
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS responsavel_cpf CASCADE;
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS responsavel_papel CASCADE;
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS responsavel_contato CASCADE;

-- Remover campo do INSTRUTOR PRINCIPAL
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS instrutor_principal_id CASCADE;

-- Remover campos de ESTRUTURA
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS qtde_tatames CASCADE;
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS area_tatame_m2 CASCADE;
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS capacidade_max_alunos CASCADE;
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS qtde_instrutores CASCADE;

-- Remover campo de VALOR e MODALIDADES
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS valor_plano_padrao CASCADE;
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS modalidades CASCADE;

-- Remover campo CÓDIGO INTERNO
ALTER TABLE teamcruz.unidades DROP COLUMN IF EXISTS codigo_interno CASCADE;

-- Remover ENUM PapelResponsavel se não estiver sendo usado em outro lugar
-- Verificar antes de executar!
-- DROP TYPE IF EXISTS teamcruz.papel_responsavel_enum CASCADE;

-- Remover ENUM Modalidade se existir e não estiver sendo usado
-- DROP TYPE IF EXISTS teamcruz.modalidade_enum CASCADE;

COMMIT;

-- =================================================================
-- RESULTADO ESPERADO: Tabela unidades terá apenas:
-- - id, franqueado_id, nome, cnpj, razao_social, nome_fantasia
-- - inscricao_estadual, inscricao_municipal
-- - telefone_fixo, telefone_celular, email, website, redes_sociais
-- - status, horarios_funcionamento, endereco_id
-- - created_at, updated_at
-- =================================================================
