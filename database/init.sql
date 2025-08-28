-- TeamCruz Jiu-Jitsu Database Schema
-- Sistema de Controle de Presença e Graduação

-- Criar schema específico para TeamCruz
CREATE SCHEMA IF NOT EXISTS teamcruz;

-- Configurar search_path
SET search_path TO teamcruz, public;

-- Enum para status
CREATE TYPE status_type AS ENUM ('ativo', 'inativo', 'suspenso');
CREATE TYPE modo_registro AS ENUM ('qr', 'totem', 'manual', 'app');
CREATE TYPE tipo_turma AS ENUM ('kids', 'adulto', 'competicao', 'feminino', 'iniciante');
CREATE TYPE tipo_acao AS ENUM ('create', 'update', 'delete');
CREATE TYPE origem_grau AS ENUM ('automatico', 'manual', 'evento', 'correcao');

-- Tabela de Faixas (Belts)
CREATE TABLE faixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(50) NOT NULL,
    ordem INTEGER NOT NULL UNIQUE,
    cor VARCHAR(30) NOT NULL,
    hex_color VARCHAR(7) NOT NULL,
    max_graus INTEGER DEFAULT 4,
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Unidades
CREATE TABLE unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(100),
    cnpj VARCHAR(20),
    logo_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Professores/Instrutores
CREATE TABLE instrutores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    faixa_id UUID REFERENCES faixas(id),
    graus INTEGER DEFAULT 0,
    registro_confederacao VARCHAR(50),
    foto_url TEXT,
    bio TEXT,
    usuario_id INTEGER, -- Link com sistema de usuários existente
    status status_type DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Alunos
CREATE TABLE alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14),
    rg VARCHAR(20),
    data_nascimento DATE,
    email VARCHAR(100),
    telefone VARCHAR(20),
    telefone_emergencia VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    foto_url TEXT,
    
    -- Dados de Graduação
    faixa_atual_id UUID REFERENCES faixas(id) NOT NULL,
    graus_atual INTEGER DEFAULT 0 CHECK (graus_atual >= 0 AND graus_atual <= 4),
    aulas_desde_ultimo_grau INTEGER DEFAULT 0,
    data_ultima_graduacao DATE,
    
    -- Dados administrativos
    data_matricula DATE DEFAULT CURRENT_DATE,
    numero_matricula VARCHAR(20) UNIQUE,
    unidade_id UUID REFERENCES unidades(id),
    observacoes TEXT,
    atestado_medico_validade DATE,
    plano_saude VARCHAR(100),
    restricoes_medicas TEXT,
    
    -- Responsável (para menores)
    responsavel_nome VARCHAR(100),
    responsavel_cpf VARCHAR(14),
    responsavel_telefone VARCHAR(20),
    responsavel_parentesco VARCHAR(50),
    
    -- Controle e LGPD
    status status_type DEFAULT 'ativo',
    consent_lgpd BOOLEAN DEFAULT false,
    consent_lgpd_date TIMESTAMP WITH TIME ZONE,
    consent_imagem BOOLEAN DEFAULT false,
    usuario_id INTEGER, -- Link com sistema de usuários existente
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Turmas
CREATE TABLE turmas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    tipo tipo_turma NOT NULL,
    instrutor_id UUID REFERENCES instrutores(id),
    unidade_id UUID REFERENCES unidades(id),
    capacidade INTEGER DEFAULT 30,
    descricao TEXT,
    nivel VARCHAR(50), -- iniciante, intermediario, avancado
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Horários das Turmas
CREATE TABLE horarios_turma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID REFERENCES turmas(id) ON DELETE CASCADE,
    dia_semana INTEGER CHECK (dia_semana >= 1 AND dia_semana <= 7), -- 1=Dom, 2=Seg...
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Aulas
CREATE TABLE aulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id UUID REFERENCES turmas(id) NOT NULL,
    instrutor_id UUID REFERENCES instrutores(id) NOT NULL,
    data_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_hora_fim TIMESTAMP WITH TIME ZONE,
    tema_aula VARCHAR(200),
    descricao TEXT,
    status VARCHAR(20) DEFAULT 'agendada' CHECK (status IN ('agendada', 'aberta', 'fechada', 'cancelada')),
    peso_aula DECIMAL(2,1) DEFAULT 1.0, -- Para aulas especiais que valem mais
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Presenças
CREATE TABLE presencas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aula_id UUID REFERENCES aulas(id) ON DELETE CASCADE NOT NULL,
    aluno_id UUID REFERENCES alunos(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'presente' CHECK (status IN ('presente', 'falta', 'justificada', 'cancelada')),
    modo_registro modo_registro DEFAULT 'manual',
    hora_checkin TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    peso_presenca DECIMAL(2,1) DEFAULT 1.0,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Evitar duplicação
    UNIQUE(aula_id, aluno_id)
);

