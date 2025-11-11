-- ==================================================================
-- ADICIONAR CAMPO FOTO NA TABELA USUARIOS
-- ==================================================================
-- Data: 2024
-- Objetivo: Permitir que alunos, professores, recepcionistas,
--           gerentes e franqueados tenham foto de perfil
-- ==================================================================

-- Adicionar coluna foto (armazena URL ou base64)
ALTER TABLE teamcruz.usuarios
ADD COLUMN IF NOT EXISTS foto TEXT;

-- Adicionar comentário
COMMENT ON COLUMN teamcruz.usuarios.foto IS 'URL da foto do usuário ou string base64 da imagem';

-- Verificar resultado
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'teamcruz'
  AND table_name = 'usuarios'
  AND column_name = 'foto';

-- ==================================================================
-- EXEMPLOS DE USO
-- ==================================================================

-- Exemplo 1: Atualizar foto com URL
-- UPDATE teamcruz.usuarios
-- SET foto = 'https://exemplo.com/fotos/usuario123.jpg'
-- WHERE id = 'uuid-do-usuario';

-- Exemplo 2: Atualizar foto com base64
-- UPDATE teamcruz.usuarios
-- SET foto = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'
-- WHERE id = 'uuid-do-usuario';

-- Exemplo 3: Remover foto
-- UPDATE teamcruz.usuarios
-- SET foto = NULL
-- WHERE id = 'uuid-do-usuario';

-- ==================================================================
-- NOTAS
-- ==================================================================
-- 1. Campo aceita tanto URL quanto base64
-- 2. Frontend deve validar formato (jpg, png, webp)
-- 3. Frontend deve validar tamanho máximo (ex: 2MB)
-- 4. Considerar compressão de imagem antes do upload
-- 5. Para produção, considerar usar storage externo (S3, Cloudinary)
