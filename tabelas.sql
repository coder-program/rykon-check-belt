-- teamcruz.audit_logs definição

-- Drop table

-- DROP TABLE teamcruz.audit_logs;

CREATE TABLE teamcruz.audit_logs (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"action" teamcruz."audit_action_enum" NOT NULL,
	entity_name varchar(100) NOT NULL,
	entity_id varchar(100) NULL,
	user_id varchar(100) NOT NULL,
	username varchar(100) NOT NULL,
	ip_address varchar(45) NOT NULL,
	user_agent varchar(500) NULL,
	old_values text NULL,
	new_values text NULL,
	description text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_audit_logs_action ON teamcruz.audit_logs USING btree (action);
CREATE INDEX idx_audit_logs_created_at ON teamcruz.audit_logs USING btree (created_at);
CREATE INDEX idx_audit_logs_entity_id ON teamcruz.audit_logs USING btree (entity_id);
CREATE INDEX idx_audit_logs_entity_name ON teamcruz.audit_logs USING btree (entity_name);
CREATE INDEX idx_audit_logs_user_id ON teamcruz.audit_logs USING btree (user_id);
CREATE INDEX idx_audit_logs_username ON teamcruz.audit_logs USING btree (username);


-- teamcruz.competicoes definição

-- Drop table

-- DROP TABLE teamcruz.competicoes;

CREATE TABLE teamcruz.competicoes (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome varchar(255) NOT NULL,
	descricao text NULL,
	organizador varchar(255) NULL,
	tipo varchar(50) NOT NULL,
	modalidade varchar(50) NOT NULL,
	data_inicio date NOT NULL,
	data_fim date NULL,
	"local" varchar(255) NULL,
	cidade varchar(100) NULL,
	estado varchar(2) NULL,
	pais varchar(50) DEFAULT 'Brasil'::character varying NULL,
	site_url varchar(500) NULL,
	regulamento_url varchar(500) NULL,
	valor_inscricao numeric(10, 2) NULL,
	status varchar(30) DEFAULT 'AGENDADA'::character varying NOT NULL,
	ativo bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_by uuid NULL,
	updated_by uuid NULL,
	CONSTRAINT competicoes_modalidade_check CHECK (((modalidade)::text = ANY (ARRAY[('GI'::character varying)::text, ('NO_GI'::character varying)::text, ('AMBOS'::character varying)::text]))),
	CONSTRAINT competicoes_nome_data_uk UNIQUE (nome, data_inicio),
	CONSTRAINT competicoes_pkey PRIMARY KEY (id),
	CONSTRAINT competicoes_status_check CHECK (((status)::text = ANY (ARRAY[('AGENDADA'::character varying)::text, ('EM_ANDAMENTO'::character varying)::text, ('FINALIZADA'::character varying)::text, ('CANCELADA'::character varying)::text]))),
	CONSTRAINT competicoes_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('LOCAL'::character varying)::text, ('REGIONAL'::character varying)::text, ('ESTADUAL'::character varying)::text, ('NACIONAL'::character varying)::text, ('INTERNACIONAL'::character varying)::text, ('INTERNO'::character varying)::text])))
);
CREATE INDEX idx_competicoes_cidade ON teamcruz.competicoes USING btree (cidade);
CREATE INDEX idx_competicoes_data_inicio ON teamcruz.competicoes USING btree (data_inicio DESC);
CREATE INDEX idx_competicoes_status ON teamcruz.competicoes USING btree (status);
CREATE INDEX idx_competicoes_tipo ON teamcruz.competicoes USING btree (tipo);

-- Table Triggers

create trigger trigger_competicoes_updated_at before
update
    on
    teamcruz.competicoes for each row execute function teamcruz.update_competicoes_updated_at();


-- teamcruz.convenios definição

-- Drop table

-- DROP TABLE teamcruz.convenios;

CREATE TABLE teamcruz.convenios (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	codigo varchar(50) NOT NULL,
	nome varchar(100) NOT NULL,
	descricao text NULL,
	api_url varchar(255) NULL,
	requer_api_key bool DEFAULT false NULL,
	ativo bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT convenios_codigo_key UNIQUE (codigo),
	CONSTRAINT convenios_pkey PRIMARY KEY (id)
);

-- Table Triggers

create trigger update_convenios_updated_at before
update
    on
    teamcruz.convenios for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.enderecos definição

-- Drop table

-- DROP TABLE teamcruz.enderecos;

