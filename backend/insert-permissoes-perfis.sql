-- ============================================================================
-- SCRIPT DE VINCULAÇÃO DE PERMISSÕES AOS PERFIS - TEAM CRUZ
-- Data: 18 de Outubro de 2025
-- Descrição: Vincula permissões específicas a cada perfil do sistema
-- ============================================================================

-- PRÉ-REQUISITO:
-- 1. Execute primeiro: insert-perfis-completos.sql
-- 2. Execute a migration de permissões: 1756928100000-SeedPerfisPermissoes.ts

-- ============================================================================
-- FUNÇÃO AUXILIAR PARA VINCULAR PERMISSÕES
-- ============================================================================

CREATE OR REPLACE FUNCTION vincular_permissao_perfil(
  p_perfil_nome VARCHAR,
  p_permissao_codigo VARCHAR
) RETURNS VOID AS $$
BEGIN
  INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
  SELECT
    (SELECT id FROM teamcruz.perfis WHERE nome = p_perfil_nome),
    (SELECT id FROM teamcruz.permissoes WHERE codigo = p_permissao_codigo)
  WHERE EXISTS (SELECT 1 FROM teamcruz.perfis WHERE nome = p_perfil_nome)
    AND EXISTS (SELECT 1 FROM teamcruz.permissoes WHERE codigo = p_permissao_codigo)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. PERFIL MASTER - TODAS AS PERMISSÕES
-- ============================================================================

-- Master tem acesso total a tudo
INSERT INTO teamcruz.perfil_permissoes (perfil_id, permissao_id)
SELECT
  (SELECT id FROM teamcruz.perfis WHERE nome = 'master'),
  p.id
FROM teamcruz.permissoes p
WHERE p.ativo = true
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. PERFIL FRANQUEADO
-- ============================================================================

-- Franquias (apenas READ - visualiza suas franquias)
PERFORM vincular_permissao_perfil('franqueado', 'FRANQUIAS_READ');

-- Unidades (READ, WRITE, DELETE - gerencia suas unidades)
PERFORM vincular_permissao_perfil('franqueado', 'UNIDADES_READ');
PERFORM vincular_permissao_perfil('franqueado', 'UNIDADES_WRITE');
PERFORM vincular_permissao_perfil('franqueado', 'UNIDADES_DELETE');

-- Alunos (READ, WRITE - gerencia alunos das suas unidades)
PERFORM vincular_permissao_perfil('franqueado', 'ALUNOS_READ');
PERFORM vincular_permissao_perfil('franqueado', 'ALUNOS_WRITE');

-- Professores (READ, WRITE - gerencia professores)
PERFORM vincular_permissao_perfil('franqueado', 'PROFESSORES_READ');
PERFORM vincular_permissao_perfil('franqueado', 'PROFESSORES_WRITE');

-- Financeiro (READ, WRITE - controle financeiro)
PERFORM vincular_permissao_perfil('franqueado', 'FINANCEIRO_READ');
PERFORM vincular_permissao_perfil('franqueado', 'FINANCEIRO_WRITE');

-- Relatórios (READ)
PERFORM vincular_permissao_perfil('franqueado', 'RELATORIOS_READ');

-- ============================================================================
-- 3. PERFIL GERENTE DE UNIDADE
-- ============================================================================

-- Unidades (READ, WRITE - apenas dados operacionais)
PERFORM vincular_permissao_perfil('gerente_unidade', 'UNIDADES_READ');
PERFORM vincular_permissao_perfil('gerente_unidade', 'UNIDADES_WRITE');

-- Alunos (READ, WRITE)
PERFORM vincular_permissao_perfil('gerente_unidade', 'ALUNOS_READ');
PERFORM vincular_permissao_perfil('gerente_unidade', 'ALUNOS_WRITE');

-- Professores (apenas READ)
PERFORM vincular_permissao_perfil('gerente_unidade', 'PROFESSORES_READ');

-- Financeiro (apenas READ)
PERFORM vincular_permissao_perfil('gerente_unidade', 'FINANCEIRO_READ');

-- Relatórios (READ)
PERFORM vincular_permissao_perfil('gerente_unidade', 'RELATORIOS_READ');

-- ============================================================================
-- 4. PERFIL PROFESSOR/INSTRUTOR
-- ============================================================================

-- Alunos (READ, WRITE - gerencia seus alunos)
PERFORM vincular_permissao_perfil('professor', 'ALUNOS_READ');
PERFORM vincular_permissao_perfil('professor', 'ALUNOS_WRITE');

PERFORM vincular_permissao_perfil('instrutor', 'ALUNOS_READ');
PERFORM vincular_permissao_perfil('instrutor', 'ALUNOS_WRITE');

