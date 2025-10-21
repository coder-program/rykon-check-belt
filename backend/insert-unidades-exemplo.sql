-- =========================================
-- MASSA DE DADOS PARA UNIDADES
-- TeamCruz Jiu-Jitsu
-- =========================================

-- IMPORTANTE: Este script depende que os franqueados já estejam inseridos
-- Execute primeiro: insert-franqueados-exemplo.sql

-- =========================================
-- VERIFICAR SE FRANQUEADOS EXISTEM
-- =========================================

-- Verificar franqueados disponíveis
SELECT id, nome, cnpj FROM teamcruz.franqueados ORDER BY nome;

-- Se não houver franqueados, execute primeiro:
-- \i insert-franqueados-exemplo.sql

-- =========================================
-- UNIDADES DO FRANQUEADO 1: TeamCruz SP
-- =========================================

-- UNIDADE 1: TeamCruz SP - Moema
INSERT INTO teamcruz.unidades (
    id,
    franqueado_id,
    nome,
    cnpj,
    razao_social,
    nome_fantasia,
    inscricao_estadual,
    inscricao_municipal,
    codigo_interno,
    telefone_fixo,
    telefone_celular,
    email,
    website,
    redes_sociais,
    status,
    responsavel_nome,
    responsavel_cpf,
    responsavel_papel,
    responsavel_contato,
    qtde_tatames,
    area_tatame_m2,
    capacidade_max_alunos,
    qtde_instrutores,
    valor_plano_padrao,
    horarios_funcionamento,
    modalidades,
    instrutor_principal_id,
    endereco_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM teamcruz.franqueados WHERE cnpj = '12345678000190'), -- TeamCruz SP
    'TeamCruz SP - Unidade Moema',
    '12345678000271',
    'TeamCruz Jiu-Jitsu Ltda - Filial Moema',
    'TeamCruz Moema',
    '123.456.789.124',
    '9876544',
    'SP-MOEMA-001',
    '1155556666',
    '11988887777',
    'moema@teamcruz-sp.com.br',
    'https://www.teamcruz-sp.com.br/moema',
    '{
        "instagram": "@teamcruz_moema",
        "facebook": "TeamCruzMoema",
        "youtube": "TeamCruzMoema",
        "tiktok": "@teamcruzmoema"
    }'::jsonb,
    'ATIVA',
    'Roberto Carlos Santos',
    '111.222.333-44',
    'GERENTE',
    'roberto.santos@teamcruz-sp.com.br',
    2,
    180.00,
    80,
    5,
    350.00,
    '{
        "seg": "06:00-22:00",
        "ter": "06:00-22:00",
        "qua": "06:00-22:00",
        "qui": "06:00-22:00",
        "sex": "06:00-22:00",
        "sab": "08:00-14:00",
        "dom": "09:00-12:00"
    }'::jsonb,
    '["INFANTIL", "ADULTO", "NO-GI", "COMPETICAO", "FEMININO"]'::jsonb,
    NULL, -- Será preenchido depois com ID do professor
    NULL, -- Será preenchido depois com ID do endereço
    NOW(),
    NOW()
);

-- UNIDADE 2: TeamCruz SP - Pinheiros
INSERT INTO teamcruz.unidades (
    id,
    franqueado_id,
    nome,
    cnpj,
    razao_social,
    nome_fantasia,
    inscricao_estadual,
    inscricao_municipal,
    codigo_interno,
    telefone_fixo,
    telefone_celular,
    email,
    website,
    redes_sociais,
    status,
    responsavel_nome,
    responsavel_cpf,
    responsavel_papel,
    responsavel_contato,
    qtde_tatames,
    area_tatame_m2,
    capacidade_max_alunos,
    qtde_instrutores,
    valor_plano_padrao,
    horarios_funcionamento,
    modalidades,
    instrutor_principal_id,
    endereco_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM teamcruz.franqueados WHERE cnpj = '12345678000190'), -- TeamCruz SP
    'TeamCruz SP - Unidade Pinheiros',
    '12345678000352',
    'TeamCruz Jiu-Jitsu Ltda - Filial Pinheiros',
    'TeamCruz Pinheiros',
    '123.456.789.125',
    '9876545',
    'SP-PINH-002',
    '1144445555',
    '11977776666',
    'pinheiros@teamcruz-sp.com.br',
    'https://www.teamcruz-sp.com.br/pinheiros',
    '{
        "instagram": "@teamcruz_pinheiros",
        "facebook": "TeamCruzPinheiros",
        "youtube": "TeamCruzPinheiros",
        "tiktok": "@teamcruzpinheiros"
    }'::jsonb,
    'ATIVA',
    'Mariana Oliveira Costa',
    '222.333.444-55',
    'GERENTE',
    'mariana.costa@teamcruz-sp.com.br',
    3,
    250.00,
    120,
    8,
    380.00,
    '{
        "seg": "06:00-22:00",
        "ter": "06:00-22:00",
        "qua": "06:00-22:00",
        "qui": "06:00-22:00",
        "sex": "06:00-22:00",
        "sab": "08:00-16:00",
        "dom": "09:00-13:00"
    }'::jsonb,
    '["INFANTIL", "ADULTO", "NO-GI", "COMPETICAO", "FEMININO", "AUTODEFESA", "CONDICIONAMENTO"]'::jsonb,
    NULL, -- Será preenchido depois com ID do professor
    NULL, -- Será preenchido depois com ID do endereço
    NOW(),
    NOW()
);

-- =========================================
-- UNIDADES DO FRANQUEADO 2: TeamCruz RJ
-- =========================================

