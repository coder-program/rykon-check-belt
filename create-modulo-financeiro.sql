-- Migration: Criar módulo financeiro completo
-- Data: 2025-11-30
-- Descrição: Cria todas as tabelas do módulo financeiro

-- Tabela de Planos
CREATE TABLE IF NOT EXISTS teamcruz.planos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('MENSAL', 'SEMESTRAL', 'ANUAL', 'AVULSO')),
    valor DECIMAL(10, 2) NOT NULL,
    descricao TEXT,
    beneficios TEXT,
    duracao_meses INTEGER DEFAULT 1,
    numero_aulas INTEGER,
    recorrencia_automatica BOOLEAN DEFAULT true,
    unidade_id UUID REFERENCES teamcruz.unidades(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_planos_unidade ON teamcruz.planos(unidade_id);
CREATE INDEX idx_planos_tipo ON teamcruz.planos(tipo);
CREATE INDEX idx_planos_ativo ON teamcruz.planos(ativo);

-- Tabela de Assinaturas
CREATE TABLE IF NOT EXISTS teamcruz.assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    plano_id UUID NOT NULL REFERENCES teamcruz.planos(id) ON DELETE RESTRICT,
    unidade_id UUID NOT NULL REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'PAUSADA', 'CANCELADA', 'INADIMPLENTE', 'EXPIRADA')),
    metodo_pagamento VARCHAR(20) NOT NULL DEFAULT 'PIX' CHECK (metodo_pagamento IN ('PIX', 'CARTAO', 'BOLETO', 'DINHEIRO', 'TRANSFERENCIA')),
    valor DECIMAL(10, 2) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    proxima_cobranca DATE,
    dia_vencimento INTEGER DEFAULT 10,
    token_cartao VARCHAR(255),
    dados_pagamento JSONB,
    cancelado_por UUID REFERENCES teamcruz.usuarios(id),
    cancelado_em TIMESTAMP,
    motivo_cancelamento TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assinaturas_aluno ON teamcruz.assinaturas(aluno_id);
CREATE INDEX idx_assinaturas_plano ON teamcruz.assinaturas(plano_id);
CREATE INDEX idx_assinaturas_unidade ON teamcruz.assinaturas(unidade_id);
CREATE INDEX idx_assinaturas_status ON teamcruz.assinaturas(status);
CREATE INDEX idx_assinaturas_proxima_cobranca ON teamcruz.assinaturas(proxima_cobranca);

-- Tabela de Faturas
CREATE TABLE IF NOT EXISTS teamcruz.faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assinatura_id UUID REFERENCES teamcruz.assinaturas(id) ON DELETE SET NULL,
    aluno_id UUID NOT NULL REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    numero_fatura VARCHAR(50) UNIQUE NOT NULL,
    descricao VARCHAR(255),
    valor_original DECIMAL(10, 2) NOT NULL,
    valor_desconto DECIMAL(10, 2) DEFAULT 0,
    valor_acrescimo DECIMAL(10, 2) DEFAULT 0,
    valor_total DECIMAL(10, 2) NOT NULL,
    valor_pago DECIMAL(10, 2) DEFAULT 0,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(25) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA', 'PARCIALMENTE_PAGA', 'NEGOCIADA')),
    metodo_pagamento VARCHAR(20) CHECK (metodo_pagamento IN ('PIX', 'CARTAO', 'BOLETO', 'DINHEIRO', 'TRANSFERENCIA')),
    gateway_payment_id VARCHAR(255),
    link_pagamento VARCHAR(500),
    qr_code_pix TEXT,
    codigo_barras_boleto VARCHAR(255),
    dados_gateway JSONB,
    observacoes TEXT,
    criado_por UUID REFERENCES teamcruz.usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_faturas_assinatura ON teamcruz.faturas(assinatura_id);
CREATE INDEX idx_faturas_aluno ON teamcruz.faturas(aluno_id);
CREATE INDEX idx_faturas_numero ON teamcruz.faturas(numero_fatura);
CREATE INDEX idx_faturas_status ON teamcruz.faturas(status);
CREATE INDEX idx_faturas_vencimento ON teamcruz.faturas(data_vencimento);
CREATE INDEX idx_faturas_gateway_id ON teamcruz.faturas(gateway_payment_id);