-- Unidades (apenas READ)
PERFORM vincular_permissao_perfil('professor', 'UNIDADES_READ');
PERFORM vincular_permissao_perfil('instrutor', 'UNIDADES_READ');

-- ============================================================================
-- 5. PERFIL ALUNO
-- ============================================================================

-- Alunos (apenas READ - seus próprios dados)
PERFORM vincular_permissao_perfil('aluno', 'ALUNOS_READ');

-- ============================================================================
-- 6. PERFIL RECEPCIONISTA
-- ============================================================================

-- Alunos (READ, WRITE - cadastrar e atualizar)
PERFORM vincular_permissao_perfil('recepcionista', 'ALUNOS_READ');
PERFORM vincular_permissao_perfil('recepcionista', 'ALUNOS_WRITE');

-- Unidades (apenas READ)
PERFORM vincular_permissao_perfil('recepcionista', 'UNIDADES_READ');

-- Professores (apenas READ)
PERFORM vincular_permissao_perfil('recepcionista', 'PROFESSORES_READ');

-- ============================================================================
-- 7. PERFIL FINANCEIRO
-- ============================================================================

-- Financeiro (READ, WRITE, ADMIN)
PERFORM vincular_permissao_perfil('financeiro', 'FINANCEIRO_READ');
PERFORM vincular_permissao_perfil('financeiro', 'FINANCEIRO_WRITE');
PERFORM vincular_permissao_perfil('financeiro', 'FINANCEIRO_ADMIN');

-- Alunos (apenas READ - para consultar dados)
PERFORM vincular_permissao_perfil('financeiro', 'ALUNOS_READ');

-- Unidades (apenas READ)
PERFORM vincular_permissao_perfil('financeiro', 'UNIDADES_READ');

-- Relatórios (READ)
PERFORM vincular_permissao_perfil('financeiro', 'RELATORIOS_READ');

-- ============================================================================
-- 8. PERFIL COORDENADOR TÉCNICO
-- ============================================================================

-- Alunos (READ, WRITE - avaliar graduações)
PERFORM vincular_permissao_perfil('coordenador_tecnico', 'ALUNOS_READ');
PERFORM vincular_permissao_perfil('coordenador_tecnico', 'ALUNOS_WRITE');

-- Professores (READ, WRITE - avaliar professores)
PERFORM vincular_permissao_perfil('coordenador_tecnico', 'PROFESSORES_READ');
PERFORM vincular_permissao_perfil('coordenador_tecnico', 'PROFESSORES_WRITE');

-- Unidades (apenas READ)
PERFORM vincular_permissao_perfil('coordenador_tecnico', 'UNIDADES_READ');

-- Relatórios (READ)
PERFORM vincular_permissao_perfil('coordenador_tecnico', 'RELATORIOS_READ');

-- ============================================================================
-- 9. PERFIL SUPERVISOR REGIONAL
-- ============================================================================

-- Unidades (READ, WRITE - supervisiona múltiplas)
PERFORM vincular_permissao_perfil('supervisor_regional', 'UNIDADES_READ');
PERFORM vincular_permissao_perfil('supervisor_regional', 'UNIDADES_WRITE');

-- Alunos (READ, WRITE)
PERFORM vincular_permissao_perfil('supervisor_regional', 'ALUNOS_READ');
PERFORM vincular_permissao_perfil('supervisor_regional', 'ALUNOS_WRITE');

-- Professores (READ, WRITE)
PERFORM vincular_permissao_perfil('supervisor_regional', 'PROFESSORES_READ');
PERFORM vincular_permissao_perfil('supervisor_regional', 'PROFESSORES_WRITE');

-- Financeiro (READ)
PERFORM vincular_permissao_perfil('supervisor_regional', 'FINANCEIRO_READ');

-- Relatórios (READ)
PERFORM vincular_permissao_perfil('supervisor_regional', 'RELATORIOS_READ');

-- ============================================================================
-- 10. PERFIL RESPONSÁVEL (Responsável Legal)
-- ============================================================================

-- Alunos (apenas READ - dados dos dependentes)
PERFORM vincular_permissao_perfil('responsavel', 'ALUNOS_READ');

-- Financeiro (apenas READ - ver mensalidades)
PERFORM vincular_permissao_perfil('responsavel', 'FINANCEIRO_READ');

-- ============================================================================
-- 11. PERFIL VISUALIZADOR
-- ============================================================================