CREATE TABLE teamcruz.enderecos (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	cep varchar(8) NOT NULL,
	logradouro varchar(200) NOT NULL,
	numero varchar(20) NOT NULL,
	complemento varchar(100) NULL,
	bairro varchar(100) NOT NULL,
	cidade varchar(100) NOT NULL,
	estado varchar(2) NOT NULL,
	pais varchar(50) DEFAULT 'Brasil'::character varying NOT NULL,
	latitude numeric(10, 8) NULL,
	longitude numeric(11, 8) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT enderecos_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_enderecos_cep ON teamcruz.enderecos USING btree (cep);
CREATE INDEX idx_enderecos_cidade_estado ON teamcruz.enderecos USING btree (cidade, estado);

-- Table Triggers

create trigger update_enderecos_updated_at before
update
    on
    teamcruz.enderecos for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.faixa_def definição

-- Drop table

-- DROP TABLE teamcruz.faixa_def;

CREATE TABLE teamcruz.faixa_def (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	codigo varchar(20) NOT NULL,
	nome_exibicao varchar(40) NOT NULL,
	cor_hex varchar(7) NOT NULL,
	ordem int4 NOT NULL,
	graus_max int4 DEFAULT 4 NOT NULL,
	aulas_por_grau int4 DEFAULT 40 NOT NULL,
	categoria teamcruz."categoria_faixa_enum" DEFAULT 'ADULTO'::teamcruz.categoria_faixa_enum NOT NULL,
	ativo bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT faixa_def_codigo_key UNIQUE (codigo),
	CONSTRAINT faixa_def_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_faixa_def_categoria ON teamcruz.faixa_def USING btree (categoria);
CREATE UNIQUE INDEX idx_faixa_def_codigo ON teamcruz.faixa_def USING btree (codigo);
CREATE INDEX idx_faixa_def_ordem ON teamcruz.faixa_def USING btree (ordem);

-- Table Triggers

create trigger update_faixa_def_updated_at before
update
    on
    teamcruz.faixa_def for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.niveis_permissao definição

-- Drop table

-- DROP TABLE teamcruz.niveis_permissao;

CREATE TABLE teamcruz.niveis_permissao (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	codigo varchar(50) NOT NULL,
	nome varchar(100) NOT NULL,
	descricao text NULL,
	ordem int4 DEFAULT 0 NOT NULL,
	cor varchar(7) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT niveis_permissao_codigo_key UNIQUE (codigo),
	CONSTRAINT niveis_permissao_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX idx_niveis_permissao_codigo ON teamcruz.niveis_permissao USING btree (codigo);
CREATE INDEX idx_niveis_permissao_ordem ON teamcruz.niveis_permissao USING btree (ordem);

-- Table Triggers

create trigger update_niveis_permissao_updated_at before
update
    on
    teamcruz.niveis_permissao for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.paytime_webhooks definição

-- Drop table

-- DROP TABLE teamcruz.paytime_webhooks;

CREATE TABLE teamcruz.paytime_webhooks (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	event_type varchar(100) NOT NULL,
	paytime_transaction_id varchar(255) NULL,
	payload jsonb NOT NULL,
	processed bool DEFAULT false NULL,
	processed_at timestamp NULL,
	error_message text NULL,
	created_at timestamp DEFAULT now() NULL,
	CONSTRAINT paytime_webhooks_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_webhooks_event ON teamcruz.paytime_webhooks USING btree (event_type);
CREATE INDEX idx_webhooks_processed ON teamcruz.paytime_webhooks USING btree (processed, created_at);
CREATE INDEX idx_webhooks_transaction ON teamcruz.paytime_webhooks USING btree (paytime_transaction_id);


-- teamcruz.perfis definição

-- Drop table

-- DROP TABLE teamcruz.perfis;

CREATE TABLE teamcruz.perfis (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome varchar(100) NOT NULL,
	descricao text NULL,
	ativo bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT perfis_nome_key UNIQUE (nome),
	CONSTRAINT perfis_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_perfis_ativo ON teamcruz.perfis USING btree (ativo);
CREATE UNIQUE INDEX idx_perfis_nome ON teamcruz.perfis USING btree (nome);

-- Table Triggers

create trigger update_perfis_updated_at before
update
    on
    teamcruz.perfis for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.tipos_permissao definição

-- Drop table

-- DROP TABLE teamcruz.tipos_permissao;

CREATE TABLE teamcruz.tipos_permissao (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	codigo varchar(50) NOT NULL,
	nome varchar(100) NOT NULL,
	descricao text NULL,
	ordem int4 DEFAULT 0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT tipos_permissao_codigo_key UNIQUE (codigo),
	CONSTRAINT tipos_permissao_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX idx_tipos_permissao_codigo ON teamcruz.tipos_permissao USING btree (codigo);
CREATE INDEX idx_tipos_permissao_ordem ON teamcruz.tipos_permissao USING btree (ordem);

-- Table Triggers

create trigger update_tipos_permissao_updated_at before
update
    on
    teamcruz.tipos_permissao for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.usuarios definição

-- Drop table

-- DROP TABLE teamcruz.usuarios;

CREATE TABLE teamcruz.usuarios (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	username varchar(50) NOT NULL,
	email varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	nome varchar(255) NOT NULL,
	cpf varchar(14) NULL,
	telefone varchar(20) NULL,
	ativo bool DEFAULT true NOT NULL,
	cadastro_completo bool DEFAULT false NOT NULL,
	ultimo_login timestamp NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	data_nascimento date NULL,
	foto text NULL,
	CONSTRAINT usuarios_email_key UNIQUE (email),
	CONSTRAINT usuarios_email_unique UNIQUE (email),
	CONSTRAINT usuarios_pkey PRIMARY KEY (id),
	CONSTRAINT usuarios_username_key UNIQUE (username),
	CONSTRAINT usuarios_username_unique UNIQUE (username)
);
CREATE INDEX idx_usuarios_ativo ON teamcruz.usuarios USING btree (ativo);
CREATE INDEX idx_usuarios_cadastro_completo ON teamcruz.usuarios USING btree (cadastro_completo);
CREATE INDEX idx_usuarios_cpf ON teamcruz.usuarios USING btree (cpf) WHERE (cpf IS NOT NULL);
CREATE UNIQUE INDEX idx_usuarios_email ON teamcruz.usuarios USING btree (email);
CREATE UNIQUE INDEX idx_usuarios_username ON teamcruz.usuarios USING btree (username);

-- Table Triggers

create trigger update_usuarios_updated_at before
update
    on
    teamcruz.usuarios for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.aluno_competicoes definição

-- Drop table

-- DROP TABLE teamcruz.aluno_competicoes;

CREATE TABLE teamcruz.aluno_competicoes (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	competicao_id uuid NOT NULL,
	categoria_peso varchar(50) NULL,
	categoria_idade varchar(50) NULL,
	categoria_faixa varchar(50) NULL,
	colocacao int4 NULL,
	posicao varchar(20) NULL,
	total_lutas int4 DEFAULT 0 NULL,
	vitorias int4 DEFAULT 0 NULL,
	derrotas int4 DEFAULT 0 NULL,
	observacoes text NULL,
	peso_pesagem numeric(5, 2) NULL,
	tempo_total_lutas varchar(20) NULL,
	premiacao_valor numeric(10, 2) NULL,
	premiacao_descricao varchar(255) NULL,
	certificado_url varchar(500) NULL,
	foto_premiacao_url varchar(500) NULL,
	video_url varchar(500) NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	created_by uuid NULL,
	updated_by uuid NULL,
	CONSTRAINT aluno_competicoes_aluno_competicao_uk UNIQUE (aluno_id, competicao_id, categoria_peso, categoria_faixa),
	CONSTRAINT aluno_competicoes_colocacao_check CHECK ((colocacao > 0)),
	CONSTRAINT aluno_competicoes_pkey PRIMARY KEY (id),
	CONSTRAINT aluno_competicoes_posicao_check CHECK (((posicao)::text = ANY (ARRAY[('OURO'::character varying)::text, ('PRATA'::character varying)::text, ('BRONZE'::character varying)::text, ('PARTICIPOU'::character varying)::text, ('DESCLASSIFICADO'::character varying)::text]))),
	CONSTRAINT aluno_competicoes_competicao_id_fkey FOREIGN KEY (competicao_id) REFERENCES teamcruz.competicoes(id) ON DELETE CASCADE
);
CREATE INDEX idx_aluno_competicoes_aluno ON teamcruz.aluno_competicoes USING btree (aluno_id);
CREATE INDEX idx_aluno_competicoes_competicao ON teamcruz.aluno_competicoes USING btree (competicao_id);
CREATE INDEX idx_aluno_competicoes_created_at ON teamcruz.aluno_competicoes USING btree (created_at DESC);
CREATE INDEX idx_aluno_competicoes_posicao ON teamcruz.aluno_competicoes USING btree (posicao);

-- Table Triggers

create trigger trigger_aluno_competicoes_updated_at before
update
    on
    teamcruz.aluno_competicoes for each row execute function teamcruz.update_competicoes_updated_at();


-- teamcruz.aluno_faixa definição

-- Drop table

-- DROP TABLE teamcruz.aluno_faixa;

CREATE TABLE teamcruz.aluno_faixa (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	faixa_def_id uuid NOT NULL,
	ativa bool DEFAULT true NOT NULL,
	dt_inicio date NOT NULL,
	dt_fim date NULL,
	graus_atual int4 DEFAULT 0 NOT NULL,
	presencas_no_ciclo int4 DEFAULT 0 NOT NULL,
	presencas_total_fx int4 DEFAULT 0 NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT aluno_faixa_pkey PRIMARY KEY (id),
	CONSTRAINT fk_aluno_faixa_faixa_def FOREIGN KEY (faixa_def_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT
);
CREATE INDEX idx_aluno_faixa_aluno_ativa ON teamcruz.aluno_faixa USING btree (aluno_id, ativa);
CREATE INDEX idx_aluno_faixa_faixa_def ON teamcruz.aluno_faixa USING btree (faixa_def_id);

-- Table Triggers

create trigger update_aluno_faixa_updated_at before
update
    on
    teamcruz.aluno_faixa for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.aluno_faixa_grau definição

-- Drop table

-- DROP TABLE teamcruz.aluno_faixa_grau;

CREATE TABLE teamcruz.aluno_faixa_grau (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_faixa_id uuid NOT NULL,
	grau_num int4 NOT NULL,
	dt_concessao timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	concedido_por uuid NULL,
	observacao text NULL,
	origem teamcruz."origem_grau_enum" DEFAULT 'MANUAL'::teamcruz.origem_grau_enum NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT aluno_faixa_grau_pkey PRIMARY KEY (id),
	CONSTRAINT fk_aluno_faixa_grau_aluno_faixa FOREIGN KEY (aluno_faixa_id) REFERENCES teamcruz.aluno_faixa(id) ON DELETE CASCADE
);
CREATE INDEX idx_aluno_faixa_grau_aluno_faixa ON teamcruz.aluno_faixa_grau USING btree (aluno_faixa_id);
CREATE INDEX idx_aluno_faixa_grau_concedido_por ON teamcruz.aluno_faixa_grau USING btree (concedido_por);


-- teamcruz.franqueados definição

-- Drop table

-- DROP TABLE teamcruz.franqueados;

CREATE TABLE teamcruz.franqueados (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome varchar(150) NOT NULL,
	email varchar(120) NOT NULL,
	telefone varchar(20) NOT NULL,
	endereco_id uuid NULL,
	unidades_gerencia _text NULL,
	situacao teamcruz."situacao_franqueado_enum" DEFAULT 'ATIVA'::teamcruz.situacao_franqueado_enum NOT NULL,
	ativo bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	usuario_id uuid NULL,
	cpf varchar(14) NOT NULL,
	contrato_aceito bool DEFAULT false NULL,
	contrato_aceito_em timestamp NULL,
	contrato_versao varchar(20) NULL,
	contrato_ip varchar(45) NULL,
	CONSTRAINT franqueados_cpf_unique UNIQUE (cpf),
	CONSTRAINT franqueados_email_unique UNIQUE (email),
	CONSTRAINT franqueados_pkey PRIMARY KEY (id),
	CONSTRAINT fk_franqueado_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL,
	CONSTRAINT fk_franqueados_endereco FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id),
	CONSTRAINT fk_franqueados_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL
);
CREATE INDEX idx_franqueados_ativo ON teamcruz.franqueados USING btree (ativo);
CREATE INDEX idx_franqueados_cpf ON teamcruz.franqueados USING btree (cpf);
CREATE INDEX idx_franqueados_email ON teamcruz.franqueados USING btree (email);
CREATE INDEX idx_franqueados_situacao ON teamcruz.franqueados USING btree (situacao);
CREATE INDEX idx_franqueados_usuario_id ON teamcruz.franqueados USING btree (usuario_id);

-- Table Triggers

create trigger update_franqueados_updated_at before
update
    on
    teamcruz.franqueados for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.historico_faixas definição

-- Drop table

-- DROP TABLE teamcruz.historico_faixas;

CREATE TABLE teamcruz.historico_faixas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	faixa_origem_id uuid NULL,
	faixa_destino_id uuid NOT NULL,
	data_promocao date DEFAULT CURRENT_DATE NOT NULL,
	evento varchar(200) NULL,
	certificado_url text NULL,
	observacoes text NULL,
	created_by uuid NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT historico_faixas_pkey PRIMARY KEY (id),
	CONSTRAINT fk_historico_faixas_destino FOREIGN KEY (faixa_destino_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT,
	CONSTRAINT fk_historico_faixas_origem FOREIGN KEY (faixa_origem_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT
);
CREATE INDEX idx_historico_faixas_aluno ON teamcruz.historico_faixas USING btree (aluno_id);
CREATE INDEX idx_historico_faixas_data_promocao ON teamcruz.historico_faixas USING btree (data_promocao);


-- teamcruz.historico_graus definição

-- Drop table

-- DROP TABLE teamcruz.historico_graus;

CREATE TABLE teamcruz.historico_graus (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	faixa_id uuid NOT NULL,
	grau_numero int4 NOT NULL,
	data_concessao date DEFAULT CURRENT_DATE NOT NULL,
	origem_grau teamcruz."origem_grau_enum" DEFAULT 'AUTOMATICO'::teamcruz.origem_grau_enum NOT NULL,
	aulas_acumuladas int4 NULL,
	justificativa text NULL,
	certificado_url text NULL,
	evento_id uuid NULL,
	created_by uuid NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT historico_graus_pkey PRIMARY KEY (id),
	CONSTRAINT fk_historico_graus_faixa FOREIGN KEY (faixa_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT
);
CREATE INDEX idx_historico_graus_aluno ON teamcruz.historico_graus USING btree (aluno_id);
CREATE INDEX idx_historico_graus_data_concessao ON teamcruz.historico_graus USING btree (data_concessao);
CREATE INDEX idx_historico_graus_faixa ON teamcruz.historico_graus USING btree (faixa_id);


-- teamcruz.password_reset_tokens definição

-- Drop table

-- DROP TABLE teamcruz.password_reset_tokens;

CREATE TABLE teamcruz.password_reset_tokens (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	usuario_id uuid NOT NULL,
	used bool DEFAULT false NULL,
	expires_at timestamp NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
	CONSTRAINT password_reset_tokens_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);


-- teamcruz.permissoes definição

-- Drop table

-- DROP TABLE teamcruz.permissoes;

CREATE TABLE teamcruz.permissoes (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	codigo varchar(100) NOT NULL,
	nome varchar(150) NOT NULL,
	descricao text NULL,
	tipo_id uuid NOT NULL,
	nivel_id uuid NOT NULL,
	modulo varchar(50) NULL,
	ativo bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT permissoes_codigo_key UNIQUE (codigo),
	CONSTRAINT permissoes_pkey PRIMARY KEY (id),
	CONSTRAINT fk_permissoes_nivel FOREIGN KEY (nivel_id) REFERENCES teamcruz.niveis_permissao(id) ON DELETE RESTRICT,
	CONSTRAINT fk_permissoes_tipo FOREIGN KEY (tipo_id) REFERENCES teamcruz.tipos_permissao(id) ON DELETE RESTRICT
);
CREATE INDEX idx_permissoes_ativo ON teamcruz.permissoes USING btree (ativo);
CREATE UNIQUE INDEX idx_permissoes_codigo ON teamcruz.permissoes USING btree (codigo);
CREATE INDEX idx_permissoes_modulo ON teamcruz.permissoes USING btree (modulo);
CREATE INDEX idx_permissoes_nivel ON teamcruz.permissoes USING btree (nivel_id);
CREATE INDEX idx_permissoes_tipo ON teamcruz.permissoes USING btree (tipo_id);

-- Table Triggers

create trigger update_permissoes_updated_at before
update
    on
    teamcruz.permissoes for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.unidades definição

-- Drop table

-- DROP TABLE teamcruz.unidades;

CREATE TABLE teamcruz.unidades (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	franqueado_id uuid NOT NULL,
	nome varchar(150) NOT NULL,
	cnpj varchar(18) NOT NULL,
	razao_social varchar(200) NULL,
	nome_fantasia varchar(150) NULL,
	inscricao_estadual varchar(20) NULL,
	inscricao_municipal varchar(20) NULL,
	telefone_fixo varchar(20) NULL,
	telefone_celular varchar(20) NULL,
	email varchar(120) NULL,
	website varchar(200) NULL,
	redes_sociais jsonb NULL,
	status teamcruz."status_unidade_enum" DEFAULT 'HOMOLOGACAO'::teamcruz.status_unidade_enum NOT NULL,
	horarios_funcionamento jsonb NULL,
	endereco_id uuid NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	requer_aprovacao_checkin bool DEFAULT false NULL,
	latitude numeric(10, 8) NULL,
	longitude numeric(11, 8) NULL,
	capacidade_max_alunos int4 NULL,
	valor_plano_padrao numeric(10, 2) DEFAULT NULL::numeric NULL,
	qtde_instrutores int4 NULL,
	paytime_establishment_id varchar(50) NULL,
	paytime_plans jsonb DEFAULT '[]'::jsonb NULL,
	catraca_config jsonb NULL,
	catraca_habilitada bool DEFAULT false NOT NULL,
	transaction_limits jsonb DEFAULT '{"daily_limit": 50000.00, "chargeback_limit": 5, "transaction_limit": 5000.00, "monthly_transactions": 300}'::jsonb NULL,
	CONSTRAINT unidades_pkey PRIMARY KEY (id),
	CONSTRAINT fk_unidades_endereco FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id),
	CONSTRAINT fk_unidades_franqueado FOREIGN KEY (franqueado_id) REFERENCES teamcruz.franqueados(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_unidades_cnpj_not_null ON teamcruz.unidades USING btree (cnpj) WHERE ((cnpj IS NOT NULL) AND ((cnpj)::text <> ''::text));
COMMENT ON INDEX teamcruz.idx_unidades_cnpj_not_null IS 'Índice único parcial: garante unicidade de CNPJ apenas quando informado (não-nulo e não-vazio)';
CREATE INDEX idx_unidades_franqueado ON teamcruz.unidades USING btree (franqueado_id);
CREATE INDEX idx_unidades_paytime_establishment_id ON teamcruz.unidades USING btree (paytime_establishment_id);
CREATE INDEX idx_unidades_status ON teamcruz.unidades USING btree (status);

-- Table Triggers

create trigger update_unidades_updated_at before
update
    on
    teamcruz.unidades for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.usuario_perfis definição

-- Drop table

-- DROP TABLE teamcruz.usuario_perfis;

CREATE TABLE teamcruz.usuario_perfis (
	usuario_id uuid NOT NULL,
	perfil_id uuid NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT usuario_perfis_pkey PRIMARY KEY (usuario_id, perfil_id),
	CONSTRAINT fk_usuario_perfis_perfil FOREIGN KEY (perfil_id) REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
	CONSTRAINT fk_usuario_perfis_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_usuario_perfis_perfil ON teamcruz.usuario_perfis USING btree (perfil_id);
CREATE INDEX idx_usuario_perfis_usuario ON teamcruz.usuario_perfis USING btree (usuario_id);


-- teamcruz.bank_accounts definição

-- Drop table

-- DROP TABLE teamcruz.bank_accounts;

CREATE TABLE teamcruz.bank_accounts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	unidade_id uuid NOT NULL,
	banco_codigo varchar(10) NOT NULL,
	banco_nome varchar(100) NOT NULL,
	agencia varchar(20) NOT NULL,
	agencia_digito varchar(2) NULL,
	conta varchar(30) NOT NULL,
	conta_digito varchar(2) NOT NULL,
	tipo varchar(20) NOT NULL,
	titular_nome varchar(200) NOT NULL,
	titular_cpf_cnpj varchar(18) NOT NULL,
	principal bool DEFAULT false NULL,
	ativo bool DEFAULT true NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT bank_accounts_pkey PRIMARY KEY (id),
	CONSTRAINT bank_accounts_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['CORRENTE'::character varying, 'POUPANCA'::character varying])::text[]))),
	CONSTRAINT unique_principal_per_unidade EXCLUDE USING btree (unidade_id WITH =) WHERE ((principal = true)),
	CONSTRAINT bank_accounts_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_bank_accounts_principal ON teamcruz.bank_accounts USING btree (unidade_id, principal) WHERE (principal = true);
CREATE INDEX idx_bank_accounts_unidade ON teamcruz.bank_accounts USING btree (unidade_id);
CREATE INDEX unique_principal_per_unidade ON teamcruz.bank_accounts USING btree (unidade_id) WHERE (principal = true);


-- teamcruz.configuracoes_cobranca definição

-- Drop table

-- DROP TABLE teamcruz.configuracoes_cobranca;

CREATE TABLE teamcruz.configuracoes_cobranca (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	unidade_id uuid NOT NULL,
	aceita_pix bool DEFAULT true NULL,
	aceita_cartao bool DEFAULT true NULL,
	aceita_boleto bool DEFAULT true NULL,
	aceita_dinheiro bool DEFAULT true NULL,
	aceita_transferencia bool DEFAULT true NULL,
	multa_atraso_percentual numeric(5, 2) DEFAULT 2.0 NULL,
	juros_diario_percentual numeric(5, 2) DEFAULT 0.033 NULL,
	dias_bloqueio_inadimplencia int4 DEFAULT 30 NULL,
	dia_vencimento_padrao int4 DEFAULT 10 NULL,
	faturas_vencidas_para_inadimplencia int4 DEFAULT 2 NULL,
	gateway_tipo varchar(100) NULL,
	gateway_api_key varchar(255) NULL,
	gateway_secret_key varchar(255) NULL,
	gateway_modo_producao bool DEFAULT false NULL,
	gateway_configuracoes jsonb NULL,
	mensagem_cobranca_whatsapp jsonb NULL,
	mensagem_cobranca_email jsonb NULL,
	enviar_lembrete_vencimento bool DEFAULT true NULL,
	dias_antecedencia_lembrete int4 DEFAULT 3 NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	whatsapp_api_url varchar(255) NULL,
	whatsapp_api_token varchar(255) NULL,
	CONSTRAINT configuracoes_cobranca_pkey PRIMARY KEY (id),
	CONSTRAINT configuracoes_cobranca_unidade_id_key UNIQUE (unidade_id),
	CONSTRAINT configuracoes_cobranca_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_config_cobranca_unidade ON teamcruz.configuracoes_cobranca USING btree (unidade_id);

-- Table Triggers

create trigger update_config_cobranca_updated_at before
update
    on
    teamcruz.configuracoes_cobranca for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.configuracoes_convenio_unidade definição

-- Drop table

-- DROP TABLE teamcruz.configuracoes_convenio_unidade;

CREATE TABLE teamcruz.configuracoes_convenio_unidade (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	unidade_id uuid NOT NULL,
	convenio_id uuid NOT NULL,
	ativo bool DEFAULT false NULL,
	unidade_id_no_convenio varchar(255) NULL,
	percentual_repasse numeric(5, 2) NULL,
	api_key varchar(500) NULL,
	configuracoes_extras jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT configuracoes_convenio_unidade_pkey PRIMARY KEY (id),
	CONSTRAINT unique_unidade_convenio UNIQUE (unidade_id, convenio_id),
	CONSTRAINT configuracoes_convenio_unidade_convenio_id_fkey FOREIGN KEY (convenio_id) REFERENCES teamcruz.convenios(id) ON DELETE CASCADE,
	CONSTRAINT configuracoes_convenio_unidade_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_config_convenio_ativo ON teamcruz.configuracoes_convenio_unidade USING btree (ativo) WHERE (ativo = true);
CREATE INDEX idx_config_convenio_tipo ON teamcruz.configuracoes_convenio_unidade USING btree (convenio_id);
CREATE INDEX idx_config_convenio_unidade ON teamcruz.configuracoes_convenio_unidade USING btree (unidade_id);

-- Table Triggers

create trigger update_config_convenio_unidade_updated_at before
update
    on
    teamcruz.configuracoes_convenio_unidade for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.configuracoes_graduacao definição

-- Drop table

-- DROP TABLE teamcruz.configuracoes_graduacao;

CREATE TABLE teamcruz.configuracoes_graduacao (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	unidade_id uuid NOT NULL,
	config_faixas jsonb DEFAULT '{"AZUL": {"graus_maximos": 4, "aulas_por_grau": 40, "tempo_minimo_meses": 24}, "ROXA": {"graus_maximos": 4, "aulas_por_grau": 40, "tempo_minimo_meses": 24}, "PRETA": {"graus_maximos": 10, "aulas_por_grau": 40, "tempo_minimo_meses": null}, "BRANCA": {"graus_maximos": 4, "aulas_por_grau": 40, "tempo_minimo_meses": 12}, "MARROM": {"graus_maximos": 4, "aulas_por_grau": 40, "tempo_minimo_meses": 18}, "CINZA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "VERDE_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "BRANCA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "AMARELA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "LARANJA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "AMAR_PRETA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "LARA_PRETA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "AMAR_BRANCA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "CINZA_PRETA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "LARA_BRANCA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "VERDE_PRETA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "CINZA_BRANCA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}, "VERDE_BRANCA_INF": {"graus_maximos": 4, "aulas_por_grau": 30, "tempo_minimo_meses": 6}}'::jsonb NOT NULL,
	percentual_frequencia_minima numeric(5, 2) DEFAULT 75.00 NULL,
	config_adicional jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT configuracoes_graduacao_pkey PRIMARY KEY (id),
	CONSTRAINT configuracoes_graduacao_unidade_id_key UNIQUE (unidade_id),
	CONSTRAINT fk_configuracao_graduacao_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_configuracoes_graduacao_config_faixas ON teamcruz.configuracoes_graduacao USING gin (config_faixas);
CREATE INDEX idx_configuracoes_graduacao_unidade_id ON teamcruz.configuracoes_graduacao USING btree (unidade_id);

-- Table Triggers

create trigger trg_update_configuracao_graduacao_updated_at before
update
    on
    teamcruz.configuracoes_graduacao for each row execute function teamcruz.update_configuracao_graduacao_updated_at();


-- teamcruz.contracts definição

-- Drop table

-- DROP TABLE teamcruz.contracts;

CREATE TABLE teamcruz.contracts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	unidade_id uuid NOT NULL,
	tipo varchar(50) DEFAULT 'rykon-pay'::character varying NOT NULL,
	titulo varchar(200) NOT NULL,
	conteudo text NULL,
	versao varchar(10) DEFAULT '1.0'::character varying NOT NULL,
	status varchar(30) DEFAULT 'PENDENTE'::character varying NOT NULL,
	assinado bool DEFAULT false NULL,
	data_assinatura timestamp NULL,
	assinado_por_nome varchar(200) NULL,
	assinado_por_cpf varchar(14) NULL,
	pdf_url varchar(500) NULL,
	pdf_path varchar(500) NULL,
	data_inicio date NOT NULL,
	data_fim date NULL,
	valor_mensal numeric(10, 2) NULL,
	taxa_transacao numeric(5, 2) NULL,
	observacoes text NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	created_by uuid NULL,
	CONSTRAINT contracts_pkey PRIMARY KEY (id),
	CONSTRAINT contracts_status_check CHECK (((status)::text = ANY ((ARRAY['PENDENTE'::character varying, 'ATIVO'::character varying, 'CANCELADO'::character varying, 'EXPIRADO'::character varying])::text[]))),
	CONSTRAINT unique_active_contract_per_type UNIQUE (unidade_id, tipo, status) DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT contracts_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_contracts_status ON teamcruz.contracts USING btree (status);
CREATE INDEX idx_contracts_tipo ON teamcruz.contracts USING btree (tipo);
CREATE INDEX idx_contracts_unidade ON teamcruz.contracts USING btree (unidade_id);
CREATE INDEX idx_contracts_unidade_tipo_status ON teamcruz.contracts USING btree (unidade_id, tipo, status);


-- teamcruz.contratos_unidades definição

-- Drop table

-- DROP TABLE teamcruz.contratos_unidades;

CREATE TABLE teamcruz.contratos_unidades (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	unidade_id uuid NOT NULL,
	titulo varchar(255) NOT NULL,
	conteudo text NOT NULL,
	versao int4 DEFAULT 1 NULL,
	ativo bool DEFAULT true NULL,
	obrigatorio bool DEFAULT true NULL,
	tipo_contrato varchar(50) DEFAULT 'TERMO_ADESAO'::character varying NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	created_by uuid NULL,
	updated_by uuid NULL,
	CONSTRAINT contratos_unidades_pkey PRIMARY KEY (id),
	CONSTRAINT contratos_unidades_tipo_contrato_check CHECK (((tipo_contrato)::text = ANY (ARRAY[('TERMO_ADESAO'::character varying)::text, ('TERMO_RESPONSABILIDADE'::character varying)::text, ('LGPD'::character varying)::text, ('OUTRO'::character varying)::text]))),
	CONSTRAINT fk_contrato_created_by FOREIGN KEY (created_by) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL,
	CONSTRAINT fk_contrato_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
	CONSTRAINT fk_contrato_updated_by FOREIGN KEY (updated_by) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL
);
CREATE INDEX idx_contratos_unidades_ativo ON teamcruz.contratos_unidades USING btree (ativo);
CREATE INDEX idx_contratos_unidades_unidade_id ON teamcruz.contratos_unidades USING btree (unidade_id);


-- teamcruz.convites_cadastro definição

-- Drop table

-- DROP TABLE teamcruz.convites_cadastro;

CREATE TABLE teamcruz.convites_cadastro (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(255) NOT NULL,
	tipo_cadastro varchar(20) NOT NULL,
	unidade_id uuid NOT NULL,
	email varchar(255) NULL,
	telefone varchar(20) NULL,
	nome_pre_cadastro varchar(255) NULL,
	cpf varchar(50) NULL,
	usado bool DEFAULT false NULL,
	usuario_criado_id uuid NULL,
	data_expiracao timestamp DEFAULT (now() + '7 days'::interval) NOT NULL,
	criado_por uuid NULL,
	criado_em timestamp DEFAULT now() NULL,
	usado_em timestamp NULL,
	observacoes text NULL,
	CONSTRAINT convites_cadastro_pkey PRIMARY KEY (id),
	CONSTRAINT convites_cadastro_token_key UNIQUE (token),
	CONSTRAINT convites_cadastro_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES teamcruz.usuarios(id),
	CONSTRAINT convites_cadastro_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id),
	CONSTRAINT convites_cadastro_usuario_criado_id_fkey FOREIGN KEY (usuario_criado_id) REFERENCES teamcruz.usuarios(id)
);
CREATE INDEX idx_convites_expiracao ON teamcruz.convites_cadastro USING btree (data_expiracao);
CREATE INDEX idx_convites_token ON teamcruz.convites_cadastro USING btree (token);
CREATE INDEX idx_convites_unidade ON teamcruz.convites_cadastro USING btree (unidade_id);
CREATE INDEX idx_convites_usado ON teamcruz.convites_cadastro USING btree (usado);


-- teamcruz.despesas definição

-- Drop table

-- DROP TABLE teamcruz.despesas;

CREATE TABLE teamcruz.despesas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	unidade_id uuid NOT NULL,
	categoria varchar(20) NOT NULL,
	descricao varchar(255) NOT NULL,
	valor numeric(10, 2) NOT NULL,
	data_vencimento date NOT NULL,
	data_pagamento date NULL,
	recorrencia varchar(20) DEFAULT 'UNICA'::character varying NULL,
	status varchar(25) DEFAULT 'A_PAGAR'::character varying NOT NULL,
	anexo varchar(500) NULL,
	fornecedor varchar(255) NULL,
	numero_documento varchar(100) NULL,
	observacoes text NULL,
	criado_por uuid NULL,
	pago_por uuid NULL,
	lembrete_enviado bool DEFAULT false NULL,
	data_proximo_vencimento date NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT despesas_categoria_check CHECK (((categoria)::text = ANY (ARRAY[('SISTEMA'::character varying)::text, ('ALUGUEL'::character varying)::text, ('AGUA'::character varying)::text, ('LUZ'::character varying)::text, ('INTERNET'::character varying)::text, ('TELEFONE'::character varying)::text, ('SALARIO'::character varying)::text, ('FORNECEDOR'::character varying)::text, ('MANUTENCAO'::character varying)::text, ('MATERIAL'::character varying)::text, ('LIMPEZA'::character varying)::text, ('MARKETING'::character varying)::text, ('TAXA'::character varying)::text, ('OUTRO'::character varying)::text]))),
	CONSTRAINT despesas_pkey PRIMARY KEY (id),
	CONSTRAINT despesas_recorrencia_check CHECK (((recorrencia)::text = ANY (ARRAY[('UNICA'::character varying)::text, ('MENSAL'::character varying)::text, ('BIMESTRAL'::character varying)::text, ('TRIMESTRAL'::character varying)::text, ('SEMESTRAL'::character varying)::text, ('ANUAL'::character varying)::text]))),
	CONSTRAINT despesas_status_check CHECK (((status)::text = ANY (ARRAY[('A_PAGAR'::character varying)::text, ('PAGA'::character varying)::text, ('ATRASADA'::character varying)::text, ('CANCELADA'::character varying)::text, ('PARCIALMENTE_PAGA'::character varying)::text]))),
	CONSTRAINT despesas_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES teamcruz.usuarios(id),
	CONSTRAINT despesas_pago_por_fkey FOREIGN KEY (pago_por) REFERENCES teamcruz.usuarios(id),
	CONSTRAINT despesas_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_despesas_categoria ON teamcruz.despesas USING btree (categoria);
CREATE INDEX idx_despesas_status ON teamcruz.despesas USING btree (status);
CREATE INDEX idx_despesas_unidade ON teamcruz.despesas USING btree (unidade_id);
CREATE INDEX idx_despesas_vencimento ON teamcruz.despesas USING btree (data_vencimento);

-- Table Triggers

create trigger update_despesas_updated_at before
update
    on
    teamcruz.despesas for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.gerente_unidades definição

-- Drop table

-- DROP TABLE teamcruz.gerente_unidades;

CREATE TABLE teamcruz.gerente_unidades (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	usuario_id uuid NOT NULL,
	unidade_id uuid NOT NULL,
	data_vinculo timestamp DEFAULT now() NULL,
	ativo bool DEFAULT true NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT gerente_unidades_pkey PRIMARY KEY (id),
	CONSTRAINT uk_gerente_unidade UNIQUE (usuario_id),
	CONSTRAINT fk_gerente_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
	CONSTRAINT fk_gerente_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_gerente_unidades_ativo ON teamcruz.gerente_unidades USING btree (ativo);
CREATE INDEX idx_gerente_unidades_unidade ON teamcruz.gerente_unidades USING btree (unidade_id);
CREATE INDEX idx_gerente_unidades_usuario ON teamcruz.gerente_unidades USING btree (usuario_id);


-- teamcruz.graduacao_parametros definição

-- Drop table

-- DROP TABLE teamcruz.graduacao_parametros;

CREATE TABLE teamcruz.graduacao_parametros (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome varchar(100) NOT NULL,
	descricao text NULL,
	data_inicio date NOT NULL,
	data_fim date NOT NULL,
	tipo_periodo varchar(20) NOT NULL,
	graus_minimos int4 DEFAULT 4 NOT NULL,
	presencas_minimas int4 DEFAULT 160 NOT NULL,
	ativo bool DEFAULT true NOT NULL,
	unidade_id uuid NULL,
	created_by uuid NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT graduacao_parametros_pkey PRIMARY KEY (id),
	CONSTRAINT graduacao_parametros_tipo_periodo_check CHECK (((tipo_periodo)::text = ANY (ARRAY[('MEIO_ANO'::character varying)::text, ('FIM_ANO'::character varying)::text, ('ESPECIAL'::character varying)::text]))),
	CONSTRAINT fk_graduacao_parametros_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE SET NULL
);
CREATE INDEX idx_graduacao_parametros_ativo ON teamcruz.graduacao_parametros USING btree (ativo);
CREATE INDEX idx_graduacao_parametros_data_inicio ON teamcruz.graduacao_parametros USING btree (data_inicio);
CREATE INDEX idx_graduacao_parametros_tipo_periodo ON teamcruz.graduacao_parametros USING btree (tipo_periodo);
CREATE INDEX idx_graduacao_parametros_unidade ON teamcruz.graduacao_parametros USING btree (unidade_id);

-- Table Triggers

create trigger update_graduacao_parametros_updated_at before
update
    on
    teamcruz.graduacao_parametros for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.modalidades definição

-- Drop table

-- DROP TABLE teamcruz.modalidades;

CREATE TABLE teamcruz.modalidades (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	unidade_id uuid NOT NULL,
	nome varchar(100) NOT NULL,
	descricao text NULL,
	valor_mensalidade numeric(10, 2) NOT NULL,
	ativo bool DEFAULT true NULL,
	cor varchar(7) DEFAULT '#1E3A8A'::character varying NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT modalidades_pkey PRIMARY KEY (id),
	CONSTRAINT uk_modalidade_unidade_nome UNIQUE (unidade_id, nome),
	CONSTRAINT fk_modalidades_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_modalidades_ativo ON teamcruz.modalidades USING btree (ativo);
CREATE INDEX idx_modalidades_nome ON teamcruz.modalidades USING btree (nome);
CREATE INDEX idx_modalidades_unidade ON teamcruz.modalidades USING btree (unidade_id);


-- teamcruz.perfil_permissoes definição

-- Drop table

-- DROP TABLE teamcruz.perfil_permissoes;

CREATE TABLE teamcruz.perfil_permissoes (
	perfil_id uuid NOT NULL,
	permissao_id uuid NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT perfil_permissoes_pkey PRIMARY KEY (perfil_id, permissao_id),
	CONSTRAINT fk_perfil_permissoes_perfil FOREIGN KEY (perfil_id) REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
	CONSTRAINT fk_perfil_permissoes_permissao FOREIGN KEY (permissao_id) REFERENCES teamcruz.permissoes(id) ON DELETE CASCADE
);
CREATE INDEX idx_perfil_permissoes_perfil ON teamcruz.perfil_permissoes USING btree (perfil_id);
CREATE INDEX idx_perfil_permissoes_permissao ON teamcruz.perfil_permissoes USING btree (permissao_id);


-- teamcruz.planos definição

-- Drop table

-- DROP TABLE teamcruz.planos;

CREATE TABLE teamcruz.planos (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome varchar(150) NOT NULL,
	tipo varchar(20) NOT NULL,
	valor numeric(10, 2) NOT NULL,
	descricao text NULL,
	beneficios text NULL,
	duracao_meses int4 DEFAULT 1 NULL,
	numero_aulas int4 NULL,
	recorrencia_automatica bool DEFAULT true NULL,
	unidade_id uuid NULL,
	ativo bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	duracao_dias int4 NULL,
	max_alunos int4 NULL,
	CONSTRAINT planos_pkey PRIMARY KEY (id),
	CONSTRAINT planos_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('MENSAL'::character varying)::text, ('SEMESTRAL'::character varying)::text, ('ANUAL'::character varying)::text, ('AVULSO'::character varying)::text]))),
	CONSTRAINT planos_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE SET NULL
);
CREATE INDEX idx_planos_ativo ON teamcruz.planos USING btree (ativo);
CREATE INDEX idx_planos_tipo ON teamcruz.planos USING btree (tipo);
CREATE INDEX idx_planos_unidade ON teamcruz.planos USING btree (unidade_id);

-- Table Triggers

create trigger update_planos_updated_at before
update
    on
    teamcruz.planos for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.professores definição

-- Drop table

-- DROP TABLE teamcruz.professores;

CREATE TABLE teamcruz.professores (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	tipo_cadastro teamcruz."tipo_cadastro_enum" NOT NULL,
	nome_completo varchar(255) NOT NULL,
	cpf varchar(14) NULL,
	data_nascimento date NULL,
	genero teamcruz."genero_enum" NOT NULL,
	telefone_whatsapp varchar(20) NULL,
	email varchar(255) NULL,
	unidade_id uuid NULL,
	status teamcruz."status_cadastro_enum" DEFAULT 'ATIVO'::teamcruz.status_cadastro_enum NOT NULL,
	data_matricula date NULL,
	faixa_atual varchar(20) NULL,
	grau_atual int4 DEFAULT 0 NULL,
	responsavel_nome varchar(255) NULL,
	responsavel_cpf varchar(14) NULL,
	responsavel_telefone varchar(20) NULL,
	faixa_ministrante varchar(20) NULL,
	data_inicio_docencia date NULL,
	registro_profissional varchar(100) NULL,
	observacoes text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_by uuid NULL,
	updated_by uuid NULL,
	endereco_id uuid NULL,
	usuario_id uuid NULL,
	especialidades varchar(255) NULL,
	CONSTRAINT professores_cpf_key UNIQUE (cpf),
	CONSTRAINT professores_pkey PRIMARY KEY (id),
	CONSTRAINT fk_professores_endereco FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id),
	CONSTRAINT fk_professores_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id)
);
CREATE UNIQUE INDEX idx_professores_cpf ON teamcruz.professores USING btree (cpf) WHERE (cpf IS NOT NULL);
CREATE INDEX idx_professores_endereco ON teamcruz.professores USING btree (endereco_id);
CREATE INDEX idx_professores_nome ON teamcruz.professores USING btree (nome_completo);
CREATE INDEX idx_professores_status ON teamcruz.professores USING btree (status);
CREATE INDEX idx_professores_tipo_cadastro ON teamcruz.professores USING btree (tipo_cadastro);
CREATE INDEX idx_professores_unidade ON teamcruz.professores USING btree (unidade_id);
CREATE INDEX idx_professores_usuario_id ON teamcruz.professores USING btree (usuario_id);

-- Table Triggers

create trigger update_professores_updated_at before
update
    on
    teamcruz.professores for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.recepcionista_unidades definição

-- Drop table

-- DROP TABLE teamcruz.recepcionista_unidades;

CREATE TABLE teamcruz.recepcionista_unidades (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	usuario_id uuid NOT NULL,
	unidade_id uuid NOT NULL,
	cargo varchar(100) NULL,
	turno varchar(50) NULL,
	horario_entrada time NULL,
	horario_saida time NULL,
	dias_semana _varchar DEFAULT ARRAY['SEG'::text, 'TER'::text, 'QUA'::text, 'QUI'::text, 'SEX'::text, 'SAB'::text] NULL,
	ativo bool DEFAULT true NULL,
	data_inicio date DEFAULT CURRENT_DATE NULL,
	data_fim date NULL,
	observacoes text NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	created_by uuid NULL,
	updated_by uuid NULL,
	CONSTRAINT recepcionista_unidades_pkey PRIMARY KEY (id),
	CONSTRAINT uk_recepcionista_unidade UNIQUE (usuario_id, unidade_id),
	CONSTRAINT recepcionista_unidades_created_by_fkey FOREIGN KEY (created_by) REFERENCES teamcruz.usuarios(id),
	CONSTRAINT recepcionista_unidades_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
	CONSTRAINT recepcionista_unidades_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES teamcruz.usuarios(id),
	CONSTRAINT recepcionista_unidades_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_recepcionista_unidades_ativo ON teamcruz.recepcionista_unidades USING btree (ativo) WHERE (ativo = true);
CREATE INDEX idx_recepcionista_unidades_unidade ON teamcruz.recepcionista_unidades USING btree (unidade_id);
CREATE INDEX idx_recepcionista_unidades_usuario ON teamcruz.recepcionista_unidades USING btree (usuario_id);

-- Table Triggers

create trigger trg_recepcionista_unidades_updated_at before
update
    on
    teamcruz.recepcionista_unidades for each row execute function teamcruz.update_recepcionista_unidades_timestamp();


-- teamcruz.responsaveis definição

-- Drop table

-- DROP TABLE teamcruz.responsaveis;

CREATE TABLE teamcruz.responsaveis (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	usuario_id uuid NOT NULL,
	nome_completo varchar(255) NOT NULL,
	cpf varchar(11) NOT NULL,
	rg varchar(20) NULL,
	data_nascimento date NULL,
	genero varchar(20) NULL,
	email varchar(255) NOT NULL,
	telefone varchar(20) NOT NULL,
	telefone_secundario varchar(20) NULL,
	profissao varchar(100) NULL,
	empresa varchar(255) NULL,
	renda_familiar numeric(10, 2) NULL,
	ativo bool DEFAULT true NULL,
	observacoes text NULL,
	foto_url varchar(500) NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	created_by uuid NULL,
	updated_by uuid NULL,
	unidade_id uuid NOT NULL,
	contrato_assinado bool DEFAULT false NULL,
	contrato_id uuid NULL,
	contrato_assinado_em timestamp NULL,
	contrato_assinado_ip varchar(45) NULL,
	contrato_versao_assinada int4 NULL,
	consent_uso_dados_lgpd bool DEFAULT false NULL,
	consent_uso_imagem bool DEFAULT false NULL,
	endereco_id uuid NULL,
	CONSTRAINT responsaveis_cpf_key UNIQUE (cpf),
	CONSTRAINT responsaveis_pkey PRIMARY KEY (id),
	CONSTRAINT responsaveis_usuario_id_key UNIQUE (usuario_id),
	CONSTRAINT fk_responsaveis_endereco FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id) ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT fk_responsavel_contrato FOREIGN KEY (contrato_id) REFERENCES teamcruz.contratos_unidades(id) ON DELETE SET NULL,
	CONSTRAINT fk_responsavel_created_by FOREIGN KEY (created_by) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL,
	CONSTRAINT fk_responsavel_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE RESTRICT,
	CONSTRAINT fk_responsavel_updated_by FOREIGN KEY (updated_by) REFERENCES teamcruz.usuarios(id) ON DELETE SET NULL,
	CONSTRAINT fk_responsavel_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_responsaveis_ativo ON teamcruz.responsaveis USING btree (ativo);
CREATE INDEX idx_responsaveis_contrato_assinado ON teamcruz.responsaveis USING btree (contrato_assinado);
CREATE INDEX idx_responsaveis_cpf ON teamcruz.responsaveis USING btree (cpf);
CREATE INDEX idx_responsaveis_email ON teamcruz.responsaveis USING btree (email);
CREATE INDEX idx_responsaveis_endereco_id ON teamcruz.responsaveis USING btree (endereco_id);
CREATE INDEX idx_responsaveis_unidade_id ON teamcruz.responsaveis USING btree (unidade_id);
CREATE INDEX idx_responsaveis_usuario_id ON teamcruz.responsaveis USING btree (usuario_id);


-- teamcruz.tablet_unidades definição

-- Drop table

-- DROP TABLE teamcruz.tablet_unidades;

CREATE TABLE teamcruz.tablet_unidades (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	tablet_id uuid NOT NULL,
	unidade_id uuid NOT NULL,
	ativo bool DEFAULT true NULL,
	created_at timestamp DEFAULT now() NULL,
	updated_at timestamp DEFAULT now() NULL,
	CONSTRAINT tablet_unidades_pkey PRIMARY KEY (id),
	CONSTRAINT uq_tablet_unidade UNIQUE (tablet_id, unidade_id),
	CONSTRAINT fk_tablet_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
	CONSTRAINT fk_tablet_usuario FOREIGN KEY (tablet_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_tablet_unidades_ativo ON teamcruz.tablet_unidades USING btree (ativo);
CREATE INDEX idx_tablet_unidades_tablet_id ON teamcruz.tablet_unidades USING btree (tablet_id);
CREATE INDEX idx_tablet_unidades_unidade_id ON teamcruz.tablet_unidades USING btree (unidade_id);


-- teamcruz.turmas definição

-- Drop table

-- DROP TABLE teamcruz.turmas;

CREATE TABLE teamcruz.turmas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome varchar(100) NOT NULL,
	tipo_turma varchar(20) NOT NULL,
	professor_id uuid NULL,
	unidade_id uuid NULL,
	capacidade int4 DEFAULT 30 NOT NULL,
	descricao text NULL,
	nivel varchar(50) NULL,
	ativo bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT turmas_pkey PRIMARY KEY (id),
	CONSTRAINT fk_turmas_professor FOREIGN KEY (professor_id) REFERENCES teamcruz.professores(id),
	CONSTRAINT fk_turmas_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id)
);
CREATE INDEX idx_turmas_ativo ON teamcruz.turmas USING btree (ativo);
CREATE INDEX idx_turmas_professor ON teamcruz.turmas USING btree (professor_id);
CREATE INDEX idx_turmas_unidade ON teamcruz.turmas USING btree (unidade_id);

-- Table Triggers

create trigger update_turmas_updated_at before
update
    on
    teamcruz.turmas for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.aluno_graduacao definição

-- Drop table

-- DROP TABLE teamcruz.aluno_graduacao;

CREATE TABLE teamcruz.aluno_graduacao (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	faixa_origem_id uuid NOT NULL,
	faixa_destino_id uuid NOT NULL,
	dt_graduacao timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	concedido_por uuid NULL,
	observacao text NULL,
	aprovado bool DEFAULT false NOT NULL,
	aprovado_por uuid NULL,
	dt_aprovacao timestamp NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	parametro_id uuid NULL,
	solicitado_em timestamp NULL,
	observacao_aprovacao text NULL,
	tamanho_faixa varchar(10) NULL,
	CONSTRAINT aluno_graduacao_pkey PRIMARY KEY (id),
	CONSTRAINT fk_aluno_graduacao_faixa_destino FOREIGN KEY (faixa_destino_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT,
	CONSTRAINT fk_aluno_graduacao_faixa_origem FOREIGN KEY (faixa_origem_id) REFERENCES teamcruz.faixa_def(id) ON DELETE RESTRICT,
	CONSTRAINT fk_aluno_graduacao_parametro FOREIGN KEY (parametro_id) REFERENCES teamcruz.graduacao_parametros(id) ON DELETE SET NULL
);
CREATE INDEX idx_aluno_graduacao_aluno ON teamcruz.aluno_graduacao USING btree (aluno_id);
CREATE INDEX idx_aluno_graduacao_aprovado ON teamcruz.aluno_graduacao USING btree (aprovado);
CREATE INDEX idx_aluno_graduacao_dt_graduacao ON teamcruz.aluno_graduacao USING btree (dt_graduacao);
CREATE INDEX idx_aluno_graduacao_parametro ON teamcruz.aluno_graduacao USING btree (parametro_id);


-- teamcruz.alunos definição

-- Drop table

-- DROP TABLE teamcruz.alunos;

CREATE TABLE teamcruz.alunos (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome_completo varchar(255) NOT NULL,
	cpf varchar(14) NULL,
	data_nascimento date NOT NULL,
	genero teamcruz."genero_enum" NOT NULL,
	email varchar(255) NULL,
	telefone varchar(20) NULL,
	telefone_emergencia varchar(20) NULL,
	nome_contato_emergencia varchar(255) NULL,
	endereco_id uuid NULL,
	numero_matricula varchar(20) NULL,
	data_matricula date DEFAULT CURRENT_DATE NOT NULL,
	usuario_id uuid NULL,
	unidade_id uuid NOT NULL,
	status teamcruz."status_aluno_enum" DEFAULT 'ATIVO'::teamcruz.status_aluno_enum NOT NULL,
	data_ultima_graduacao date NULL,
	observacoes_medicas text NULL,
	alergias text NULL,
	medicamentos_uso_continuo text NULL,
	plano_saude varchar(100) NULL,
	atestado_medico_validade date NULL,
	restricoes_medicas text NULL,
	responsavel_nome varchar(255) NULL,
	responsavel_cpf varchar(14) NULL,
	responsavel_telefone varchar(20) NULL,
	responsavel_parentesco varchar(50) NULL,
	dia_vencimento int4 NULL,
	valor_mensalidade numeric(10, 2) NULL,
	desconto_percentual numeric(5, 2) DEFAULT 0 NOT NULL,
	consent_lgpd bool DEFAULT false NULL,
	consent_lgpd_date timestamptz NULL,
	consent_imagem bool DEFAULT false NULL,
	observacoes text NULL,
	foto_url text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	deleted_at timestamp NULL,
	responsavel_id uuid NULL,
	contrato_assinado bool DEFAULT false NULL,
	contrato_id uuid NULL,
	contrato_assinado_em timestamp NULL,
	contrato_assinado_ip varchar(45) NULL,
	contrato_versao_assinada int4 NULL,
	consent_uso_dados_lgpd bool DEFAULT false NULL,
	consent_uso_imagem bool DEFAULT false NULL,
	CONSTRAINT alunos_cpf_key UNIQUE (cpf),
	CONSTRAINT alunos_numero_matricula_key UNIQUE (numero_matricula),
	CONSTRAINT alunos_pkey PRIMARY KEY (id),
	CONSTRAINT fk_aluno_contrato FOREIGN KEY (contrato_id) REFERENCES teamcruz.contratos_unidades(id) ON DELETE SET NULL,
	CONSTRAINT fk_aluno_responsavel FOREIGN KEY (responsavel_id) REFERENCES teamcruz.responsaveis(id) ON DELETE SET NULL,
	CONSTRAINT fk_alunos_endereco FOREIGN KEY (endereco_id) REFERENCES teamcruz.enderecos(id),
	CONSTRAINT fk_alunos_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id)
);
CREATE INDEX idx_alunos_contrato_assinado ON teamcruz.alunos USING btree (contrato_assinado);
CREATE UNIQUE INDEX idx_alunos_cpf ON teamcruz.alunos USING btree (cpf);
CREATE INDEX idx_alunos_deleted_at ON teamcruz.alunos USING btree (deleted_at);
CREATE UNIQUE INDEX idx_alunos_matricula ON teamcruz.alunos USING btree (numero_matricula) WHERE (numero_matricula IS NOT NULL);
CREATE INDEX idx_alunos_nome ON teamcruz.alunos USING btree (nome_completo);
CREATE INDEX idx_alunos_responsavel_id ON teamcruz.alunos USING btree (responsavel_id);
CREATE INDEX idx_alunos_status ON teamcruz.alunos USING btree (status);
CREATE INDEX idx_alunos_unidade ON teamcruz.alunos USING btree (unidade_id);

-- Table Triggers

create trigger update_alunos_updated_at before
update
    on
    teamcruz.alunos for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.assinaturas definição

-- Drop table

-- DROP TABLE teamcruz.assinaturas;

CREATE TABLE teamcruz.assinaturas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	plano_id uuid NOT NULL,
	unidade_id uuid NOT NULL,
	status varchar(20) DEFAULT 'ATIVA'::character varying NOT NULL,
	metodo_pagamento varchar(20) DEFAULT 'PIX'::character varying NOT NULL,
	valor numeric(10, 2) NOT NULL,
	data_inicio date NOT NULL,
	data_fim date NULL,
	proxima_cobranca date NULL,
	dia_vencimento int4 DEFAULT 10 NULL,
	token_cartao varchar(255) NULL,
	dados_pagamento jsonb NULL,
	cancelado_por uuid NULL,
	cancelado_em timestamp NULL,
	motivo_cancelamento text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	retry_count int4 DEFAULT 0 NULL,
	CONSTRAINT assinaturas_metodo_pagamento_check CHECK (((metodo_pagamento)::text = ANY (ARRAY[('PIX'::character varying)::text, ('CARTAO'::character varying)::text, ('BOLETO'::character varying)::text, ('DINHEIRO'::character varying)::text, ('TRANSFERENCIA'::character varying)::text]))),
	CONSTRAINT assinaturas_pkey PRIMARY KEY (id),
	CONSTRAINT assinaturas_status_check CHECK (((status)::text = ANY (ARRAY[('ATIVA'::character varying)::text, ('PAUSADA'::character varying)::text, ('CANCELADA'::character varying)::text, ('INADIMPLENTE'::character varying)::text, ('EXPIRADA'::character varying)::text]))),
	CONSTRAINT chk_retry_count_range CHECK (((retry_count >= 0) AND (retry_count <= 3))),
	CONSTRAINT assinaturas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
	CONSTRAINT assinaturas_cancelado_por_fkey FOREIGN KEY (cancelado_por) REFERENCES teamcruz.usuarios(id),
	CONSTRAINT assinaturas_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES teamcruz.planos(id) ON DELETE RESTRICT,
	CONSTRAINT assinaturas_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_assinaturas_aluno ON teamcruz.assinaturas USING btree (aluno_id);
CREATE INDEX idx_assinaturas_cobranca_recorrente ON teamcruz.assinaturas USING btree (status, metodo_pagamento, proxima_cobranca) WHERE (token_cartao IS NOT NULL);
CREATE INDEX idx_assinaturas_plano ON teamcruz.assinaturas USING btree (plano_id);
CREATE INDEX idx_assinaturas_proxima_cobranca ON teamcruz.assinaturas USING btree (proxima_cobranca);
CREATE INDEX idx_assinaturas_retry ON teamcruz.assinaturas USING btree (retry_count) WHERE (retry_count > 0);
CREATE INDEX idx_assinaturas_status ON teamcruz.assinaturas USING btree (status);
CREATE INDEX idx_assinaturas_unidade ON teamcruz.assinaturas USING btree (unidade_id);

-- Table Triggers

create trigger update_assinaturas_updated_at before
update
    on
    teamcruz.assinaturas for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.aulas definição

-- Drop table

-- DROP TABLE teamcruz.aulas;

CREATE TABLE teamcruz.aulas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	nome varchar(255) NOT NULL,
	descricao text NULL,
	unidade_id uuid NOT NULL,
	turma_id uuid NULL,
	professor_id uuid NULL,
	tipo teamcruz."tipo_aula_enum" DEFAULT 'GI'::teamcruz.tipo_aula_enum NOT NULL,
	dia_semana int4 NULL,
	data_hora_inicio timestamptz NULL,
	data_hora_fim timestamptz NULL,
	capacidade_maxima int4 DEFAULT 30 NOT NULL,
	ativo bool DEFAULT true NOT NULL,
	qr_code varchar(500) NULL,
	qr_code_gerado_em timestamptz NULL,
	configuracoes jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT aulas_dia_semana_check CHECK (((dia_semana IS NULL) OR ((dia_semana >= 0) AND (dia_semana <= 6)))),
	CONSTRAINT aulas_pkey PRIMARY KEY (id),
	CONSTRAINT chk_aulas_horario_completo CHECK ((((dia_semana IS NOT NULL) AND (data_hora_inicio IS NOT NULL) AND (data_hora_fim IS NOT NULL)) OR ((dia_semana IS NULL) AND (data_hora_inicio IS NOT NULL) AND (data_hora_fim IS NOT NULL)))),
	CONSTRAINT fk_aulas_professor FOREIGN KEY (professor_id) REFERENCES teamcruz.professores(id),
	CONSTRAINT fk_aulas_turma FOREIGN KEY (turma_id) REFERENCES teamcruz.turmas(id),
	CONSTRAINT fk_aulas_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id)
);
CREATE INDEX idx_aulas_ativo ON teamcruz.aulas USING btree (ativo);
CREATE INDEX idx_aulas_data_hora ON teamcruz.aulas USING btree (data_hora_inicio, data_hora_fim);
CREATE INDEX idx_aulas_professor ON teamcruz.aulas USING btree (professor_id);
CREATE INDEX idx_aulas_qr_code ON teamcruz.aulas USING btree (qr_code) WHERE (qr_code IS NOT NULL);
CREATE INDEX idx_aulas_unidade_dia_inicio ON teamcruz.aulas USING btree (unidade_id, dia_semana, data_hora_inicio);

-- Table Triggers

create trigger update_aulas_updated_at before
update
    on
    teamcruz.aulas for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.contratos_assinaturas_historico definição

-- Drop table

-- DROP TABLE teamcruz.contratos_assinaturas_historico;

CREATE TABLE teamcruz.contratos_assinaturas_historico (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	contrato_id uuid NOT NULL,
	usuario_id uuid NOT NULL,
	tipo_usuario varchar(20) NOT NULL,
	versao_contrato int4 NOT NULL,
	assinado_em timestamp DEFAULT now() NULL,
	ip_address varchar(45) NULL,
	user_agent text NULL,
	aceito bool DEFAULT true NULL,
	CONSTRAINT contratos_assinaturas_historico_pkey PRIMARY KEY (id),
	CONSTRAINT contratos_assinaturas_historico_tipo_usuario_check CHECK (((tipo_usuario)::text = ANY (ARRAY[('ALUNO'::character varying)::text, ('RESPONSAVEL'::character varying)::text]))),
	CONSTRAINT fk_historico_contrato FOREIGN KEY (contrato_id) REFERENCES teamcruz.contratos_unidades(id) ON DELETE CASCADE,
	CONSTRAINT fk_historico_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_contratos_historico_contrato_id ON teamcruz.contratos_assinaturas_historico USING btree (contrato_id);
CREATE INDEX idx_contratos_historico_tipo ON teamcruz.contratos_assinaturas_historico USING btree (tipo_usuario);
CREATE INDEX idx_contratos_historico_usuario_id ON teamcruz.contratos_assinaturas_historico USING btree (usuario_id);


-- teamcruz.faturas definição

-- Drop table

-- DROP TABLE teamcruz.faturas;

CREATE TABLE teamcruz.faturas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	assinatura_id uuid NULL,
	aluno_id uuid NOT NULL,
	numero_fatura varchar(50) NOT NULL,
	descricao varchar(255) NULL,
	valor_original numeric(10, 2) NOT NULL,
	valor_desconto numeric(10, 2) DEFAULT 0 NULL,
	valor_acrescimo numeric(10, 2) DEFAULT 0 NULL,
	valor_total numeric(10, 2) NOT NULL,
	valor_pago numeric(10, 2) DEFAULT 0 NULL,
	data_vencimento date NOT NULL,
	data_pagamento date NULL,
	status varchar(25) DEFAULT 'PENDENTE'::character varying NOT NULL,
	metodo_pagamento varchar(20) NULL,
	gateway_payment_id varchar(255) NULL,
	link_pagamento varchar(500) NULL,
	qr_code_pix text NULL,
	codigo_barras_boleto varchar(255) NULL,
	dados_gateway jsonb NULL,
	observacoes text NULL,
	criado_por uuid NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT faturas_metodo_pagamento_check CHECK (((metodo_pagamento)::text = ANY (ARRAY[('PIX'::character varying)::text, ('CARTAO'::character varying)::text, ('BOLETO'::character varying)::text, ('DINHEIRO'::character varying)::text, ('TRANSFERENCIA'::character varying)::text]))),
	CONSTRAINT faturas_numero_fatura_key UNIQUE (numero_fatura),
	CONSTRAINT faturas_pkey PRIMARY KEY (id),
	CONSTRAINT faturas_status_check CHECK (((status)::text = ANY (ARRAY[('PENDENTE'::character varying)::text, ('PAGA'::character varying)::text, ('VENCIDA'::character varying)::text, ('CANCELADA'::character varying)::text, ('PARCIALMENTE_PAGA'::character varying)::text, ('NEGOCIADA'::character varying)::text]))),
	CONSTRAINT faturas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
	CONSTRAINT faturas_assinatura_id_fkey FOREIGN KEY (assinatura_id) REFERENCES teamcruz.assinaturas(id) ON DELETE SET NULL,
	CONSTRAINT faturas_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES teamcruz.usuarios(id)
);
CREATE INDEX idx_faturas_aluno ON teamcruz.faturas USING btree (aluno_id);
CREATE INDEX idx_faturas_assinatura ON teamcruz.faturas USING btree (assinatura_id);
CREATE INDEX idx_faturas_gateway_id ON teamcruz.faturas USING btree (gateway_payment_id);
CREATE INDEX idx_faturas_numero ON teamcruz.faturas USING btree (numero_fatura);
CREATE INDEX idx_faturas_status ON teamcruz.faturas USING btree (status);
CREATE INDEX idx_faturas_vencimento ON teamcruz.faturas USING btree (data_vencimento);

-- Table Triggers

create trigger update_faturas_updated_at before
update
    on
    teamcruz.faturas for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.horarios_turma definição

-- Drop table

-- DROP TABLE teamcruz.horarios_turma;

CREATE TABLE teamcruz.horarios_turma (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	turma_id uuid NOT NULL,
	dia_semana int4 NOT NULL,
	hora_inicio time NOT NULL,
	hora_fim time NOT NULL,
	ativo bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT horarios_turma_dia_semana_check CHECK (((dia_semana >= 0) AND (dia_semana <= 6))),
	CONSTRAINT horarios_turma_pkey PRIMARY KEY (id),
	CONSTRAINT fk_horarios_turma_turma FOREIGN KEY (turma_id) REFERENCES teamcruz.turmas(id) ON DELETE CASCADE
);
CREATE INDEX idx_horarios_turma_ativo ON teamcruz.horarios_turma USING btree (ativo);
CREATE INDEX idx_horarios_turma_dia ON teamcruz.horarios_turma USING btree (dia_semana);
CREATE INDEX idx_horarios_turma_turma ON teamcruz.horarios_turma USING btree (turma_id);

-- Table Triggers

create trigger update_horarios_turma_updated_at before
update
    on
    teamcruz.horarios_turma for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.presencas definição

-- Drop table

-- DROP TABLE teamcruz.presencas;

CREATE TABLE teamcruz.presencas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	aula_id uuid NOT NULL,
	status varchar(20) DEFAULT 'presente'::character varying NOT NULL,
	modo_registro varchar(20) DEFAULT 'manual'::character varying NOT NULL,
	hora_checkin timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
	observacoes text NULL,
	peso_presenca numeric(2, 1) DEFAULT 1.0 NOT NULL,
	created_by uuid NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	status_aprovacao varchar(20) DEFAULT 'PENDENTE'::character varying NULL,
	aprovado_por_id uuid NULL,
	aprovado_em timestamp NULL,
	observacao_aprovacao text NULL,
	metodo varchar(20) NULL,
	data_presenca timestamp NULL,
	CONSTRAINT presencas_pkey PRIMARY KEY (id),
	CONSTRAINT presencas_status_aprovacao_check CHECK (((status_aprovacao)::text = ANY (ARRAY[('PENDENTE'::character varying)::text, ('APROVADO'::character varying)::text, ('REJEITADO'::character varying)::text]))),
	CONSTRAINT presencas_status_check CHECK (((status)::text = ANY (ARRAY[('presente'::character varying)::text, ('falta'::character varying)::text, ('justificada'::character varying)::text, ('cancelada'::character varying)::text]))),
	CONSTRAINT fk_presencas_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
	CONSTRAINT fk_presencas_aula FOREIGN KEY (aula_id) REFERENCES teamcruz.aulas(id),
	CONSTRAINT fk_presencas_created_by FOREIGN KEY (created_by) REFERENCES teamcruz.usuarios(id),
	CONSTRAINT presencas_aprovado_por_id_fkey FOREIGN KEY (aprovado_por_id) REFERENCES teamcruz.usuarios(id)
);
CREATE INDEX idx_presencas_status_aprovacao ON teamcruz.presencas USING btree (status_aprovacao);

-- Table Triggers

create trigger update_presencas_updated_at before
update
    on
    teamcruz.presencas for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.professor_unidades definição

-- Drop table

-- DROP TABLE teamcruz.professor_unidades;

CREATE TABLE teamcruz.professor_unidades (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	professor_id uuid NULL,
	unidade_id uuid NOT NULL,
	is_principal bool DEFAULT false NOT NULL,
	data_vinculo date DEFAULT CURRENT_DATE NOT NULL,
	data_desvinculo date NULL,
	ativo bool DEFAULT true NOT NULL,
	observacoes text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	usuario_id uuid NULL,
	CONSTRAINT professor_unidades_pkey PRIMARY KEY (id),
	CONSTRAINT fk_professor_unidades_professor FOREIGN KEY (professor_id) REFERENCES teamcruz.professores(id) ON DELETE CASCADE,
	CONSTRAINT fk_professor_unidades_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
	CONSTRAINT fk_professor_unidades_usuario FOREIGN KEY (usuario_id) REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE
);
CREATE INDEX idx_professor_unidades_ativo ON teamcruz.professor_unidades USING btree (ativo);
CREATE INDEX idx_professor_unidades_principal ON teamcruz.professor_unidades USING btree (is_principal);
CREATE INDEX idx_professor_unidades_professor_id ON teamcruz.professor_unidades USING btree (professor_id);
CREATE INDEX idx_professor_unidades_unidade_id ON teamcruz.professor_unidades USING btree (unidade_id);
CREATE INDEX idx_professor_unidades_usuario_id ON teamcruz.professor_unidades USING btree (usuario_id);
CREATE UNIQUE INDEX uk_professor_unidade_id ON teamcruz.professor_unidades USING btree (professor_id, unidade_id) WHERE (professor_id IS NOT NULL);
CREATE UNIQUE INDEX uk_usuario_unidade_id ON teamcruz.professor_unidades USING btree (usuario_id, unidade_id) WHERE (usuario_id IS NOT NULL);

-- Table Triggers

create trigger update_professor_unidades_updated_at before
update
    on
    teamcruz.professor_unidades for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.transacoes definição

-- Drop table

-- DROP TABLE teamcruz.transacoes;

CREATE TABLE teamcruz.transacoes (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	tipo varchar(10) NOT NULL,
	origem varchar(20) NOT NULL,
	categoria varchar(20) DEFAULT 'OUTRO'::character varying NOT NULL,
	descricao varchar(255) NOT NULL,
	aluno_id uuid NULL,
	unidade_id uuid NULL,
	fatura_id uuid NULL,
	despesa_id uuid NULL,
	valor numeric(10, 2) NOT NULL,
	"data" date NOT NULL,
	status varchar(20) DEFAULT 'CONFIRMADA'::character varying NOT NULL,
	metodo_pagamento varchar(20) NULL,
	comprovante varchar(255) NULL,
	observacoes text NULL,
	criado_por uuid NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	venda_id uuid NULL,
	paytime_transaction_id varchar(255) NULL,
	paytime_payment_type varchar(50) NULL,
	paytime_metadata jsonb NULL,
	CONSTRAINT transacoes_categoria_check CHECK (((categoria)::text = ANY (ARRAY[('SISTEMA'::character varying)::text, ('MENSALIDADE'::character varying)::text, ('PRODUTO'::character varying)::text, ('AULA_AVULSA'::character varying)::text, ('COMPETICAO'::character varying)::text, ('TAXA'::character varying)::text, ('ALUGUEL'::character varying)::text, ('SALARIO'::character varying)::text, ('FORNECEDOR'::character varying)::text, ('UTILIDADE'::character varying)::text, ('OUTRO'::character varying)::text]))),
	CONSTRAINT transacoes_metodo_pagamento_check CHECK (((metodo_pagamento)::text = ANY (ARRAY[('PIX'::character varying)::text, ('CARTAO'::character varying)::text, ('BOLETO'::character varying)::text, ('DINHEIRO'::character varying)::text, ('TRANSFERENCIA'::character varying)::text]))),
	CONSTRAINT transacoes_origem_check CHECK (((origem)::text = ANY (ARRAY[('FATURA'::character varying)::text, ('VENDA'::character varying)::text, ('DESPESA'::character varying)::text, ('MANUAL'::character varying)::text, ('ESTORNO'::character varying)::text, ('GYMPASS'::character varying)::text, ('CORPORATE'::character varying)::text]))),
	CONSTRAINT transacoes_pkey PRIMARY KEY (id),
	CONSTRAINT transacoes_status_check CHECK (((status)::text = ANY (ARRAY[('CONFIRMADA'::character varying)::text, ('PENDENTE'::character varying)::text, ('CANCELADA'::character varying)::text, ('ESTORNADA'::character varying)::text]))),
	CONSTRAINT transacoes_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('ENTRADA'::character varying)::text, ('SAIDA'::character varying)::text]))),
	CONSTRAINT transacoes_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE SET NULL,
	CONSTRAINT transacoes_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES teamcruz.usuarios(id),
	CONSTRAINT transacoes_despesa_id_fkey FOREIGN KEY (despesa_id) REFERENCES teamcruz.despesas(id) ON DELETE SET NULL,
	CONSTRAINT transacoes_fatura_id_fkey FOREIGN KEY (fatura_id) REFERENCES teamcruz.faturas(id) ON DELETE SET NULL,
	CONSTRAINT transacoes_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_transacoes_aluno ON teamcruz.transacoes USING btree (aluno_id);
