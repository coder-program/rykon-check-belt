-- ============================================
-- MIGRATIONS CONSOLIDADAS - TeamCruz Backend
-- Execute este script em ordem no PostgreSQL
-- ============================================

-- ============================================
-- 1. AddPresencaMetodoDetalhes (1735585200000)
-- ============================================
ALTER TABLE "teamcruz"."presencas"
ADD COLUMN IF NOT EXISTS "metodo" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "detalhes" JSONB;

INSERT INTO teamcruz.migrations (timestamp, name) 
VALUES (1735585200000, 'AddPresencaMetodoDetalhes1735585200000')
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. ProfessorUnidades (1735905000000)
-- ============================================
CREATE TABLE IF NOT EXISTS teamcruz.professor_unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professor_id UUID NOT NULL REFERENCES teamcruz.pessoas(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,
  is_principal BOOLEAN DEFAULT FALSE,
  data_vinculo DATE DEFAULT CURRENT_DATE,
  data_desvinculo DATE,
  ativo BOOLEAN DEFAULT TRUE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(professor_id, unidade_id)
);

CREATE INDEX IF NOT EXISTS idx_professor_unidades_professor 
ON teamcruz.professor_unidades(professor_id);

CREATE INDEX IF NOT EXISTS idx_professor_unidades_unidade 
ON teamcruz.professor_unidades(unidade_id);

CREATE INDEX IF NOT EXISTS idx_professor_unidades_ativo 
ON teamcruz.professor_unidades(ativo);

DO $$ BEGIN
  CREATE TRIGGER update_professor_unidades_updated_at
  BEFORE UPDATE ON teamcruz.professor_unidades
  FOR EACH ROW
  EXECUTE FUNCTION teamcruz.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO teamcruz.migrations (timestamp, name) 
VALUES (1735905000000, 'ProfessorUnidades1735905000000')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. UpdateAlunosTable (1738466409000)
-- ============================================