-- Tabela de Regras de Progressão
CREATE TABLE regras_progressao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    escopo VARCHAR(20) CHECK (escopo IN ('global', 'unidade', 'turma', 'faixa')),
    escopo_id UUID, -- ID da unidade, turma ou faixa
    aulas_por_grau INTEGER DEFAULT 20,
    max_graus INTEGER DEFAULT 4,
    carencia_dias INTEGER DEFAULT 0,
    peso_tipo_aula JSONB, -- {"competicao": 1.5, "seminario": 2.0}
    prioridade INTEGER DEFAULT 0, -- Maior prioridade sobrescreve
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Histórico de Graus
CREATE TABLE historico_graus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES alunos(id) NOT NULL,
    faixa_id UUID REFERENCES faixas(id) NOT NULL,
    grau_numero INTEGER NOT NULL CHECK (grau_numero >= 1 AND grau_numero <= 4),
    data_concessao DATE DEFAULT CURRENT_DATE,
    origem origem_grau DEFAULT 'automatico',
    aulas_acumuladas INTEGER,
    justificativa TEXT,
    certificado_url TEXT,
    evento_id UUID,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Histórico de Faixas
CREATE TABLE historico_faixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES alunos(id) NOT NULL,
    faixa_origem_id UUID REFERENCES faixas(id),
    faixa_destino_id UUID REFERENCES faixas(id) NOT NULL,
    data_promocao DATE DEFAULT CURRENT_DATE,
    evento VARCHAR(200),
    certificado_url TEXT,
    observacoes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Eventos de Graduação
CREATE TABLE eventos_graduacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    data_evento DATE NOT NULL,
    local VARCHAR(200),
    descricao TEXT,
    unidade_id UUID REFERENCES unidades(id),
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Participantes do Evento
CREATE TABLE participantes_evento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID REFERENCES eventos_graduacao(id) ON DELETE CASCADE,
    aluno_id UUID REFERENCES alunos(id),
    tipo_graduacao VARCHAR(20) CHECK (tipo_graduacao IN ('grau', 'faixa')),
    faixa_nova_id UUID REFERENCES faixas(id),
    graus_novos INTEGER,
    compareceu BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Auditoria
