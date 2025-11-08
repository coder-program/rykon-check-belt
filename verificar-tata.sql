-- Verificar qual unidade está vinculada ao gerente TataSilva (CPF: 21187928089)
SELECT
    u.id,
    u.nome,
    u.responsavel_cpf,
    u.responsavel_papel,
    u.franqueado_id
FROM teamcruz.unidades u
WHERE u.responsavel_cpf = '21187928089';

-- Ver todas as unidades do franqueado para comparar
SELECT
    u.id,
    u.nome,
    u.responsavel_cpf,
    u.responsavel_papel,
    f.nome_fantasia as franqueado
FROM teamcruz.unidades u
LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
WHERE u.franqueado_id IN (
    SELECT franqueado_id FROM teamcruz.franqueados WHERE cpf IN (
        SELECT cpf FROM teamcruz.usuarios WHERE email = 'francisconeto5030@gmail.com'
    )
)
ORDER BY u.nome;

-- Ver o usuário gerente criado
SELECT
    id,
    username,
    email,
    cpf,
    cadastro_completo,
    created_at
FROM teamcruz.usuarios
WHERE cpf = '21187928089';
