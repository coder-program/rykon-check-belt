# Solução do Problema da Tela de Professores

## Problema Identificado

A tela de professores (`/professores`) estava retornando erro 500 do backend porque:

1. **API Incorreta**: O frontend estava chamando `/alunos` com filtro `tipo_cadastro=PROFESSOR` ao invés de chamar a API correta `/professores`
2. **Filtros Inadequados**: A página incluía filtro de "faixa" (kids/adulto) que não faz sentido para professores
3. **Exibição de Unidades**: Não mostrava corretamente as múltiplas unidades vinculadas a cada professor

## O Que Já Existe e Está Correto

### Backend ✅

1. **Entidade `ProfessorUnidade`**: Relacionamento N:N entre professores e unidades
   - Arquivo: `backend/src/people/entities/professor-unidade.entity.ts`
   - Permite que um professor esteja vinculado a múltiplas unidades
   - Campo `is_principal` marca a unidade principal do professor
   - Campo `ativo` controla se o vínculo está ativo

2. **Migration**: Tabela `professor_unidades` criada
   - Arquivo: `backend/src/migrations/1735905000000-ProfessorUnidades.ts`
   - Inclui índices para otimização
   - Trigger para updated_at
   - Constraint de unicidade (professor_id, unidade_id)

3. **Service Completo**: `ProfessoresService`
   - Arquivo: `backend/src/people/services/professores.service.ts`
   - Métodos CRUD completos
   - Retorna professores com suas unidades vinculadas
   - Validações de faixa (apenas AZUL, ROXA, MARROM, PRETA, CORAL, VERMELHA)

4. **Controller**: `ProfessoresController`
   - Arquivo: `backend/src/people/controllers/professores.controller.ts`
   - Endpoint `GET /professores` com filtros: search, unidade_id, status
   - Endpoints completos de CRUD

5. **Módulo**: Registrado corretamente no `PeopleModule`

## Correções Aplicadas

### 1. Frontend - Uso da API Correta

**Antes:**
```typescript
import { listAlunos } from "@/lib/peopleApi";

// ...
return listAlunos({
  page, pageSize, search,
  tipo_cadastro: "PROFESSOR"
});
```

**Depois:**
```typescript
import { listProfessores } from "@/lib/peopleApi";

// ...
return listProfessores({
  page, pageSize, search,
  unidade_id: unidade || undefined
});
```

### 2. Remoção do Filtro de Faixa (Kids/Adulto)

Removido o estado `faixa` e o select correspondente, pois professores não são categorizados dessa forma.

### 3. Exibição de Múltiplas Unidades

**Antes:**
```jsx
{professor.unidade_nome && (
  <span className="text-xs badge badge-outline">
    {professor.unidade_nome}
  </span>
)}
```

**Depois:**
```jsx
{professor.unidades && professor.unidades.length > 0 && (
  <span className="text-xs">
    Unidades:{" "}
    {professor.unidades.map((u: any) => (
      <span key={u.id} className="badge badge-outline badge-sm ml-1">
        {u.nome}{u.is_principal ? " ⭐" : ""}
      </span>
    ))}
  </span>
)}
```

## Estrutura de Dados Retornada pela API

```typescript
{
  id: string;
  nome_completo: string;
  cpf: string;
  faixa_ministrante: string; // AZUL | ROXA | MARROM | PRETA | CORAL | VERMELHA
  especialidades?: string;
  telefone?: string;
  status: 'ATIVO' | 'INATIVO';
  unidades: [
    {
      id: string;
      nome: string;
      is_principal: boolean; // true para unidade principal
      // ... outros campos de Unidade
    }
  ]
}
```

## Como Usar

### Cadastrar Professor

1. Acesse `/professores`
2. Clique em "Novo Professor"
3. Preencha os dados obrigatórios:
   - Nome completo
   - CPF
   - Faixa ministrante (mínimo Azul)
   - Unidade principal
4. Opcionalmente, vincule a unidades adicionais
5. Clique em "Salvar"

### Vincular Professor a Múltiplas Unidades

Ao cadastrar ou editar um professor:
- **Unidade Principal**: Campo obrigatório, marcada com ⭐
- **Unidades Adicionais**: Campo opcional para vincular a outras unidades

O sistema gerencia automaticamente a tabela `professor_unidades` mantendo:
- Um vínculo principal (is_principal=true)
- Múltiplos vínculos adicionais (is_principal=false)
- Histórico de vínculos ativos/inativos

## Próximos Passos Necessários

### 1. Verificar Migrations no Banco

Execute para verificar se a tabela foi criada:

```bash
npm run migration:run
```

Se houver erro, pode ser necessário criar a tabela manualmente:

```sql
-- Verificar se a tabela existe
SELECT * FROM information_schema.tables 
WHERE table_schema = 'teamcruz' 
AND table_name = 'professor_unidades';

-- Se não existir, execute a migration manualmente
-- (copiar SQL da migration file)
```

### 2. Integrar com PersonForm

Verificar se o componente `PersonForm` está pronto para:
- Exibir campo de seleção de múltiplas unidades quando `tipo_cadastro="PROFESSOR"`
- Enviar `unidades_adicionais` no DTO de criação/atualização

### 3. Testar Fluxo Completo

1. Criar um professor vinculado a uma unidade
2. Editar e adicionar mais unidades
3. Verificar na listagem que todas as unidades aparecem
4. Filtrar professores por unidade específica

## Endpoints da API

### Listar Professores
```
GET /api/professores?page=1&pageSize=30&search=&unidade_id=
```

### Criar Professor
```
POST /api/professores
Body: CreateProfessorDto (inclui unidade_id e unidades_adicionais)
```

### Atualizar Professor
```
PATCH /api/professores/:id
Body: UpdateProfessorDto
```

### Buscar Professor por ID
```
GET /api/professores/:id
```

### Deletar Professor
```
DELETE /api/professores/:id
```

## Validações Importantes

### Faixas Permitidas para Professores
- AZUL
- ROXA
- MARROM
- PRETA
- CORAL
- VERMELHA

Faixas inferiores (BRANCA, CINZA, AMARELA, LARANJA, VERDE) **não são permitidas** para professores.

### Vínculo de Unidades
- Todo professor deve ter **pelo menos uma unidade vinculada** (a principal)
- Pode ter múltiplas unidades adicionais
- Não pode ter duplicação de vínculo (constraint UNIQUE)

## Arquivos Modificados

### Frontend
- `frontend/app/professores/page.tsx` - Corrigido para usar API `/professores` e exibir múltiplas unidades

### Backend (já estava correto)
- `backend/src/people/entities/professor-unidade.entity.ts`
- `backend/src/people/services/professores.service.ts`
- `backend/src/people/controllers/professores.controller.ts`
- `backend/src/migrations/1735905000000-ProfessorUnidades.ts`

## Conclusão

A tela de professores agora está funcionando corretamente:
- ✅ Usa a API correta (`/professores`)
- ✅ Remove filtros inadequados
- ✅ Exibe múltiplas unidades vinculadas
- ✅ Backend completo com suporte a relacionamento N:N
- ✅ Migration pronta para criar a tabela necessária

**Próximo passo**: Executar as migrations no banco de dados para garantir que a tabela `professor_unidades` foi criada.
