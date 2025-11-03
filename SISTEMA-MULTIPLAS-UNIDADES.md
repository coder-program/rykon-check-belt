# 🎓 SISTEMA DE MÚLTIPLAS UNIDADES PARA ALUNOS

## 📋 Script SQL para Executar no Banco

Execute este script no PostgreSQL para criar a tabela de relacionamento:

```sql
-- Criar tabela de relacionamento entre alunos e unidades (many-to-many)
CREATE TABLE IF NOT EXISTS teamcruz.aluno_unidades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aluno_id UUID NOT NULL,
    unidade_id UUID NOT NULL,
    data_matricula DATE DEFAULT CURRENT_DATE,
    is_principal BOOLEAN DEFAULT FALSE, -- Define se é a unidade principal do aluno
    ativo BOOLEAN DEFAULT TRUE,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_aluno_unidades_aluno
        FOREIGN KEY (aluno_id) REFERENCES teamcruz.alunos(id) ON DELETE CASCADE,
    CONSTRAINT fk_aluno_unidades_unidade
        FOREIGN KEY (unidade_id) REFERENCES teamcruz.unidades(id) ON DELETE CASCADE,

    -- Constraint único para evitar duplicatas
    CONSTRAINT uk_aluno_unidade UNIQUE (aluno_id, unidade_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aluno_unidades_aluno_id ON teamcruz.aluno_unidades(aluno_id);
CREATE INDEX IF NOT EXISTS idx_aluno_unidades_unidade_id ON teamcruz.aluno_unidades(unidade_id);
CREATE INDEX IF NOT EXISTS idx_aluno_unidades_principal ON teamcruz.aluno_unidades(aluno_id, is_principal) WHERE is_principal = true;

-- Comentários
COMMENT ON TABLE teamcruz.aluno_unidades IS 'Relacionamento many-to-many entre alunos e unidades';
COMMENT ON COLUMN teamcruz.aluno_unidades.is_principal IS 'Indica se esta é a unidade principal/primária do aluno';
COMMENT ON COLUMN teamcruz.aluno_unidades.data_matricula IS 'Data de matrícula do aluno nesta unidade específica';

-- Migrar dados existentes (se houver alunos com unidade_id preenchida)
INSERT INTO teamcruz.aluno_unidades (aluno_id, unidade_id, is_principal, data_matricula)
SELECT
    id as aluno_id,
    unidade_id,
    true as is_principal, -- A unidade atual se torna a principal
    COALESCE(data_matricula, CURRENT_DATE) as data_matricula
FROM teamcruz.alunos
WHERE unidade_id IS NOT NULL
ON CONFLICT (aluno_id, unidade_id) DO NOTHING;

-- Verificar se a migração funcionou
DO $$
DECLARE
    count_migrated INTEGER;
    count_original INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_original FROM teamcruz.alunos WHERE unidade_id IS NOT NULL;
    SELECT COUNT(*) INTO count_migrated FROM teamcruz.aluno_unidades;

    RAISE NOTICE 'Alunos com unidade_id: %', count_original;
    RAISE NOTICE 'Registros migrados para aluno_unidades: %', count_migrated;

    IF count_migrated >= count_original THEN
        RAISE NOTICE '✅ Migração concluída com sucesso!';
    ELSE
        RAISE WARNING '⚠️ Possível problema na migração. Verifique os dados.';
    END IF;
END $$;
```

## 🚀 Novos Endpoints da API

### 1. Listar Unidades de um Aluno

```
GET /api/alunos/{id}/unidades
```

### 2. Adicionar Aluno a uma Unidade

```
POST /api/alunos/{id}/unidades
Content-Type: application/json

{
  "unidade_id": "123e4567-e89b-12d3-a456-426614174000",
  "data_matricula": "2024-01-15",
  "is_principal": false,
  "observacoes": "Unidade secundária"
}
```

### 3. Definir Unidade Principal

```
PATCH /api/alunos/{id}/unidades/{unidadeId}/principal
```

### 4. Remover Aluno de uma Unidade

```
DELETE /api/alunos/{id}/unidades/{unidadeId}
```

### 5. Atualizar Todas as Unidades do Aluno

```
PUT /api/alunos/{id}/unidades
Content-Type: application/json

[
  {
    "unidade_id": "123e4567-e89b-12d3-a456-426614174000",
    "data_matricula": "2024-01-15",
    "is_principal": true,
    "observacoes": "Unidade principal"
  },
  {
    "unidade_id": "456e7890-e89b-12d3-a456-426614174111",
    "data_matricula": "2024-02-01",
    "is_principal": false,
    "observacoes": "Unidade para treinos especiais"
  }
]
```

## 📝 Criação de Aluno com Múltiplas Unidades

### Novo Formato (Recomendado)

```
POST /api/alunos
Content-Type: application/json

{
  "nome_completo": "João Silva",
  "cpf": "12345678901",
  "data_nascimento": "1995-05-15",
  "genero": "MASCULINO",
  "unidades": [
    {
      "unidade_id": "123e4567-e89b-12d3-a456-426614174000",
      "data_matricula": "2024-01-15",
      "is_principal": true,
      "observacoes": "Unidade principal"
    },
    {
      "unidade_id": "456e7890-e89b-12d3-a456-426614174111",
      "data_matricula": "2024-02-01",
      "is_principal": false,
      "observacoes": "Para treinos de competição"
    }
  ]
}
```

### Formato Antigo (Compatibilidade)

```
POST /api/alunos
Content-Type: application/json

{
  "nome_completo": "João Silva",
  "cpf": "12345678901",
  "data_nascimento": "1995-05-15",
  "genero": "MASCULINO",
  "unidade_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

## 🎯 Funcionalidades Implementadas

✅ **Tabela de Relacionamento**: `aluno_unidades` com campos completos
✅ **Migração Automática**: Dados existentes migrados automaticamente
✅ **Entidade TypeORM**: `AlunoUnidade` com relacionamentos
✅ **Service Dedicado**: `AlunoUnidadeService` com todos os métodos
✅ **Endpoints REST**: CRUD completo para gerenciar unidades
✅ **Documentação Swagger**: Todos os endpoints documentados
✅ **Compatibilidade**: Sistema antigo continua funcionando
✅ **Validações**: DTOs com validação completa
✅ **Relacionamentos**: Aluno pode ter N unidades, uma principal

## 🔄 Benefícios do Sistema

1. **Flexibilidade**: Aluno pode treinar em múltiplas unidades
2. **Rastreabilidade**: Data de matrícula específica por unidade
3. **Organização**: Uma unidade principal definida
4. **Observações**: Contexto específico para cada matrícula
5. **Performance**: Índices otimizados para consultas
6. **Segurança**: Constraints para evitar duplicatas
7. **Auditoria**: Soft delete e timestamps automáticos

## 🚀 Próximos Passos

1. Execute o script SQL no banco
2. Faça o commit e deploy do código
3. Teste no Swagger: http://localhost:4000/api/docs
4. Implemente no frontend conforme necessário

A documentação Swagger será atualizada automaticamente após o deploy! 🎉