-- Todas as permissões de READ (apenas leitura)
PERFORM vincular_permissao_perfil('visualizador', 'FRANQUIAS_READ');
PERFORM vincular_permissao_perfil('visualizador', 'UNIDADES_READ');
PERFORM vincular_permissao_perfil('visualizador', 'ALUNOS_READ');
PERFORM vincular_permissao_perfil('visualizador', 'PROFESSORES_READ');
PERFORM vincular_permissao_perfil('visualizador', 'FINANCEIRO_READ');
PERFORM vincular_permissao_perfil('visualizador', 'RELATORIOS_READ');

-- ============================================================================
-- VERIFICAÇÃO DAS PERMISSÕES VINCULADAS
-- ============================================================================

-- Listar permissões por perfil
SELECT
  p.nome AS perfil,
  COUNT(pp.permissao_id) AS total_permissoes,
  STRING_AGG(perm.codigo, ', ' ORDER BY perm.codigo) AS permissoes
FROM teamcruz.perfis p
LEFT JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
LEFT JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
GROUP BY p.id, p.nome
ORDER BY
  CASE p.nome
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

-- Detalhamento por perfil e módulo
SELECT
  p.nome AS perfil,
  perm.modulo,
  np.codigo AS nivel,
  COUNT(*) AS qtd_permissoes
FROM teamcruz.perfis p
INNER JOIN teamcruz.perfil_permissoes pp ON p.id = pp.perfil_id
INNER JOIN teamcruz.permissoes perm ON pp.permissao_id = perm.id
INNER JOIN teamcruz.niveis_permissao np ON perm.nivel_id = np.id
GROUP BY p.nome, perm.modulo, np.codigo, np.ordem
ORDER BY
  p.nome,
  perm.modulo,
  np.ordem;

-- ============================================================================
-- RESUMO DA CONFIGURAÇÃO
-- ============================================================================

/*
┌─────────────────────────────────────────────────────────────────────────┐
│                  RESUMO DE PERMISSÕES POR PERFIL                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ 🔑 MASTER:                                                                │
│    ✅ TODAS as permissões (32+ permissões)                               │
│                                                                           │
│ 🏢 FRANQUEADO:                                                            │
│    ✅ Franquias: READ                                                     │
│    ✅ Unidades: READ, WRITE, DELETE                                       │
│    ✅ Alunos: READ, WRITE                                                 │
│    ✅ Professores: READ, WRITE                                            │
│    ✅ Financeiro: READ, WRITE                                             │
│    ✅ Relatórios: READ                                                    │
│                                                                           │
│ 🏪 GERENTE UNIDADE:                                                       │
│    ✅ Unidades: READ, WRITE                                               │
│    ✅ Alunos: READ, WRITE                                                 │
│    ✅ Professores: READ                                                   │
│    ✅ Financeiro: READ                                                    │
│    ✅ Relatórios: READ                                                    │
│                                                                           │
│ 🥋 PROFESSOR/INSTRUTOR:                                                   │
│    ✅ Alunos: READ, WRITE                                                 │
│    ✅ Unidades: READ                                                      │
│                                                                           │
│ 🎓 ALUNO:                                                                 │
│    ✅ Alunos: READ (apenas próprios dados)                                │
│                                                                           │
│ 📞 RECEPCIONISTA:                                                         │
│    ✅ Alunos: READ, WRITE                                                 │
│    ✅ Unidades: READ                                                      │
│    ✅ Professores: READ                                                   │
│                                                                           │
│ 💰 FINANCEIRO:                                                            │
│    ✅ Financeiro: READ, WRITE, ADMIN                                      │
│    ✅ Alunos: READ                                                        │
│    ✅ Unidades: READ                                                      │
│    ✅ Relatórios: READ                                                    │
│                                                                           │
│ 🎯 COORDENADOR TÉCNICO:                                                   │
│    ✅ Alunos: READ, WRITE                                                 │
│    ✅ Professores: READ, WRITE                                            │
│    ✅ Unidades: READ                                                      │
│    ✅ Relatórios: READ                                                    │
│                                                                           │
│ 🌍 SUPERVISOR REGIONAL:                                                   │
│    ✅ Unidades: READ, WRITE                                               │
│    ✅ Alunos: READ, WRITE                                                 │
│    ✅ Professores: READ, WRITE                                            │
│    ✅ Financeiro: READ                                                    │
│    ✅ Relatórios: READ                                                    │
│                                                                           │
│ 👨‍👧‍👦 RESPONSÁVEL:                                                           │
│    ✅ Alunos: READ (dados dos dependentes)                                │
│    ✅ Financeiro: READ (mensalidades)                                     │
│                                                                           │
│ 👁️ VISUALIZADOR:                                                          │
│    ✅ TODAS as permissões de READ (apenas leitura)                        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
*/

-- Remover função auxiliar
DROP FUNCTION IF EXISTS vincular_permissao_perfil(VARCHAR, VARCHAR);
