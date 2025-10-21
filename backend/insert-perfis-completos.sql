-- ============================================================================
-- SCRIPT DE INSERT COMPLETO DE PERFIS - TEAM CRUZ
-- Data: 18 de Outubro de 2025
-- Descrição: Insere todos os perfis necessários para o sistema
-- ============================================================================

-- PRÉ-REQUISITO: As tabelas de permissões devem estar criadas e populadas
-- Execute primeiro a migration: 1756928100000-SeedPerfisPermissoes.ts

-- ============================================================================
-- 1. PERFIS PRINCIPAIS DO SISTEMA
-- ============================================================================

-- 1.1 MASTER (Administrador Total)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'master',
  'Administrador master do sistema com acesso total',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 1.2 FRANQUEADO (Proprietário de Franquia)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'franqueado',
  'Proprietário de franquia - gerencia múltiplas unidades e seus recursos',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 1.3 GERENTE DE UNIDADE (Gerente de Academia)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'gerente_unidade',
  'Gerente de unidade/academia - responsável pela gestão operacional de uma unidade',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 1.4 PROFESSOR/INSTRUTOR (mesmo perfil)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'professor',
  'Professor/Instrutor de jiu-jitsu - ministra aulas e acompanha evolução dos alunos',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 1.5 INSTRUTOR (alias do Professor - para compatibilidade)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'instrutor',
  'Instrutor/Professor de jiu-jitsu - ministra aulas e acompanha evolução dos alunos',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 1.6 ALUNO (Aluno de Jiu-Jitsu)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'aluno',
  'Aluno de jiu-jitsu - acesso limitado aos próprios dados e histórico',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 2. PERFIS COMPLEMENTARES (OPCIONAIS - PARA EXPANSÃO FUTURA)
-- ============================================================================

-- 2.1 RECEPCIONISTA (Atendimento e Check-in)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'recepcionista',
  'Recepcionista - responsável por atendimento, check-in e cadastros básicos',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 2.2 FINANCEIRO (Gestor Financeiro)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'financeiro',
  'Responsável financeiro - controle de pagamentos, mensalidades e relatórios financeiros',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 2.3 COORDENADOR TÉCNICO (Coordenador de Graduações)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'coordenador_tecnico',
  'Coordenador técnico - responsável por aprovações de graduações e avaliações técnicas',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 2.4 SUPERVISOR REGIONAL (Múltiplas Unidades)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'supervisor_regional',
  'Supervisor regional - supervisiona múltiplas unidades em uma região',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 2.5 RESPONSÁVEL (Responsável Legal de Menor)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'responsavel',
  'Responsável legal - acesso aos dados e histórico dos filhos/dependentes',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- 2.6 VISUALIZADOR (Apenas Leitura)
INSERT INTO teamcruz.perfis (id, nome, descricao, ativo, created_at, updated_at)
VALUES (
  uuid_generate_v4(),
  'visualizador',
  'Visualizador - acesso somente leitura para relatórios e consultas',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 3. VERIFICAR PERFIS INSERIDOS
-- ============================================================================

-- Listar todos os perfis criados
SELECT
  id,
  nome,
  descricao,
  ativo,
  created_at,
  updated_at
FROM teamcruz.perfis
ORDER BY
  CASE nome
    WHEN 'master' THEN 1
    WHEN 'franqueado' THEN 2
    WHEN 'supervisor_regional' THEN 3
    WHEN 'gerente_unidade' THEN 4
    WHEN 'coordenador_tecnico' THEN 5
    WHEN 'professor' THEN 6
    WHEN 'instrutor' THEN 7
    WHEN 'financeiro' THEN 8
    WHEN 'recepcionista' THEN 9
    WHEN 'aluno' THEN 10
    WHEN 'responsavel' THEN 11
    WHEN 'visualizador' THEN 12
    ELSE 99
  END;

-- ============================================================================
-- 4. RESUMO DOS PERFIS
-- ============================================================================

/*
┌─────────────────────────────────────────────────────────────────────────┐
│                        PERFIS DO SISTEMA TEAM CRUZ                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ 🔐 PERFIS PRINCIPAIS (OBRIGATÓRIOS):                                     │
│                                                                           │
│ 1. MASTER              → Administrador total do sistema                  │
│ 2. FRANQUEADO          → Proprietário de franquia                        │
│ 3. GERENTE_UNIDADE     → Gerente de academia                             │
│ 4. PROFESSOR/INSTRUTOR → Professor de jiu-jitsu                          │
│ 5. ALUNO               → Aluno matriculado                               │
│                                                                           │
│ 📋 PERFIS COMPLEMENTARES (OPCIONAIS):                                    │
│                                                                           │
│ 6. RECEPCIONISTA       → Atendimento e check-in                          │
│ 7. FINANCEIRO          → Gestão financeira                               │
│ 8. COORDENADOR_TECNICO → Aprovações de graduações                        │
│ 9. SUPERVISOR_REGIONAL → Supervisão de múltiplas unidades                │
│ 10. RESPONSAVEL        → Responsável legal de menor                      │
│ 11. VISUALIZADOR       → Acesso somente leitura                          │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

📌 HIERARQUIA DE ACESSO (do maior para o menor):

1. Master               → Acesso total a tudo
2. Supervisor Regional  → Múltiplas unidades de uma região
3. Franqueado          → Todas as suas unidades
4. Gerente Unidade     → Uma unidade específica
5. Coordenador Técnico → Aprovações técnicas
6. Professor/Instrutor → Suas turmas e alunos
7. Financeiro          → Dados financeiros
8. Recepcionista       → Atendimento e cadastros
9. Responsável         → Dados dos dependentes
10. Aluno              → Apenas seus dados
11. Visualizador       → Apenas leitura

*/

-- ============================================================================
-- 5. PRÓXIMOS PASSOS
-- ============================================================================

/*
DEPOIS DE EXECUTAR ESTE SCRIPT:

1. ✅ Execute o script de permissões para vincular permissões aos perfis:
   Arquivo: insert-permissoes-perfis.sql (criar se necessário)

2. ✅ Crie usuários e vincule aos perfis:
   INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id)
   VALUES (
     (SELECT id FROM teamcruz.usuarios WHERE username = 'joao'),
     (SELECT id FROM teamcruz.perfis WHERE nome = 'professor')
   );

3. ✅ Configure as permissões específicas de cada perfil conforme necessidade

4. ✅ Teste o sistema de autenticação e autorização
*/