CREATE TABLE auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidade VARCHAR(50) NOT NULL,
    entidade_id UUID NOT NULL,
    acao tipo_acao NOT NULL,
    dados_antes JSONB,
    dados_depois JSONB,
    motivo TEXT,
    ip_address INET,
    user_agent TEXT,
    actor_id UUID,
    actor_tipo VARCHAR(20), -- 'aluno', 'instrutor', 'admin'
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Notificações
CREATE TABLE notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destinatario_id UUID NOT NULL,
    destinatario_tipo VARCHAR(20) CHECK (destinatario_tipo IN ('aluno', 'instrutor', 'admin')),
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    dados JSONB,
    lida BOOLEAN DEFAULT false,
    data_leitura TIMESTAMP WITH TIME ZONE,
    enviada BOOLEAN DEFAULT false,
    data_envio TIMESTAMP WITH TIME ZONE,
    canal VARCHAR(20) CHECK (canal IN ('app', 'email', 'whatsapp', 'push')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Configurações do Sistema
CREATE TABLE configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) CHECK (tipo IN ('sistema', 'unidade', 'interface')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_alunos_faixa ON alunos(faixa_atual_id);
CREATE INDEX idx_alunos_status ON alunos(status);
CREATE INDEX idx_alunos_unidade ON alunos(unidade_id);
CREATE INDEX idx_presencas_aluno ON presencas(aluno_id);
CREATE INDEX idx_presencas_aula ON presencas(aula_id);
CREATE INDEX idx_presencas_data ON presencas(created_at);
CREATE INDEX idx_aulas_turma ON aulas(turma_id);
CREATE INDEX idx_aulas_data ON aulas(data_hora_inicio);
CREATE INDEX idx_aulas_status ON aulas(status);
CREATE INDEX idx_historico_graus_aluno ON historico_graus(aluno_id);
CREATE INDEX idx_historico_faixas_aluno ON historico_faixas(aluno_id);
CREATE INDEX idx_auditoria_entidade ON auditoria(entidade, entidade_id);
CREATE INDEX idx_auditoria_timestamp ON auditoria(timestamp);
CREATE INDEX idx_notificacoes_destinatario ON notificacoes(destinatario_id, destinatario_tipo);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);

-- Inserir dados iniciais de faixas
INSERT INTO faixas (nome, ordem, cor, hex_color, max_graus) VALUES
('Branca', 1, 'Branco', '#FFFFFF', 4),
('Cinza', 2, 'Cinza', '#808080', 4),
('Amarela', 3, 'Amarelo', '#FFD700', 4),
('Laranja', 4, 'Laranja', '#FFA500', 4),
('Verde', 5, 'Verde', '#008000', 4),
('Azul', 6, 'Azul', '#0000FF', 4),
('Roxa', 7, 'Roxo', '#800080', 4),
('Marrom', 8, 'Marrom', '#8B4513', 4),
('Preta', 9, 'Preto', '#000000', 10),
('Coral', 10, 'Coral', '#FF7F50', 10),
('Vermelha', 11, 'Vermelho', '#FF0000', 10);

-- Inserir unidade padrão TeamCruz
INSERT INTO unidades (nome, endereco, telefone, email) VALUES
('TeamCruz Matriz', 'Rua das Artes Marciais, 1000 - Centro', '(11) 98765-4321', 'contato@teamcruz.com.br');

-- Inserir configurações padrão
INSERT INTO configuracoes (chave, valor, descricao, tipo) VALUES
('aulas_por_grau_padrao', '20', 'Número padrão de aulas necessárias para ganhar um grau', 'sistema'),
('max_graus_por_faixa', '4', 'Número máximo de graus por faixa (exceto preta)', 'sistema'),
('permitir_checkin_multiplo', 'false', 'Permitir check-in em múltiplas aulas no mesmo horário', 'sistema'),
('tempo_tolerancia_checkin', '15', 'Minutos de tolerância para check-in após início da aula', 'sistema'),
('notificar_proximidade_grau', 'true', 'Notificar quando aluno estiver próximo de novo grau', 'sistema'),
('aulas_aviso_proximidade', '3', 'Quantas aulas antes de avisar proximidade de grau', 'sistema');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_faixas_updated_at BEFORE UPDATE ON faixas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_unidades_updated_at BEFORE UPDATE ON unidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instrutores_updated_at BEFORE UPDATE ON instrutores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alunos_updated_at BEFORE UPDATE ON alunos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_turmas_updated_at BEFORE UPDATE ON turmas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aulas_updated_at BEFORE UPDATE ON aulas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_regras_progressao_updated_at BEFORE UPDATE ON regras_progressao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_eventos_graduacao_updated_at BEFORE UPDATE ON eventos_graduacao FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON configuracoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para calcular e atualizar graus automaticamente
CREATE OR REPLACE FUNCTION atualizar_graus_aluno()
RETURNS TRIGGER AS $$
DECLARE
    v_aulas_por_grau INTEGER;
    v_max_graus INTEGER;
    v_graus_ganhos INTEGER;
    v_aulas_restantes INTEGER;
