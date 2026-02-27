-- Migration: Adicionar endereco_id na tabela responsaveis
-- Data: 2026-02-05
-- Descrição: Adiciona coluna endereco_id e foreign key para tabela enderecos

BEGIN;

-- 1. Adicionar coluna endereco_id (nullable por enquanto)
ALTER TABLE teamcruz.responsaveis 
ADD COLUMN IF NOT EXISTS endereco_id UUID;

-- 2. Criar foreign key constraint
ALTER TABLE teamcruz.responsaveis
ADD CONSTRAINT fk_responsaveis_endereco
FOREIGN KEY (endereco_id) 
REFERENCES teamcruz.enderecos(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 3. Criar índice para melhorar performance de joins
CREATE INDEX IF NOT EXISTS idx_responsaveis_endereco_id 
ON teamcruz.responsaveis(endereco_id);

-- 4. Comentários nas colunas
COMMENT ON COLUMN teamcruz.responsaveis.endereco_id IS 'FK para tabela enderecos - substitui campos legados (cep, logradouro, etc)';

-- Marcar colunas antigas como legadas (manter por compatibilidade)
COMMENT ON COLUMN teamcruz.responsaveis.cep IS 'LEGADO - Usar endereco.cep via endereco_id';
COMMENT ON COLUMN teamcruz.responsaveis.logradouro IS 'LEGADO - Usar endereco.logradouro via endereco_id';
COMMENT ON COLUMN teamcruz.responsaveis.numero IS 'LEGADO - Usar endereco.numero via endereco_id';
COMMENT ON COLUMN teamcruz.responsaveis.complemento IS 'LEGADO - Usar endereco.complemento via endereco_id';
COMMENT ON COLUMN teamcruz.responsaveis.bairro IS 'LEGADO - Usar endereco.bairro via endereco_id';
COMMENT ON COLUMN teamcruz.responsaveis.cidade IS 'LEGADO - Usar endereco.cidade via endereco_id';
COMMENT ON COLUMN teamcruz.responsaveis.estado IS 'LEGADO - Usar endereco.estado via endereco_id';

-- 5. Relatório
DO $$
DECLARE
    total_responsaveis INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_responsaveis
    FROM teamcruz.responsaveis;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration: Adicionar endereco_id';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Coluna endereco_id adicionada com sucesso!';
    RAISE NOTICE 'Total de responsáveis: %', total_responsaveis;
    RAISE NOTICE 'Próximo passo: Executar migrate-responsaveis-enderecos.sql';
    RAISE NOTICE '==============================================';
END $$;

COMMIT;
