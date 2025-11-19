-- Migration: Adicionar campos de contrato à tabela franqueados
-- Data: 2025-11-18
-- Descrição: Adiciona campos para controle de aceite de contrato pelos franqueados

ALTER TABLE teamcruz.franqueados
ADD COLUMN IF NOT EXISTS contrato_aceito BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS contrato_aceito_em TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS contrato_versao VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS contrato_ip VARCHAR(45) NULL;

COMMENT ON COLUMN teamcruz.franqueados.contrato_aceito IS 'Indica se o franqueado aceitou o contrato';
COMMENT ON COLUMN teamcruz.franqueados.contrato_aceito_em IS 'Data e hora em que o contrato foi aceito';
COMMENT ON COLUMN teamcruz.franqueados.contrato_versao IS 'Versão do contrato que foi aceita (ex: v1.0)';
COMMENT ON COLUMN teamcruz.franqueados.contrato_ip IS 'Endereço IP de onde o contrato foi aceito';
