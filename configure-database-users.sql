-- Configurar permissões para staging
-- Mesmo usuário (teamcruz_app) acessa ambos os schemas com a mesma senha

-- ===================================
-- STAGING (teamcruz_staging)
-- ===================================

-- Garantir permissões no schema staging
GRANT ALL PRIVILEGES ON SCHEMA teamcruz_staging TO teamcruz_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA teamcruz_staging TO teamcruz_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA teamcruz_staging TO teamcruz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA teamcruz_staging GRANT ALL ON TABLES TO teamcruz_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA teamcruz_staging GRANT ALL ON SEQUENCES TO teamcruz_app;

-- ===================================
-- VERIFICAÇÃO
-- ===================================

-- Ver schemas
SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'teamcruz%';