-- UNIDADE 3: TeamCruz RJ - Copacabana
INSERT INTO teamcruz.unidades (
    id,
    franqueado_id,
    nome,
    cnpj,
    razao_social,
    nome_fantasia,
    inscricao_estadual,
    inscricao_municipal,
    codigo_interno,
    telefone_fixo,
    telefone_celular,
    email,
    website,
    redes_sociais,
    status,
    responsavel_nome,
    responsavel_cpf,
    responsavel_papel,
    responsavel_contato,
    qtde_tatames,
    area_tatame_m2,
    capacidade_max_alunos,
    qtde_instrutores,
    valor_plano_padrao,
    horarios_funcionamento,
    modalidades,
    instrutor_principal_id,
    endereco_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM teamcruz.franqueados WHERE cnpj = '98765432000110'), -- TeamCruz RJ
    'TeamCruz RJ - Unidade Copacabana',
    '98765432000291',
    'TeamCruz RJ Academia de Artes Marciais Ltda - Filial Copacabana',
    'TeamCruz Copacabana',
    '987.654.321.988',
    '1234568',
    'RJ-COPA-001',
    '2133334444',
    '21999998888',
    'copacabana@teamcruz-rj.com.br',
    'https://www.teamcruz-rj.com.br/copacabana',
    '{
        "instagram": "@teamcruz_copa",
        "facebook": "TeamCruzCopacabana",
        "youtube": "TeamCruzCopa",
        "tiktok": "@teamcruzcopa"
    }'::jsonb,
    'ATIVA',
    'Felipe Augusto Lima',
    '333.444.555-66',
    'GERENTE',
    'felipe.lima@teamcruz-rj.com.br',
    2,
    200.00,
    90,
    6,
    320.00,
    '{
        "seg": "06:30-22:00",
        "ter": "06:30-22:00",
        "qua": "06:30-22:00",
        "qui": "06:30-22:00",
        "sex": "06:30-22:00",
        "sab": "08:00-15:00",
        "dom": "09:00-13:00"
    }'::jsonb,
    '["INFANTIL", "ADULTO", "NO-GI", "COMPETICAO", "FEMININO"]'::jsonb,
    NULL, -- Será preenchido depois com ID do professor
    NULL, -- Será preenchido depois com ID do endereço
    NOW(),
    NOW()
);

-- UNIDADE 4: TeamCruz RJ - Barra da Tijuca
INSERT INTO teamcruz.unidades (
    id,
    franqueado_id,
    nome,
    cnpj,
    razao_social,
    nome_fantasia,
    inscricao_estadual,
    inscricao_municipal,
    codigo_interno,
    telefone_fixo,
    telefone_celular,
    email,
    website,
    redes_sociais,
    status,
    responsavel_nome,
    responsavel_cpf,
    responsavel_papel,
    responsavel_contato,
    qtde_tatames,
    area_tatame_m2,
    capacidade_max_alunos,
    qtde_instrutores,
    valor_plano_padrao,
    horarios_funcionamento,
    modalidades,
    instrutor_principal_id,
    endereco_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM teamcruz.franqueados WHERE cnpj = '98765432000110'), -- TeamCruz RJ
    'TeamCruz RJ - Unidade Barra da Tijuca',
    '98765432000372',
    'TeamCruz RJ Academia de Artes Marciais Ltda - Filial Barra',
    'TeamCruz Barra',
    '987.654.321.989',
    '1234569',
    'RJ-BARRA-002',
    '2144445555',
    '21988887777',
    'barra@teamcruz-rj.com.br',
    'https://www.teamcruz-rj.com.br/barra',
    '{
        "instagram": "@teamcruz_barra",
        "facebook": "TeamCruzBarra",
        "youtube": "TeamCruzBarra",
        "tiktok": "@teamcruzbarra"
    }'::jsonb,
    'ATIVA',
    'Juliana Ferreira Alves',
    '444.555.666-77',
    'GERENTE',
    'juliana.alves@teamcruz-rj.com.br',
    4,
    350.00,
    150,
    10,
    400.00,
    '{
        "seg": "06:00-22:30",
        "ter": "06:00-22:30",
        "qua": "06:00-22:30",
        "qui": "06:00-22:30",
        "sex": "06:00-22:30",
        "sab": "08:00-18:00",
        "dom": "09:00-14:00"
    }'::jsonb,
    '["INFANTIL", "ADULTO", "NO-GI", "COMPETICAO", "FEMININO", "AUTODEFESA", "CONDICIONAMENTO"]'::jsonb,
    NULL, -- Será preenchido depois com ID do professor
    NULL, -- Será preenchido depois com ID do endereço
    NOW(),
    NOW()
);

-- =========================================
-- VERIFICAR DADOS INSERIDOS
-- =========================================

-- Listar todas as unidades com seus franqueados
SELECT
    u.id,
    u.nome,
    u.cnpj,
    u.codigo_interno,
    u.responsavel_nome,
    u.status,
    u.qtde_tatames,
    u.capacidade_max_alunos,
    u.qtde_instrutores,
    u.valor_plano_padrao,
    f.nome as franqueado_nome,
    u.created_at
FROM teamcruz.unidades u
LEFT JOIN teamcruz.franqueados f ON u.franqueado_id = f.id
ORDER BY f.nome, u.nome;

-- Verificar detalhes completos
SELECT * FROM teamcruz.unidades ORDER BY created_at DESC;

-- Contar unidades por franqueado
SELECT
    f.nome as franqueado,
    COUNT(u.id) as total_unidades
FROM teamcruz.franqueados f
LEFT JOIN teamcruz.unidades u ON f.id = u.franqueado_id
GROUP BY f.id, f.nome
ORDER BY f.nome;
