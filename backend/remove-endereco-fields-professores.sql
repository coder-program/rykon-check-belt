-- Script para remover campos de endereço da tabela professores e adicionar referência
-- Execute este script no banco de dados PostgreSQL

-- 1. Primeiro, adicionar a coluna de referência para endereços
ALTER TABLE teamcruz.professores
ADD COLUMN IF NOT EXISTS endereco_id UUID;

-- 2. Criar a foreign key para a tabela enderecos
ALTER TABLE teamcruz.professores
ADD CONSTRAINT fk_professores_endereco
FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id);

-- 3. Migrar dados existentes (se houver endereços preenchidos)
-- Criar endereços para registros que têm dados de endereço preenchidos
DO $$
DECLARE
    pessoa_record RECORD;
    novo_endereco_id UUID;
BEGIN
    -- Iterar sobre pessoas que têm dados de endereço
    FOR pessoa_record IN
        SELECT id, cep, logradouro, numero, complemento, bairro, cidade, uf
        FROM teamcruz.professores
        WHERE cep IS NOT NULL
        AND logradouro IS NOT NULL
        AND cidade IS NOT NULL
        AND uf IS NOT NULL
    LOOP
        -- Criar novo endereço
        INSERT INTO teamcruz.enderecos (cep, logradouro, numero, complemento, bairro, cidade, estado)
        VALUES (
            REPLACE(pessoa_record.cep, '-', ''), -- Remove hífen do CEP
            pessoa_record.logradouro,
            COALESCE(pessoa_record.numero, 'S/N'),
            pessoa_record.complemento,
            COALESCE(pessoa_record.bairro, ''),
            pessoa_record.cidade,
            pessoa_record.uf
        )
        RETURNING id INTO novo_endereco_id;

        -- Atualizar a pessoa com a referência do novo endereço
        UPDATE teamcruz.professores
        SET endereco_id = novo_endereco_id
        WHERE id = pessoa_record.id;

        RAISE NOTICE 'Migrado endereço para pessoa ID: %', pessoa_record.id;
    END LOOP;
END $$;

-- 4. Remover os campos de endereço antigos
-- Importante: Fazer isso após migrar os dados!

ALTER TABLE teamcruz.professores DROP COLUMN IF EXISTS cep;
ALTER TABLE teamcruz.professores DROP COLUMN IF EXISTS logradouro;
ALTER TABLE teamcruz.professores DROP COLUMN IF EXISTS numero;
ALTER TABLE teamcruz.professores DROP COLUMN IF EXISTS complemento;
ALTER TABLE teamcruz.professores DROP COLUMN IF EXISTS bairro;
ALTER TABLE teamcruz.professores DROP COLUMN IF EXISTS cidade;
ALTER TABLE teamcruz.professores DROP COLUMN IF EXISTS uf;

-- 5. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_professores_endereco ON teamcruz.professores(endereco_id);

-- 6. Adicionar comentário
COMMENT ON COLUMN teamcruz.professores.endereco_id IS 'Referência para a tabela de endereços';

-- 7. Verificar o resultado
SELECT
    'Migração concluída!' as status,
    COUNT(*) as total_registros,
    COUNT(endereco_id) as registros_com_endereco
FROM teamcruz.professores;

-- Verificar se a estrutura está correta
\d teamcruz.professores

-- Verificar alguns endereços migrados
SELECT
    p.id as pessoa_id,
    p.nome_completo,
    e.cep,
    e.cidade,
    e.estado
FROM teamcruz.professores p
LEFT JOIN teamcruz.enderecos e ON p.endereco_id = e.id
WHERE p.endereco_id IS NOT NULL
LIMIT 5;