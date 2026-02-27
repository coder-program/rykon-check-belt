-- Migration: Adicionar campos tipo_graduacao e icone à tabela modalidades
-- Data: 23/02/2026
-- Descrição: RF01 — Suporte a múltiplas modalidades com sistema de graduação configurável
-- RN05: tipo_graduacao define qual sistema de graduação será usado

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
          AND table_name = 'modalidades'
          AND column_name = 'tipo_graduacao'
    ) THEN
        ALTER TABLE teamcruz.modalidades
            ADD COLUMN tipo_graduacao varchar(20) NOT NULL DEFAULT 'NENHUM';

        ALTER TABLE teamcruz.modalidades
            ADD CONSTRAINT chk_modalidades_tipo_graduacao
            CHECK (tipo_graduacao IN ('FAIXA', 'GRAU', 'KYU_DAN', 'CORDAO', 'LIVRE', 'NENHUM'));

        RAISE NOTICE 'Coluna tipo_graduacao adicionada à tabela modalidades';
    ELSE
        RAISE NOTICE 'Coluna tipo_graduacao já existe — pulando.';
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'teamcruz'
          AND table_name = 'modalidades'
          AND column_name = 'icone'
    ) THEN
        ALTER TABLE teamcruz.modalidades
            ADD COLUMN icone varchar(50) NULL;

        RAISE NOTICE 'Coluna icone adicionada à tabela modalidades';
    ELSE
        RAISE NOTICE 'Coluna icone já existe — pulando.';
    END IF;
END
$$;
