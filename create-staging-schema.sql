-- Script para criar schema de staging
-- Execute este script no banco de dados PostgreSQL

-- Criar schema de staging
CREATE SCHEMA IF NOT EXISTS teamcruz_staging;

-- Garantir permissões
GRANT ALL ON SCHEMA teamcruz_staging TO postgres;
GRANT ALL ON SCHEMA teamcruz_staging TO seu_usuario_db;

-- Listar schemas existentes
SELECT schema_name FROM information_schema.schemata;
