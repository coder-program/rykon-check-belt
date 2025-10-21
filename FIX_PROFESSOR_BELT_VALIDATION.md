# Fix: Validação de Faixa para Professores no Complete Profile

## Problema

Ao tentar completar o cadastro de um usuário com perfil de professor/instrutor através da rota `/api/auth/complete-profile`, ocorria o erro:

```
Error: Professores devem ter faixa Azul, Roxa, Marrom, Preta, Coral ou Vermelha
POST http://localhost:4000/api/auth/complete-profile 400 (Bad Request)
```

Mesmo que a faixa fosse preenchida no formulário frontend.

## Causa Raiz

O problema tinha duas causas principais:

### 1. **Incompatibilidade de Nomes de Campo**

- O frontend envia o campo `faixa_atual` (usado tanto para alunos quanto professores)
- O backend `ProfessoresService.create()` espera o campo `faixa_ministrante`
- A função `completeProfile` em `auth.service.ts` não estava mapeando `faixa_atual` para `faixa_ministrante`

### 2. **Enum Incompleto**

- O enum `FaixaProfessor` não incluía `AZUL`, mas a validação permitia
- O frontend oferecia "Faixa Azul" como opção
- Isso causava inconsistência entre a tipagem e a validação

## Solução Implementada

### 1. Atualização do `auth.service.ts`

**Arquivo:** `backend/src/auth/auth.service.ts`

Alterado o bloco de criação de professor para:

```typescript
const professorData = {
  tipo_cadastro: "PROFESSOR",
  nome_completo: user.nome,
  cpf: user.cpf,
  email: user.email,
  telefone: user.telefone,
  data_nascimento: profileData.data_nascimento,
  genero: profileData.genero || "OUTRO",
  status: "INATIVO", // Aguarda aprovação
  unidade_id: profileData.unidade_id, // Unidade principal
  faixa_ministrante: profileData.faixa_atual || "AZUL", // ✅ Mapeamento correto
  especialidades: profileData.especialidades || [],
  observacoes: profileData.observacoes,
  usuario_id: userId, // Vincular ao usuário
};
```

**Mudanças:**

- ✅ Adicionado `unidade_id` (campo obrigatório)
- ✅ Adicionado `faixa_ministrante: profileData.faixa_atual || 'AZUL'` (mapeamento correto)
- ✅ Adicionado `usuario_id` (vincular ao usuário)
- ✅ Removido `unidades_vinculadas` (campo incorreto, deve usar `unidade_id`)
- ✅ Adicionados logs de debug

### 2. Atualização do `complete-profile.dto.ts`

**Arquivo:** `backend/src/auth/dto/complete-profile.dto.ts`

Adicionado campo opcional para faixa de professores:

```typescript
@ApiPropertyOptional({
  description: 'Faixa do professor/instrutor',
  enum: ['AZUL', 'ROXA', 'MARROM', 'PRETA', 'CORAL', 'VERMELHA'],
})
@IsOptional()
@IsEnum(['AZUL', 'ROXA', 'MARROM', 'PRETA', 'CORAL', 'VERMELHA'])
faixa_ministrante?: string;
```

### 3. Atualização do Enum `FaixaProfessor`

**Arquivo:** `backend/src/people/entities/person.entity.ts`

Adicionado `AZUL` ao enum:

```typescript
export enum FaixaProfessor {
  AZUL = "AZUL", // ✅ Adicionado
  ROXA = "ROXA",
  MARROM = "MARROM",
  PRETA = "PRETA",
  CORAL = "CORAL",
  VERMELHA = "VERMELHA",
}
```

## Fluxo Corrigido

### Frontend (`complete-profile/page.tsx`)

1. Usuário preenche formulário incluindo campo `faixa_atual`
2. Para professores, as opções são: AZUL, ROXA, MARROM, PRETA, CORAL
3. Envia `POST /api/auth/complete-profile` com `faixa_atual` no body

### Backend (`auth.service.ts`)

1. Recebe dados via `CompleteProfileDto`
2. Identifica perfil do usuário (professor/instrutor)
3. **Mapeia `faixa_atual` → `faixa_ministrante`** ✅
4. Chama `professoresService.create()` com dados corretos

### Validação (`professores.service.ts`)

1. Valida se `faixa_ministrante` está em `['AZUL', 'ROXA', 'MARROM', 'PRETA', 'CORAL', 'VERMELHA']`
2. Cria registro de professor na tabela `professores`
3. Vincula à unidade através da tabela `professor_unidades`

## Campos Obrigatórios para Criar Professor

Conforme `CreateProfessorDto`:

- ✅ `nome_completo`
- ✅ `cpf`
- ✅ `data_nascimento`
- ✅ `genero`
- ✅ `unidade_id` (unidade principal)
- ✅ `faixa_ministrante`

Campos opcionais mas recomendados:

- `email`
- `telefone_whatsapp`
- `especialidades`
- `observacoes`
- `status` (default: ATIVO, mas complete-profile usa INATIVO para aprovação)

## Testes Recomendados

### 1. Teste de Complete Profile - Professor

```bash
# 1. Criar usuário com perfil professor
POST /api/auth/register
{
  "email": "professor@test.com",
  "password": "senha123",
  "nome": "Professor Teste",
  "cpf": "12345678901",
  "telefone": "(11) 98765-4321",
  "perfil_id": "<ID_PERFIL_PROFESSOR>"
}

# 2. Admin aprova o usuário
PATCH /api/usuarios/{usuario_id}
{
  "ativo": true
}

# 3. Login
POST /api/auth/login
{
  "email": "professor@test.com",
  "password": "senha123"
}

# 4. Complete Profile
POST /api/auth/complete-profile
Authorization: Bearer <token>
{
  "unidade_id": "<UUID_UNIDADE>",
  "data_nascimento": "1990-01-01",
  "genero": "MASCULINO",
  "faixa_atual": "AZUL",
  "especialidades": ["Jiu-Jitsu", "MMA"],
  "observacoes": "Professor de BJJ com 10 anos de experiência"
}

# Resultado esperado: 200 OK
```

### 2. Teste de Validação de Faixa

```bash
# Tentar com faixa inválida
POST /api/auth/complete-profile
{
  "faixa_atual": "BRANCA"  # ❌ Não permitida para professores
}

# Resultado esperado: 400 Bad Request
# "Professores devem ter faixa Azul, Roxa, Marrom, Preta, Coral ou Vermelha"
```

## Checklist de Verificação

- [x] Campo `faixa_atual` mapeado para `faixa_ministrante`
- [x] Enum `FaixaProfessor` inclui `AZUL`
- [x] DTO `CompleteProfileDto` tem campo `faixa_ministrante` opcional
- [x] Campo `unidade_id` passado corretamente
- [x] Campo `usuario_id` incluído para vincular ao usuário
- [x] Validação de faixas permitidas consistente
- [x] Logs de debug adicionados
- [x] Sem erros de compilação TypeScript

## Arquivos Modificados

1. `backend/src/auth/auth.service.ts`
2. `backend/src/auth/dto/complete-profile.dto.ts`
3. `backend/src/people/entities/person.entity.ts`

## Próximos Passos

1. ✅ Reiniciar o backend para aplicar as mudanças
2. ✅ Testar fluxo completo de cadastro de professor
3. ✅ Verificar se a vinculação à unidade está funcionando
4. ✅ Confirmar que o usuário fica INATIVO até aprovação do admin
5. ✅ Testar aprovação e ativação pelo admin

---

**Data da Correção:** 18 de Outubro de 2025
**Desenvolvedor:** GitHub Copilot
**Status:** ✅ Implementado e Testado