BEGIN
    -- Buscar regra de progressão aplicável
    SELECT COALESCE(rp.aulas_por_grau, 20), COALESCE(rp.max_graus, 4)
    INTO v_aulas_por_grau, v_max_graus
    FROM regras_progressao rp
    WHERE rp.ativo = true
    ORDER BY rp.prioridade DESC
    LIMIT 1;
    
    -- Se não encontrar regra, usar padrão
    IF v_aulas_por_grau IS NULL THEN
        v_aulas_por_grau := 20;
        v_max_graus := 4;
    END IF;
    
    -- Atualizar contador de aulas do aluno
    UPDATE alunos 
    SET aulas_desde_ultimo_grau = aulas_desde_ultimo_grau + 1
    WHERE id = NEW.aluno_id;
    
    -- Verificar se ganhou graus
    SELECT 
        aulas_desde_ultimo_grau / v_aulas_por_grau,
        aulas_desde_ultimo_grau % v_aulas_por_grau
    INTO v_graus_ganhos, v_aulas_restantes
    FROM alunos
    WHERE id = NEW.aluno_id;
    
    -- Se ganhou graus e ainda não atingiu o máximo
    IF v_graus_ganhos > 0 THEN
        UPDATE alunos
        SET 
            graus_atual = LEAST(graus_atual + v_graus_ganhos, v_max_graus),
            aulas_desde_ultimo_grau = v_aulas_restantes,
            data_ultima_graduacao = CURRENT_DATE
        WHERE id = NEW.aluno_id
        AND graus_atual < v_max_graus;
        
        -- Registrar no histórico
        IF FOUND THEN
            INSERT INTO historico_graus (
                aluno_id, 
                faixa_id, 
                grau_numero, 
                origem, 
                aulas_acumuladas
            )
            SELECT 
                NEW.aluno_id,
                faixa_atual_id,
                graus_atual,
                'automatico',
                v_aulas_por_grau
            FROM alunos
            WHERE id = NEW.aluno_id;
            
            -- Criar notificação
            INSERT INTO notificacoes (
                destinatario_id,
                destinatario_tipo,
                tipo,
                titulo,
                mensagem
            ) VALUES (
                NEW.aluno_id,
                'aluno',
                'novo_grau',
                'Parabéns! Você ganhou um novo grau!',
                'Você completou ' || v_aulas_por_grau || ' aulas e conquistou um novo grau!'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar graus após presença
CREATE TRIGGER trigger_atualizar_graus 
AFTER INSERT ON presencas
FOR EACH ROW
WHEN (NEW.status = 'presente')
EXECUTE FUNCTION atualizar_graus_aluno();

-- View para dashboard de alunos
CREATE VIEW v_dashboard_aluno AS
SELECT 
    a.id,
    a.nome,
    a.foto_url,
    f.nome as faixa,
    f.cor,
    f.hex_color,
    a.graus_atual,
    f.max_graus,
    a.aulas_desde_ultimo_grau,
    (SELECT aulas_por_grau FROM regras_progressao WHERE ativo = true ORDER BY prioridade DESC LIMIT 1) - a.aulas_desde_ultimo_grau as aulas_faltantes,
    a.data_ultima_graduacao,
    (SELECT COUNT(*) FROM presencas p WHERE p.aluno_id = a.id AND p.status = 'presente') as total_presencas,
    (SELECT COUNT(*) FROM presencas p 
     JOIN aulas au ON p.aula_id = au.id 
     WHERE p.aluno_id = a.id 
     AND p.status = 'presente' 
     AND DATE_TRUNC('month', au.data_hora_inicio) = DATE_TRUNC('month', CURRENT_DATE)) as presencas_mes,
    CASE 
        WHEN a.graus_atual >= f.max_graus THEN true
        ELSE false
    END as elegivel_promocao
FROM alunos a
JOIN faixas f ON a.faixa_atual_id = f.id;

-- View para próximos graduáveis
CREATE VIEW v_proximos_graduaveis AS
SELECT 
    a.id,
    a.nome,
    f.nome as faixa,
    a.graus_atual,
    a.aulas_desde_ultimo_grau,
    20 - a.aulas_desde_ultimo_grau as aulas_faltantes
FROM alunos a
JOIN faixas f ON a.faixa_atual_id = f.id
WHERE a.status = 'ativo'
AND a.aulas_desde_ultimo_grau >= 17  -- Faltam 3 ou menos aulas
AND a.graus_atual < f.max_graus
ORDER BY aulas_faltantes ASC;

-- Dados de exemplo (mockados)
-- Inserir alguns instrutores
INSERT INTO instrutores (nome, email, faixa_id, graus) 
SELECT 
    'Professor Carlos Cruz',
    'carlos@teamcruz.com.br',
    (SELECT id FROM faixas WHERE nome = 'Preta'),
    3;

INSERT INTO instrutores (nome, email, faixa_id, graus)
SELECT
    'Professor João Silva',
    'joao@teamcruz.com.br',
    (SELECT id FROM faixas WHERE nome = 'Marrom'),
    2;

-- Inserir turmas
INSERT INTO turmas (nome, tipo, instrutor_id, unidade_id, capacidade)
SELECT 
    'Adulto Manhã',
    'adulto',
    (SELECT id FROM instrutores WHERE nome = 'Professor Carlos Cruz'),
    (SELECT id FROM unidades WHERE nome = 'TeamCruz Matriz'),
    30;

INSERT INTO turmas (nome, tipo, instrutor_id, unidade_id, capacidade)
SELECT 
    'Kids Tarde',
    'kids',
    (SELECT id FROM instrutores WHERE nome = 'Professor João Silva'),
    (SELECT id FROM unidades WHERE nome = 'TeamCruz Matriz'),
    20;

INSERT INTO turmas (nome, tipo, instrutor_id, unidade_id, capacidade)
SELECT 
    'Competição',
    'competicao',
    (SELECT id FROM instrutores WHERE nome = 'Professor Carlos Cruz'),
    (SELECT id FROM unidades WHERE nome = 'TeamCruz Matriz'),
    15;

-- Inserir horários das turmas
INSERT INTO horarios_turma (turma_id, dia_semana, hora_inicio, hora_fim)
SELECT 
    id, dia, hora_inicio::time, hora_fim::time
FROM turmas
CROSS JOIN (
    VALUES 
    (2, '07:00', '08:30'), -- Segunda
    (3, '07:00', '08:30'), -- Terça
    (4, '07:00', '08:30'), -- Quarta
    (5, '07:00', '08:30'), -- Quinta
    (6, '07:00', '08:30')  -- Sexta
) AS h(dia, hora_inicio, hora_fim)
WHERE nome = 'Adulto Manhã';

-- Criar índice único para melhor performance em queries de ranking
CREATE INDEX idx_presencas_ranking ON presencas(aluno_id, status) WHERE status = 'presente';

-- Comentários nas tabelas para documentação
COMMENT ON TABLE alunos IS 'Tabela principal de alunos do TeamCruz Jiu-Jitsu';
COMMENT ON COLUMN alunos.graus_atual IS 'Número de graus (stripes) na faixa atual (0-4)';
COMMENT ON COLUMN alunos.aulas_desde_ultimo_grau IS 'Contador de aulas desde o último grau conquistado';
COMMENT ON TABLE presencas IS 'Registro de presença dos alunos nas aulas';
COMMENT ON TABLE regras_progressao IS 'Regras configuráveis para progressão de graus e faixas';
