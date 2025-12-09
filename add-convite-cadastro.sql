-- Tabela para armazenar convites de cadastro
CREATE TABLE IF NOT EXISTS teamcruz.convites_cadastro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(255) UNIQUE NOT NULL,
  tipo_cadastro VARCHAR(20) NOT NULL, -- 'ALUNO' ou 'RESPONSAVEL'
  unidade_id UUID NOT NULL REFERENCES teamcruz.unidades(id),
  email VARCHAR(255),
  telefone VARCHAR(20),
  nome_pre_cadastro VARCHAR(255),
  cpf VARCHAR(14),
  usado BOOLEAN DEFAULT FALSE,
  usuario_criado_id UUID REFERENCES teamcruz.usuarios(id),
  data_expiracao TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  criado_por UUID REFERENCES teamcruz.usuarios(id),
  criado_em TIMESTAMP DEFAULT NOW(),
  usado_em TIMESTAMP,
  observacoes TEXT
);

-- Índices
CREATE INDEX idx_convites_token ON teamcruz.convites_cadastro(token);
CREATE INDEX idx_convites_unidade ON teamcruz.convites_cadastro(unidade_id);
CREATE INDEX idx_convites_usado ON teamcruz.convites_cadastro(usado);
CREATE INDEX idx_convites_expiracao ON teamcruz.convites_cadastro(data_expiracao);

-- Comentários
COMMENT ON TABLE teamcruz.convites_cadastro IS 'Armazena convites para cadastro de alunos e responsáveis via link';
COMMENT ON COLUMN teamcruz.convites_cadastro.token IS 'Token único para o link de cadastro';
COMMENT ON COLUMN teamcruz.convites_cadastro.tipo_cadastro IS 'Tipo de cadastro: ALUNO ou RESPONSAVEL';
COMMENT ON COLUMN teamcruz.convites_cadastro.usado IS 'Se o convite já foi utilizado';
COMMENT ON COLUMN teamcruz.convites_cadastro.data_expiracao IS 'Data de expiração do convite (padrão 7 dias)';