-- Criar enums
DO $$ BEGIN
  CREATE TYPE teamcruz.genero_enum AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE teamcruz.status_aluno_enum AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO', 'CANCELADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE teamcruz.faixa_enum AS ENUM (
    'BRANCA', 'CINZA_BRANCA', 'CINZA', 'CINZA_PRETA',
    'AMARELA_BRANCA', 'AMARELA', 'AMARELA_PRETA',
    'LARANJA_BRANCA', 'LARANJA', 'LARANJA_PRETA',
    'VERDE_BRANCA', 'VERDE', 'VERDE_PRETA',
    'AZUL', 'ROXA', 'MARROM', 'PRETA', 'CORAL', 'VERMELHA'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Adicionar novas colunas
ALTER TABLE teamcruz.alunos 
ADD COLUMN IF NOT EXISTS nome_completo varchar(255),
ADD COLUMN IF NOT EXISTS genero teamcruz.genero_enum,
ADD COLUMN IF NOT EXISTS nome_contato_emergencia varchar(255),
ADD COLUMN IF NOT EXISTS endereco_id uuid,
ADD COLUMN IF NOT EXISTS status teamcruz.status_aluno_enum DEFAULT 'ATIVO',
ADD COLUMN IF NOT EXISTS faixa_atual teamcruz.faixa_enum DEFAULT 'BRANCA',
ADD COLUMN IF NOT EXISTS graus int4 DEFAULT 0,
ADD COLUMN IF NOT EXISTS observacoes_medicas text,
ADD COLUMN IF NOT EXISTS alergias text,
ADD COLUMN IF NOT EXISTS medicamentos_uso_continuo text,
ADD COLUMN IF NOT EXISTS dia_vencimento int4,
ADD COLUMN IF NOT EXISTS valor_mensalidade decimal(10,2),
ADD COLUMN IF NOT EXISTS desconto_percentual decimal(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Migrar dados existentes
UPDATE teamcruz.alunos 
SET 
  nome_completo = COALESCE(nome_completo, nome),
  genero = COALESCE(genero, 
    CASE 
      WHEN LOWER(nome) LIKE '%a' OR LOWER(nome) LIKE '%ana%' OR LOWER(nome) LIKE '%maria%' THEN 'FEMININO'::teamcruz.genero_enum
      ELSE 'MASCULINO'::teamcruz.genero_enum
    END
  ),
  status = COALESCE(status,
    CASE 
      WHEN status_type = 'ATIVO' THEN 'ATIVO'::teamcruz.status_aluno_enum
      WHEN status_type = 'INATIVO' THEN 'INATIVO'::teamcruz.status_aluno_enum
      WHEN status_type = 'SUSPENSO' THEN 'SUSPENSO'::teamcruz.status_aluno_enum
      ELSE 'ATIVO'::teamcruz.status_aluno_enum
    END
  ),
  graus = COALESCE(graus, graus_atual, 0),
  observacoes_medicas = COALESCE(observacoes_medicas, restricoes_medicas)
WHERE nome_completo IS NULL OR genero IS NULL OR status IS NULL;

-- Mapear faixas (somente onde ainda não está mapeado)
UPDATE teamcruz.alunos a
SET faixa_atual = CASE f.codigo
  WHEN 'BRANCA' THEN 'BRANCA'::teamcruz.faixa_enum
  WHEN 'CINZA_BRANCA' THEN 'CINZA_BRANCA'::teamcruz.faixa_enum
  WHEN 'CINZA' THEN 'CINZA'::teamcruz.faixa_enum
  WHEN 'CINZA_PRETA' THEN 'CINZA_PRETA'::teamcruz.faixa_enum
  WHEN 'AMARELA_BRANCA' THEN 'AMARELA_BRANCA'::teamcruz.faixa_enum
  WHEN 'AMARELA' THEN 'AMARELA'::teamcruz.faixa_enum
  WHEN 'AMARELA_PRETA' THEN 'AMARELA_PRETA'::teamcruz.faixa_enum
  WHEN 'LARANJA_BRANCA' THEN 'LARANJA_BRANCA'::teamcruz.faixa_enum
  WHEN 'LARANJA' THEN 'LARANJA'::teamcruz.faixa_enum
  WHEN 'LARANJA_PRETA' THEN 'LARANJA_PRETA'::teamcruz.faixa_enum
  WHEN 'VERDE_BRANCA' THEN 'VERDE_BRANCA'::teamcruz.faixa_enum
  WHEN 'VERDE' THEN 'VERDE'::teamcruz.faixa_enum
  WHEN 'VERDE_PRETA' THEN 'VERDE_PRETA'::teamcruz.faixa_enum
  WHEN 'AZUL' THEN 'AZUL'::teamcruz.faixa_enum
  WHEN 'ROXA' THEN 'ROXA'::teamcruz.faixa_enum
  WHEN 'MARROM' THEN 'MARROM'::teamcruz.faixa_enum
  WHEN 'PRETA' THEN 'PRETA'::teamcruz.faixa_enum
  WHEN 'CORAL' THEN 'CORAL'::teamcruz.faixa_enum
  WHEN 'VERMELHA' THEN 'VERMELHA'::teamcruz.faixa_enum
  ELSE 'BRANCA'::teamcruz.faixa_enum
END
FROM teamcruz.faixas f
WHERE a.faixa_atual_id = f.id 
AND a.faixa_atual IS NULL;

-- Tornar nome_completo NOT NULL (apenas se todos os registros têm valor)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM teamcruz.alunos WHERE nome_completo IS NULL) THEN
    ALTER TABLE teamcruz.alunos ALTER COLUMN nome_completo SET NOT NULL;
  END IF;
END $$;

-- Adicionar índices
CREATE INDEX IF NOT EXISTS idx_alunos_nome_completo ON teamcruz.alunos(nome_completo);
CREATE INDEX IF NOT EXISTS idx_alunos_cpf ON teamcruz.alunos(cpf);
CREATE INDEX IF NOT EXISTS idx_alunos_status_new ON teamcruz.alunos(status);
CREATE INDEX IF NOT EXISTS idx_alunos_faixa_atual ON teamcruz.alunos(faixa_atual);

-- Remover constraint antiga
ALTER TABLE teamcruz.alunos DROP CONSTRAINT IF EXISTS alunos_faixa_atual_id_fkey;

-- Tornar faixa_atual_id nullable
ALTER TABLE teamcruz.alunos ALTER COLUMN faixa_atual_id DROP NOT NULL;

-- Adicionar unique constraint para CPF
DO $$ BEGIN
  ALTER TABLE teamcruz.alunos ADD CONSTRAINT alunos_cpf_unique UNIQUE (cpf);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO teamcruz.migrations (timestamp, name) 
VALUES (1738466409000, 'UpdateAlunosTable1738466409000')
ON CONFLICT DO NOTHING;

-- ============================================
-- FIM DAS MIGRATIONS
-- ============================================

-- Verificar migrations executadas
SELECT * FROM teamcruz.migrations ORDER BY timestamp DESC LIMIT 10;