CREATE INDEX idx_transacoes_data ON teamcruz.transacoes USING btree (data);
CREATE INDEX idx_transacoes_despesa ON teamcruz.transacoes USING btree (despesa_id);
CREATE INDEX idx_transacoes_fatura ON teamcruz.transacoes USING btree (fatura_id);
CREATE INDEX idx_transacoes_origem ON teamcruz.transacoes USING btree (origem);
CREATE INDEX idx_transacoes_paytime_id ON teamcruz.transacoes USING btree (paytime_transaction_id);
CREATE INDEX idx_transacoes_status ON teamcruz.transacoes USING btree (status);
CREATE INDEX idx_transacoes_tipo ON teamcruz.transacoes USING btree (tipo);
CREATE INDEX idx_transacoes_unidade ON teamcruz.transacoes USING btree (unidade_id);

-- Table Triggers

create trigger update_transacoes_updated_at before
update
    on
    teamcruz.transacoes for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.vendas definição

-- Drop table

-- DROP TABLE teamcruz.vendas;

CREATE TABLE teamcruz.vendas (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	numero_venda varchar(50) NOT NULL,
	aluno_id uuid NOT NULL,
	unidade_id uuid NULL,
	fatura_id uuid NULL,
	descricao varchar(255) NOT NULL,
	valor numeric(10, 2) NOT NULL,
	metodo_pagamento varchar(20) DEFAULT 'PIX'::character varying NOT NULL,
	status varchar(20) DEFAULT 'PENDENTE'::character varying NOT NULL,
	gateway_payment_id varchar(255) NULL,
	link_pagamento varchar(500) NULL,
	qr_code_pix text NULL,
	codigo_barras_boleto varchar(255) NULL,
	dados_gateway jsonb NULL,
	data_pagamento timestamp NULL,
	data_expiracao timestamp NULL,
	observacoes text NULL,
	ip_origem varchar(100) NULL,
	user_agent varchar(255) NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT vendas_metodo_pagamento_check CHECK (((metodo_pagamento)::text = ANY (ARRAY[('PIX'::character varying)::text, ('CARTAO'::character varying)::text, ('BOLETO'::character varying)::text, ('DINHEIRO'::character varying)::text, ('TRANSFERENCIA'::character varying)::text]))),
	CONSTRAINT vendas_numero_venda_key UNIQUE (numero_venda),
	CONSTRAINT vendas_pkey PRIMARY KEY (id),
	CONSTRAINT vendas_status_check CHECK (((status)::text = ANY (ARRAY[('PENDENTE'::character varying)::text, ('PROCESSANDO'::character varying)::text, ('PAGO'::character varying)::text, ('AGUARDANDO'::character varying)::text, ('FALHOU'::character varying)::text, ('CANCELADO'::character varying)::text, ('ESTORNADO'::character varying)::text]))),
	CONSTRAINT vendas_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
	CONSTRAINT vendas_fatura_id_fkey FOREIGN KEY (fatura_id) REFERENCES teamcruz.faturas(id) ON DELETE SET NULL,
	CONSTRAINT vendas_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE SET NULL
);
CREATE INDEX idx_vendas_aluno ON teamcruz.vendas USING btree (aluno_id);
CREATE INDEX idx_vendas_created_at ON teamcruz.vendas USING btree (created_at);
CREATE INDEX idx_vendas_gateway_id ON teamcruz.vendas USING btree (gateway_payment_id);
CREATE INDEX idx_vendas_status ON teamcruz.vendas USING btree (status);
CREATE INDEX idx_vendas_unidade ON teamcruz.vendas USING btree (unidade_id);

