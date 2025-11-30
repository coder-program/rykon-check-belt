-- ============================================
-- DIAGNÓSTICO COMPLETO DO USUÁRIO TABLET
-- ============================================

-- 1. Verificar se o usuário tablet existe e seus perfis
SELECT
  u.id as usuario_id,
  u.nome,
  u.email,
  u.ativo,
  u.cadastro_completo,
  array_agg(p.nome) as perfis
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
LEFT JOIN teamcruz.perfis p ON p.id = up.perfil_id
WHERE u.email LIKE '%tablet%' OR u.nome ILIKE '%tablet%'
GROUP BY u.id, u.nome, u.email, u.ativo, u.cadastro_completo;

-- 2. Verificar vínculos do tablet com unidades
SELECT
  tu.id,
  tu.tablet_id,
  tu.unidade_id,
  tu.ativo,
  u.nome as tablet_nome,
  un.nome as unidade_nome,
  un.franqueado_id
FROM teamcruz.tablet_unidades tu
INNER JOIN teamcruz.usuarios u ON u.id = tu.tablet_id
INNER JOIN teamcruz.unidades un ON un.id = tu.unidade_id;

-- 3. Verificar o franqueado logado e suas unidades
SELECT
  f.id as franqueado_id,
  f.usuario_id,
  u.nome as franqueado_nome,
  u.email as franqueado_email,
  array_agg(un.nome) as unidades
FROM teamcruz.franqueados f
INNER JOIN teamcruz.usuarios u ON u.id = f.usuario_id
LEFT JOIN teamcruz.unidades un ON un.franqueado_id = f.id
GROUP BY f.id, f.usuario_id, u.nome, u.email;

-- 4. Query exata que deveria trazer o tablet (copie o resultado e me mande)
SELECT DISTINCT u.id,
       u.nome,
       u.email,
       un_tablet.franqueado_id as unidade_franqueado_id,
       'tablet_da_unidade' as motivo
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.tablet_unidades tu ON tu.tablet_id = u.id AND tu.ativo = TRUE
LEFT JOIN teamcruz.unidades un_tablet ON un_tablet.id = tu.unidade_id
LEFT JOIN teamcruz.usuario_perfis up ON up.usuario_id = u.id
LEFT JOIN teamcruz.perfis perfil ON perfil.id = up.perfil_id
WHERE perfil.nome = 'TABLET_CHECKIN'
  AND un_tablet.franqueado_id IS NOT NULL;

-- 5. Verificar TODOS os usuários do franqueado 6eb0edf4-8840-4ce3-9740-5f272b00d98d
-- (substitua pelo ID do seu usuário se necessário)
SELECT DISTINCT u.id,
       u.nome,
       u.email,
       CASE
         WHEN f.id = '8e63648d-b0b2-4889-b692-1418dc7b5119' THEN 'proprio_franqueado'
         WHEN un_aluno.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119' THEN 'aluno_da_unidade'
         WHEN un_prof.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119' THEN 'professor_da_unidade'
         WHEN un_gerente.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119' THEN 'gerente_da_unidade'
         WHEN un_recep.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119' THEN 'recepcionista_da_unidade'
         WHEN un_tablet.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119' THEN 'tablet_da_unidade'
         ELSE 'outro'
       END as motivo_inclusao
FROM teamcruz.usuarios u
LEFT JOIN teamcruz.alunos a ON a.usuario_id = u.id
LEFT JOIN teamcruz.professores p ON p.usuario_id = u.id
LEFT JOIN teamcruz.professor_unidades pu ON pu.professor_id = p.id
LEFT JOIN teamcruz.unidades un_aluno ON un_aluno.id = a.unidade_id
LEFT JOIN teamcruz.unidades un_prof ON un_prof.id = pu.unidade_id
LEFT JOIN teamcruz.gerente_unidades gu ON gu.usuario_id = u.id AND gu.ativo = TRUE
LEFT JOIN teamcruz.unidades un_gerente ON un_gerente.id = gu.unidade_id
LEFT JOIN teamcruz.recepcionista_unidades ru ON ru.usuario_id = u.id AND ru.ativo = TRUE
LEFT JOIN teamcruz.unidades un_recep ON un_recep.id = ru.unidade_id
LEFT JOIN teamcruz.tablet_unidades tu ON tu.tablet_id = u.id AND tu.ativo = TRUE
LEFT JOIN teamcruz.unidades un_tablet ON un_tablet.id = tu.unidade_id
LEFT JOIN teamcruz.franqueados f ON f.usuario_id = u.id
WHERE (
  un_aluno.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119'
  OR un_prof.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119'
  OR un_gerente.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119'
  OR un_recep.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119'
  OR un_tablet.franqueado_id = '8e63648d-b0b2-4889-b692-1418dc7b5119'
  OR f.id = '8e63648d-b0b2-4889-b692-1418dc7b5119'
);
