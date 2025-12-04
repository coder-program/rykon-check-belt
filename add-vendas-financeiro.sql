-- Migration: Adicionar tabela de vendas e melhorias no módulo financeiro
-- Data: 2025-11-30

-- Tabela de Vendas Online
CREATE TABLE IF NOT EXISTS teamcruz.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_venda VARCHAR(50) UNIQUE NOT NULL,
    aluno_id UUID NOT NULL REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES teamcruz.unidades(id) ON DELETE SET NULL,
    fatura_id UUID REFERENCES teamcruz.faturas(id) ON DELETE SET NULL,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    metodo_pagamento VARCHAR(20) NOT NULL DEFAULT 'PIX' CHECK (metodo_pagamento IN ('PIX', 'CARTAO', 'BOLETO', 'DINHEIRO', 'TRANSFERENCIA')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'PAGO', 'AGUARDANDO', 'FALHOU', 'CANCELADO', 'ESTORNADO')),
    gateway_payment_id VARCHAR(255),
    link_pagamento VARCHAR(500),
    qr_code_pix TEXT,
    codigo_barras_boleto VARCHAR(255),
    dados_gateway JSONB,
    data_pagamento TIMESTAMP,
    data_expiracao TIMESTAMP,
    observacoes TEXT,
    ip_origem VARCHAR(100),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendas_aluno ON teamcruz.vendas(aluno_id);
CREATE INDEX idx_vendas_unidade ON teamcruz.vendas(unidade_id);
CREATE INDEX idx_vendas_status ON teamcruz.vendas(status);
CREATE INDEX idx_vendas_gateway_id ON teamcruz.vendas(gateway_payment_id);
CREATE INDEX idx_vendas_created_at ON teamcruz.vendas(created_at);

-- Trigger para updated_at em vendas
CREATE TRIGGER update_vendas_updated_at
BEFORE UPDATE ON teamcruz.vendas
FOR EACH ROW
EXECUTE FUNCTION teamcruz.update_updated_at_column();

-- Adicionar campos de mensagens personalizadas em configuracoes_cobranca se não existirem
ALTER TABLE teamcruz.configuracoes_cobranca
ADD COLUMN IF NOT EXISTS whatsapp_api_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS whatsapp_api_token VARCHAR(255);

-- Comentários
COMMENT ON TABLE teamcruz.vendas IS 'Vendas online processadas via gateway de pagamento';
COMMENT ON COLUMN teamcruz.vendas.gateway_payment_id IS 'ID da transação no gateway de pagamento';
COMMENT ON COLUMN teamcruz.vendas.dados_gateway IS 'Dados completos retornados pelo gateway';

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Tabela de vendas criada com sucesso!';
    RAISE NOTICE '✅ Índices e triggers configurados';
END $$;