-- Table Triggers

create trigger update_vendas_updated_at before
update
    on
    teamcruz.vendas for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.aluno_convenios definição

-- Drop table

-- DROP TABLE teamcruz.aluno_convenios;

CREATE TABLE teamcruz.aluno_convenios (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	convenio_id uuid NOT NULL,
	unidade_id uuid NOT NULL,
	convenio_user_id varchar(255) NOT NULL,
	status varchar(50) DEFAULT 'ativo'::character varying NOT NULL,
	data_ativacao timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	data_cancelamento timestamp NULL,
	motivo_cancelamento text NULL,
	metadata jsonb NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT aluno_convenios_pkey PRIMARY KEY (id),
	CONSTRAINT aluno_convenios_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
	CONSTRAINT aluno_convenios_convenio_id_fkey FOREIGN KEY (convenio_id) REFERENCES teamcruz.convenios(id) ON DELETE CASCADE,
	CONSTRAINT aluno_convenios_unidade_id_fkey FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_aluno_convenio_aluno ON teamcruz.aluno_convenios USING btree (aluno_id);
CREATE INDEX idx_aluno_convenio_ativo ON teamcruz.aluno_convenios USING btree (aluno_id, convenio_id) WHERE ((status)::text = 'ativo'::text);
CREATE INDEX idx_aluno_convenio_status ON teamcruz.aluno_convenios USING btree (status);
CREATE INDEX idx_aluno_convenio_tipo ON teamcruz.aluno_convenios USING btree (convenio_id);
CREATE INDEX idx_aluno_convenio_user_id ON teamcruz.aluno_convenios USING btree (convenio_user_id);

-- Table Triggers

create trigger update_aluno_convenios_updated_at before
update
    on
    teamcruz.aluno_convenios for each row execute function teamcruz.update_updated_at_column();


-- teamcruz.aluno_modalidades definição

-- Drop table

-- DROP TABLE teamcruz.aluno_modalidades;

CREATE TABLE teamcruz.aluno_modalidades (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_id uuid NOT NULL,
	modalidade_id uuid NOT NULL,
	data_matricula timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	valor_praticado numeric(10, 2) NULL,
	ativo bool DEFAULT true NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT aluno_modalidades_pkey PRIMARY KEY (id),
	CONSTRAINT uk_aluno_modalidade UNIQUE (aluno_id, modalidade_id),
	CONSTRAINT fk_aluno_modalidades_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
	CONSTRAINT fk_aluno_modalidades_modalidade FOREIGN KEY (modalidade_id) REFERENCES teamcruz.modalidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_aluno_modalidades_aluno ON teamcruz.aluno_modalidades USING btree (aluno_id);
CREATE INDEX idx_aluno_modalidades_ativo ON teamcruz.aluno_modalidades USING btree (ativo);
CREATE INDEX idx_aluno_modalidades_modalidade ON teamcruz.aluno_modalidades USING btree (modalidade_id);


-- teamcruz.aluno_unidades definição

-- Drop table

-- DROP TABLE teamcruz.aluno_unidades;

CREATE TABLE teamcruz.aluno_unidades (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	aluno_id uuid NOT NULL,
	unidade_id uuid NOT NULL,
	is_principal bool DEFAULT false NULL,
	data_vinculo timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	data_desvinculo timestamp NULL,
	ativo bool DEFAULT true NULL,
	observacoes text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	data_matricula timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT aluno_unidades_pkey PRIMARY KEY (id),
	CONSTRAINT uq_aluno_unidade UNIQUE (aluno_id, unidade_id),
	CONSTRAINT fk_aluno_unidades_aluno FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
	CONSTRAINT fk_aluno_unidades_unidade FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE
);
CREATE INDEX idx_aluno_unidades_aluno ON teamcruz.aluno_unidades USING btree (aluno_id);
CREATE INDEX idx_aluno_unidades_ativo ON teamcruz.aluno_unidades USING btree (ativo) WHERE (ativo = true);
CREATE INDEX idx_aluno_unidades_principal ON teamcruz.aluno_unidades USING btree (aluno_id, is_principal) WHERE (is_principal = true);
CREATE INDEX idx_aluno_unidades_unidade ON teamcruz.aluno_unidades USING btree (unidade_id);


-- teamcruz.eventos_convenio definição

-- Drop table

-- DROP TABLE teamcruz.eventos_convenio;

CREATE TABLE teamcruz.eventos_convenio (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	aluno_convenio_id uuid NOT NULL,
	presenca_id uuid NOT NULL,
	convenio_id uuid NOT NULL,
	tipo_evento varchar(50) NOT NULL,
	enviado bool DEFAULT false NULL,
	data_envio timestamp NULL,
	response_status int4 NULL,
	response_body jsonb NULL,
	tentativas int4 DEFAULT 0 NULL,
	erro text NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT eventos_convenio_pkey PRIMARY KEY (id),
	CONSTRAINT eventos_convenio_aluno_convenio_id_fkey FOREIGN KEY (aluno_convenio_id) REFERENCES teamcruz.aluno_convenios(id) ON DELETE CASCADE,
	CONSTRAINT eventos_convenio_convenio_id_fkey FOREIGN KEY (convenio_id) REFERENCES teamcruz.convenios(id) ON DELETE CASCADE,
	CONSTRAINT eventos_convenio_presenca_id_fkey FOREIGN KEY (presenca_id) REFERENCES teamcruz.presencas(id) ON DELETE CASCADE
);
CREATE INDEX idx_eventos_convenio_aluno ON teamcruz.eventos_convenio USING btree (aluno_convenio_id);
CREATE INDEX idx_eventos_convenio_created ON teamcruz.eventos_convenio USING btree (created_at DESC);
CREATE INDEX idx_eventos_convenio_enviado ON teamcruz.eventos_convenio USING btree (enviado) WHERE (enviado = false);
CREATE INDEX idx_eventos_convenio_presenca ON teamcruz.eventos_convenio USING btree (presenca_id);