-- Tabela de Despesas
CREATE TABLE IF NOT EXISTS teamcruz.despesas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID NOT NULL REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('ALUGUEL', 'AGUA', 'LUZ', 'INTERNET', 'TELEFONE', 'SALARIO', 'FORNECEDOR', 'MANUTENCAO', 'MATERIAL', 'LIMPEZA', 'MARKETING', 'TAXA', 'OUTRO')),
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    recorrencia VARCHAR(20) DEFAULT 'UNICA' CHECK (recorrencia IN ('UNICA', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
    status VARCHAR(25) NOT NULL DEFAULT 'A_PAGAR' CHECK (status IN ('A_PAGAR', 'PAGA', 'ATRASADA', 'CANCELADA', 'PARCIALMENTE_PAGA')),
    anexo VARCHAR(500),
    fornecedor VARCHAR(255),
    numero_documento VARCHAR(100),
    observacoes TEXT,
    criado_por UUID REFERENCES teamcruz.usuarios(id),
    pago_por UUID REFERENCES teamcruz.usuarios(id),
    lembrete_enviado BOOLEAN DEFAULT false,
    data_proximo_vencimento DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_despesas_unidade ON teamcruz.despesas(unidade_id);
CREATE INDEX idx_despesas_categoria ON teamcruz.despesas(categoria);
CREATE INDEX idx_despesas_status ON teamcruz.despesas(status);
CREATE INDEX idx_despesas_vencimento ON teamcruz.despesas(data_vencimento);

-- Tabela de Transações
CREATE TABLE IF NOT EXISTS teamcruz.transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    origem VARCHAR(20) NOT NULL CHECK (origem IN ('FATURA', 'VENDA', 'DESPESA', 'MANUAL', 'ESTORNO', 'GYMPASS', 'CORPORATE')),
    categoria VARCHAR(20) NOT NULL DEFAULT 'OUTRO' CHECK (categoria IN ('MENSALIDADE', 'PRODUTO', 'AULA_AVULSA', 'COMPETICAO', 'TAXA', 'ALUGUEL', 'SALARIO', 'FORNECEDOR', 'UTILIDADE', 'OUTRO')),
    descricao VARCHAR(255) NOT NULL,
    aluno_id UUID REFERENCES teamcruz.alunos(id) ON DELETE SET NULL,
    unidade_id UUID REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
    fatura_id UUID REFERENCES teamcruz.faturas(id) ON DELETE SET NULL,
    despesa_id UUID REFERENCES teamcruz.despesas(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA' CHECK (status IN ('CONFIRMADA', 'PENDENTE', 'CANCELADA', 'ESTORNADA')),
    metodo_pagamento VARCHAR(20) CHECK (metodo_pagamento IN ('PIX', 'CARTAO', 'BOLETO', 'DINHEIRO', 'TRANSFERENCIA')),
    comprovante VARCHAR(255),
    observacoes TEXT,
    criado_por UUID REFERENCES teamcruz.usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transacoes_tipo ON teamcruz.transacoes(tipo);
CREATE INDEX idx_transacoes_origem ON teamcruz.transacoes(origem);
CREATE INDEX idx_transacoes_aluno ON teamcruz.transacoes(aluno_id);
CREATE INDEX idx_transacoes_unidade ON teamcruz.transacoes(unidade_id);
CREATE INDEX idx_transacoes_fatura ON teamcruz.transacoes(fatura_id);
CREATE INDEX idx_transacoes_despesa ON teamcruz.transacoes(despesa_id);
CREATE INDEX idx_transacoes_data ON teamcruz.transacoes(data);
CREATE INDEX idx_transacoes_status ON teamcruz.transacoes(status);

-- Tabela de Configurações de Cobrança
CREATE TABLE IF NOT EXISTS teamcruz.configuracoes_cobranca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID UNIQUE NOT NULL REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
    aceita_pix BOOLEAN DEFAULT true,
    aceita_cartao BOOLEAN DEFAULT true,
    aceita_boleto BOOLEAN DEFAULT true,
    aceita_dinheiro BOOLEAN DEFAULT true,
    aceita_transferencia BOOLEAN DEFAULT true,
    multa_atraso_percentual DECIMAL(5, 2) DEFAULT 2.0,
    juros_diario_percentual DECIMAL(5, 2) DEFAULT 0.033,
    dias_bloqueio_inadimplencia INTEGER DEFAULT 30,
    dia_vencimento_padrao INTEGER DEFAULT 10,
    faturas_vencidas_para_inadimplencia INTEGER DEFAULT 2,
    gateway_tipo VARCHAR(100),
    gateway_api_key VARCHAR(255),
    gateway_secret_key VARCHAR(255),
    gateway_modo_producao BOOLEAN DEFAULT false,
    gateway_configuracoes JSONB,
    gympass_ativo BOOLEAN DEFAULT false,
    gympass_unidade_id VARCHAR(255),
    gympass_percentual_repasse DECIMAL(5, 2),
    mensagem_cobranca_whatsapp JSONB,
    mensagem_cobranca_email JSONB,
    enviar_lembrete_vencimento BOOLEAN DEFAULT true,
    dias_antecedencia_lembrete INTEGER DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_cobranca_unidade ON teamcruz.configuracoes_cobranca(unidade_id);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION teamcruz.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_planos_updated_at BEFORE UPDATE ON teamcruz.planos FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();
CREATE TRIGGER update_assinaturas_updated_at BEFORE UPDATE ON teamcruz.assinaturas FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();
CREATE TRIGGER update_faturas_updated_at BEFORE UPDATE ON teamcruz.faturas FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();
CREATE TRIGGER update_despesas_updated_at BEFORE UPDATE ON teamcruz.despesas FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();
CREATE TRIGGER update_transacoes_updated_at BEFORE UPDATE ON teamcruz.transacoes FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();
CREATE TRIGGER update_config_cobranca_updated_at BEFORE UPDATE ON teamcruz.configuracoes_cobranca FOR EACH ROW EXECUTE FUNCTION teamcruz.update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE teamcruz.planos IS 'Planos de mensalidade da academia (mensal, semestral, anual)';
COMMENT ON TABLE teamcruz.assinaturas IS 'Assinaturas ativas dos alunos vinculadas a planos';
COMMENT ON TABLE teamcruz.faturas IS 'Faturas geradas para cobrança dos alunos';
COMMENT ON TABLE teamcruz.despesas IS 'Contas a pagar da unidade';
COMMENT ON TABLE teamcruz.transacoes IS 'Registro de todas as transações financeiras';
COMMENT ON TABLE teamcruz.configuracoes_cobranca IS 'Configurações de cobrança e integração de pagamento por unidade';

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Módulo financeiro criado com sucesso!';
    RAISE NOTICE 'Tabelas criadas: planos, assinaturas, faturas, despesas, transacoes, configuracoes_cobranca';
END $$;
