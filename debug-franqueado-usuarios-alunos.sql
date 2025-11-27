-- Debug: Verificar discrepância entre Gerenciar Usuários e Lista de Alunos
-- Autor: Debug Session
-- Data: 2025-11-24

-- 1. Verificar o franqueado Deleon Leite
SELECT
    u.id as usuario_id,
    u.nome as usuario_nome,
    u.email,
    f.id as franqueado_id
FROM teamcruz.usuarios u
INNER JOIN teamcruz.franqueados f ON f.usuario_id = u.id
WHERE LOWER(u.nome) LIKE '%deleon%'
   OR LOWER(u.email) LIKE '%deleon%';

-- 2. Verificar todas as unidades do franqueado
SELECT
    u.id as unidade_id,
    u.nome as unidade_nome,
    u.status,
    u.franqueado_id,
    f.nome as franqueado_nome
FROM teamcruz.unidades u
LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
WHERE u.franqueado_id = (
    SELECT f.id
    FROM teamcruz.franqueados f
    INNER JOIN teamcruz.usuarios u ON u.id = f.usuario_id
    WHERE LOWER(u.email) LIKE '%deleon%'
    LIMIT 1
);

-- 3. Listar TODOS os alunos cadastrados (independente de perfil ALUNO)
SELECT
    a.id as aluno_id,
    a.nome_completo,
    a.cpf,
    a.email,
    a.telefone,
    a.status as aluno_status,
    a.usuario_id,
    a.unidade_id,
    u.nome as unidade_nome,
    u.franqueado_id,
    a.data_matricula,
    a.faixa_atual,
    a.graus,
    CASE
        WHEN usu.id IS NOT NULL THEN 'TEM USUARIO'
        ELSE 'SEM USUARIO'
    END as tem_usuario,
    CASE
        WHEN up.perfil_id IS NOT NULL THEN 'TEM PERFIL ALUNO'
        ELSE 'SEM PERFIL ALUNO'
    END as tem_perfil_aluno
FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades u ON u.id = a.unidade_id
LEFT JOIN teamcruz.usuarios usu ON usu.id = a.usuario_id
LEFT JOIN teamcruz.usuario_perfis up ON up.usuario_id = a.usuario_id
    AND up.perfil_id = (SELECT id FROM teamcruz.perfis WHERE UPPER(nome) = 'ALUNO')
WHERE u.franqueado_id = (
    SELECT f.id
    FROM teamcruz.franqueados f
    INNER JOIN teamcruz.usuarios u ON u.id = f.usuario_id
    WHERE LOWER(u.email) LIKE '%deleon%'
    LIMIT 1
)
ORDER BY a.data_matricula DESC;

-- 4. Listar APENAS usuários com perfil ALUNO
SELECT
    u.id as usuario_id,
    u.nome as usuario_nome,
    u.email,
    u.cpf,
    u.telefone,
    u.ativo as usuario_ativo,
    a.id as aluno_id,
    a.nome_completo as aluno_nome_completo,
    a.status as aluno_status,
    un.nome as unidade_nome,
    a.data_matricula,
    a.faixa_atual,
    a.graus
FROM teamcruz.usuarios u
INNER JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
INNER JOIN teamcruz.perfis p ON p.id = up.perfil_id
LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
LEFT JOIN teamcruz.unidades un ON un.id = a.unidade_id
WHERE UPPER(p.nome) = 'ALUNO'
  AND un.franqueado_id = (
    SELECT f.id
    FROM teamcruz.franqueados f
    INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id
    WHERE LOWER(usu.email) LIKE '%deleon%'
    LIMIT 1
  )
ORDER BY u.created_at DESC;

-- 5. Comparação: Alunos SEM usuário x Alunos COM usuário
SELECT
    'ALUNOS SEM USUARIO' as tipo,
    COUNT(*) as total
FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades u ON u.id = a.unidade_id
WHERE a.usuario_id IS NULL
  AND u.franqueado_id = (
    SELECT f.id
    FROM teamcruz.franqueados f
    INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id
    WHERE LOWER(usu.email) LIKE '%deleon%'
    LIMIT 1
  )

UNION ALL

SELECT
    'ALUNOS COM USUARIO' as tipo,
    COUNT(*) as total
FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades u ON u.id = a.unidade_id
WHERE a.usuario_id IS NOT NULL
  AND u.franqueado_id = (
    SELECT f.id
    FROM teamcruz.franqueados f
    INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id
    WHERE LOWER(usu.email) LIKE '%deleon%'
    LIMIT 1
  );

-- 6. Verificar se existem alunos na tabela alunos sem registro em usuarios
SELECT
    a.id as aluno_id,
    a.nome_completo,
    a.email as aluno_email,
    a.cpf as aluno_cpf,
    a.telefone as aluno_telefone,
    a.usuario_id,
    u.nome as unidade_nome,
    a.data_matricula
FROM teamcruz.alunos a
INNER JOIN teamcruz.unidades u ON u.id = a.unidade_id
WHERE a.usuario_id IS NULL
  AND u.franqueado_id = (
    SELECT f.id
    FROM teamcruz.franqueados f
    INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id
    WHERE LOWER(usu.email) LIKE '%deleon%'
    LIMIT 1
  )
ORDER BY a.data_matricula DESC;

-- 7. Ver SQL exato que retorna usuários para franqueado (mesma query do backend)
SELECT DISTINCT u.id,
       u.nome,
       u.email,
       CASE
         WHEN f.id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1) THEN 'proprio_franqueado'
         WHEN un_aluno.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1) THEN 'aluno_da_unidade'
         WHEN un_prof.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1) THEN 'professor_da_unidade'
         WHEN un_prof_pendente.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1) THEN 'professor_pendente_da_unidade'
         WHEN un_gerente.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1) THEN 'gerente_da_unidade'
         WHEN un_recep.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1) THEN 'recepcionista_da_unidade'
         WHEN perfil.nome = 'RESPONSAVEL' AND resp.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1)) THEN 'responsavel_da_unidade'
         WHEN perfil.nome = 'RESPONSAVEL' AND un_resp_aluno.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1) THEN 'responsavel_com_aluno_na_unidade'
         ELSE 'outro'
       END as motivo_inclusao
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
LEFT JOIN teamcruz.professores p ON p.usuario_id = u.id
LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = p.id
LEFT JOIN teamcruz.professor_unidades pu_pendente ON pu_pendente.usuario_id = u.id AND pu_pendente.professor_id IS NULL
LEFT JOIN teamcruz.unidades un_aluno ON un_aluno.id = a.unidade_id
LEFT JOIN teamcruz.unidades un_prof ON un_prof.id = pu.unidade_id
LEFT JOIN teamcruz.unidades un_prof_pendente ON un_prof_pendente.id = pu_pendente.unidade_id
LEFT JOIN teamcruz.gerente_unidades gu ON gu.usuario_id = u.id AND gu.ativo = TRUE
LEFT JOIN teamcruz.unidades un_gerente ON un_gerente.id = gu.unidade_id
LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = TRUE
LEFT JOIN teamcruz.unidades un_recep ON un_recep.id = ru.unidade_id
LEFT JOIN teamcruz.franqueados f ON f.usuario_id = u.id
LEFT JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
LEFT JOIN teamcruz.perfis perfil ON perfil.id = up.perfil_id
LEFT JOIN teamcruz.responsaveis resp ON resp.usuario_id = u.id
LEFT JOIN teamcruz.alunos aluno_resp ON aluno_resp.responsavel_id = resp.id
LEFT JOIN teamcruz.unidades un_resp_aluno ON un_resp_aluno.id = aluno_resp.unidade_id
WHERE (
  (un_aluno.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1)
   OR un_prof.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1)
   OR un_prof_pendente.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1)
   OR un_gerente.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1)
   OR un_recep.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1))
  OR f.id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1)
  OR (UPPER(perfil.nome) = 'RESPONSAVEL' AND resp.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1)))
  OR (UPPER(perfil.nome) = 'RESPONSAVEL' AND un_resp_aluno.franqueado_id = (SELECT f.id FROM teamcruz.franqueados f INNER JOIN teamcruz.usuarios usu ON usu.id = f.usuario_id WHERE LOWER(usu.email) LIKE '%deleon%' LIMIT 1))
)
ORDER BY motivo_inclusao, u.nome;
