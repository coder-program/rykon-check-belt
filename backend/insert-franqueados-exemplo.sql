-- =========================================
-- MASSA DE DADOS PARA FRANQUEADOS
-- TeamCruz Jiu-Jitsu
-- =========================================

-- FRANQUEADO 1: TeamCruz Matriz (São Paulo)
INSERT INTO teamcruz.franqueados (
    id,
    nome,
    cnpj,
    razao_social,
    nome_fantasia,
    inscricao_estadual,
    inscricao_municipal,
    email,
    telefone,
    telefone_fixo,
    telefone_celular,
    website,
    redes_sociais,
    responsavel_nome,
    responsavel_cpf,
    responsavel_cargo,
    responsavel_email,
    responsavel_telefone,
    ano_fundacao,
    missao,
    visao,
    valores,
    historico,
    logotipo_url,
    id_matriz,
    unidades_gerencia,
    data_contrato,
    taxa_franquia,
    dados_bancarios,
    situacao,
    ativo,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'TeamCruz Matriz São Paulo',
    '12.345.678/0001-90',
    'TeamCruz Jiu-Jitsu Ltda',
    'TeamCruz SP',
    '123.456.789.123',
    '9876543',
    'contato@teamcruz-sp.com.br',
    '1133334444',
    '1133334444',
    '11987654321',
    'https://www.teamcruz-sp.com.br',
    '{
        "instagram": "@teamcruz_sp",
        "facebook": "TeamCruzSP",
        "youtube": "TeamCruzSP",
        "tiktok": "@teamcruzsp",
        "linkedin": "teamcruz-sp"
    }'::jsonb,
    'Carlos Eduardo Silva',
    '123.456.789-00',
    'Diretor Executivo',
    'carlos.silva@teamcruz-sp.com.br',
    '11987654321',
    2015,
    'Promover o Jiu-Jitsu como estilo de vida e formar campeões dentro e fora dos tatames',
    'Ser referência nacional em ensino de Jiu-Jitsu de alta qualidade',
    'Disciplina, Respeito, Excelência, Trabalho em Equipe, Integridade',
    'Fundada em 2015 por mestres com mais de 20 anos de experiência no Jiu-Jitsu brasileiro. Iniciamos com uma pequena academia na zona sul de São Paulo e hoje somos uma das maiores redes de academias do estado.',
    'https://storage.teamcruz.com.br/logos/teamcruz-sp.png',
    NULL, -- É matriz (não tem id_matriz)
    ARRAY[]::text[], -- Será preenchido com IDs das unidades depois
    '2015-03-15',
    5000.00,
    '{
        "banco": "Banco do Brasil",
        "agencia": "1234-5",
        "conta": "98765-4",
        "titular": "TeamCruz Jiu-Jitsu Ltda",
        "documento": "12.345.678/0001-90"
    }'::jsonb,
    'ATIVA',
    true,
    NOW(),
    NOW()
);

-- FRANQUEADO 2: TeamCruz Rio de Janeiro
INSERT INTO teamcruz.franqueados (
    id,
    nome,
    cnpj,
    razao_social,
    nome_fantasia,
    inscricao_estadual,
    inscricao_municipal,
    email,
    telefone,
    telefone_fixo,
    telefone_celular,
    website,
    redes_sociais,
    responsavel_nome,
    responsavel_cpf,
    responsavel_cargo,
    responsavel_email,
    responsavel_telefone,
    ano_fundacao,
    missao,
    visao,
    valores,
    historico,
    logotipo_url,
    id_matriz,
    unidades_gerencia,
    data_contrato,
    taxa_franquia,
    dados_bancarios,
    situacao,
    ativo,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'TeamCruz Rio de Janeiro',
    '98.765.432/0001-10',
    'TeamCruz RJ Academia de Artes Marciais Ltda',
    'TeamCruz RJ',
    '987.654.321.987',
    '1234567',
    'contato@teamcruz-rj.com.br',
    '2122223333',
    '2122223333',
    '21987654321',
    'https://www.teamcruz-rj.com.br',
    '{
        "instagram": "@teamcruz_rj",
        "facebook": "TeamCruzRJ",
        "youtube": "TeamCruzRJ",
        "tiktok": "@teamcruzrj",
        "linkedin": "teamcruz-rj"
    }'::jsonb,
    'Ana Paula Rodrigues',
    '987.654.321-00',
    'Diretora Regional',
    'ana.rodrigues@teamcruz-rj.com.br',
    '21987654321',
    2018,
    'Desenvolver atletas de alto nível e promover valores através do Jiu-Jitsu',
    'Ser a maior rede de academias de Jiu-Jitsu do Rio de Janeiro',
    'Tradição, Inovação, Comunidade, Superação, Família',
    'Inaugurada em 2018, a franquia TeamCruz RJ nasceu do sonho de levar o ensino de qualidade do Jiu-Jitsu para a cidade maravilhosa. Começamos com uma unidade em Copacabana e hoje contamos com múltiplas unidades pela cidade.',
    'https://storage.teamcruz.com.br/logos/teamcruz-rj.png',
    NULL, -- Também é uma matriz (franqueado independente)
    ARRAY[]::text[], -- Será preenchido com IDs das unidades depois
    '2018-07-20',
    4500.00,
    '{
        "banco": "Itaú",
        "agencia": "5678",
        "conta": "12345-6",
        "titular": "TeamCruz RJ Academia de Artes Marciais Ltda",
        "documento": "98.765.432/0001-10"
    }'::jsonb,
    'ATIVA',
    true,
    NOW(),
    NOW()
);

-- =========================================
-- VERIFICAR DADOS INSERIDOS
-- =========================================

-- Listar todos os franqueados
SELECT
    id,
    nome,
    cnpj,
    nome_fantasia,
    responsavel_nome,
    situacao,
    ativo,
    created_at
FROM teamcruz.franqueados
ORDER BY created_at DESC;

-- Verificar detalhes completos
SELECT * FROM teamcruz.franqueados;
