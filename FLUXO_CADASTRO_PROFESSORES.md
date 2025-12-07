# 🥋 Fluxo de Cadastro de Professores

## 📋 Visão Geral

O cadastro de professores agora segue um **fluxo de onboarding em duas etapas**:

1. **Gerente/Franqueado cria usuário** com perfil PROFESSOR em `/usuarios`
2. **Professor completa cadastro** no primeiro login via `/complete-profile`

---

## 🔄 Fluxo Completo

### 1️⃣ **Gerente/Franqueado Cria Usuário Professor**

**Tela**: `http://200.98.72.161/usuarios`

**Quem pode criar:**

- ✅ MASTER
- ✅ FRANQUEADO
- ✅ GERENTE_UNIDADE
- SUPER_ADMIN (não pode criar professores)

**Passos:**

1. Acessar **"Gerenciar Usuários"** → `/usuarios`
2. Clicar em **"➕ Novo Usuário"**
3. Preencher dados básicos:
   - **Nome**
   - **Email**
   - **Username**
   - **CPF**
   - **Telefone**
   - **Senha inicial** (temporária)
4. **Selecionar perfil**: ✅ `PROFESSOR` ou `INSTRUTOR`
5. **NÃO marcar** "Cadastro Completo" (deixar desmarcado)
6. **Associar à unidade** (se for gerente, já vem pré-selecionado)
7. **Salvar**

**Resultado:**

```sql
-- Backend executa automaticamente:
INSERT INTO usuarios (nome, email, username, cpf, telefone, cadastro_completo, ativo)
VALUES (..., false, true);

INSERT INTO usuario_perfis (usuario_id, perfil_id)
VALUES (usuario_id, perfil_professor_id);

INSERT INTO professor_unidades (usuario_id, unidade_id, professor_id)
VALUES (usuario_id, unidade_id, NULL); -- professor_id será preenchido depois
```

✅ Usuário criado com `cadastro_completo = false`
✅ Vinculado à unidade via `professor_unidades`
✅ **Professor JÁ APARECE na listagem** `/professores` (mesmo sem completar cadastro)

---

### 2️⃣ **Professor Faz Primeiro Login**

**Tela**: `http://200.98.72.161/login`

**Passos:**

1. Professor acessa o sistema com credenciais fornecidas
2. Sistema detecta:
   - `perfil = PROFESSOR/INSTRUTOR`
   - `cadastro_completo = false`
3. **Redirecionamento automático** para: `/complete-profile`

---

### 3️⃣ **Professor Completa o Cadastro**

**Tela**: `http://200.98.72.161/complete-profile`

**Campos do formulário específicos para professor:**

📋 **Dados Obrigatórios:**

- Unidade (já vem pré-selecionada)
- Data de nascimento
- Gênero

🥋 **Dados do Instrutor:**

- **Graduação/Faixa** (dropdown):
  - Faixa Azul
  - Faixa Roxa
  - Faixa Marrom
  - Faixa Preta
  - Faixa Coral
- **Especialidades** (texto livre, separado por vírgula):
  - Ex: "Jiu-Jitsu Gi, NoGi, MMA, Defesa Pessoal"
- **Telefone de Contato**

📝 **Observações Adicionais** (opcional)

**Backend processa:**

```typescript
// auth.service.ts - completeProfile()
if (perfilPrincipal === "professor" || perfilPrincipal === "instrutor") {
  const professorData = {
    tipo_cadastro: "PROFESSOR",
    nome_completo: user.nome,
    cpf: user.cpf,
    email: user.email,
    telefone: user.telefone,
    data_nascimento: profileData.data_nascimento,
    genero: profileData.genero || "OUTRO",
    status: "INATIVO", // Aguarda aprovação do gerente
    unidade_id: profileData.unidade_id,
    faixa_ministrante: profileData.faixa_atual, // Mapeamento correto
    especialidades: profileData.especialidades || [],
    observacoes: profileData.observacoes,
    usuario_id: userId,
  };

  await this.professoresService.create(professorData);
}
```

**Resultado:**

```sql
-- Inserção na tabela professores
INSERT INTO professores (
  id, usuario_id, tipo_cadastro, nome_completo, cpf, email, telefone,
  data_nascimento, genero, status, unidade_id, faixa_ministrante,
  especialidades, observacoes, created_at, updated_at
) VALUES (...);

-- Atualização de professor_unidades
UPDATE professor_unidades
SET professor_id = <professor_id>
WHERE usuario_id = <usuario_id>;

-- Marcar cadastro como completo
UPDATE usuarios
SET cadastro_completo = true
WHERE id = <usuario_id>;
```

✅ Registro criado em `professores`
✅ Vínculo `professor_unidades` atualizado
✅ `cadastro_completo = true`
⏳ Status inicial: **INATIVO** (aguarda aprovação)

---

### 4️⃣ **Gerente Aprova o Professor**

**Tela**: `http://200.98.72.161/admin/usuarios-pendentes` ou `/professores`

**Quem pode aprovar:**

- ✅ MASTER
- ✅ FRANQUEADO
- ✅ GERENTE_UNIDADE

**Ações possíveis:**

1. **Visualizar detalhes** do professor cadastrado
2. **Alterar status**:
   - INATIVO → **ATIVO** ✅ (aprovar)
   - ATIVO → SUSPENSO
   - ATIVO → AFASTADO
3. **Editar informações** (se necessário)

**Resultado:**

```sql
UPDATE professores
SET status = 'ATIVO'
WHERE id = <professor_id>;
```

✅ Professor agora pode ministrar aulas
✅ Aparece como **ATIVO** na listagem

---

## 🚫 O que Foi Removido

### Botão "Novo Professor" em `/professores`

**Antes:**

```tsx
<Button onClick={() => setShowForm(true)}>
  <Plus className="h-4 w-4 mr-2" />
  Novo Professor
</Button>
```

**Agora:** REMOVIDO

**Motivo:** Professores agora são criados apenas via `/usuarios` para garantir consistência no fluxo de onboarding.

---

## ✅ O que Permanece

### ✅ Tela `/professores` - Gerenciamento

**Funcionalidades mantidas:**

1. **Listagem** de todos os professores
2. **Filtros**:
   - Por unidade
   - Por status (ATIVO, INATIVO, SUSPENSO, AFASTADO)
   - Por faixa (AZUL, ROXA, MARROM, PRETA, CORAL)
   - Busca por nome/email
3. **Ações**:
   - ✅ **Visualizar** detalhes
   - ✅ **Editar** informações
   - ✅ **Alterar status** (MASTER, Franqueado, Gerente)
   - ✅ **Excluir** (apenas MASTER)
4. **Cards de estatísticas**:
   - Total de professores
   - Ativos
   - Inativos/Pendentes

---

## 🔐 Permissões

| Ação                    | MASTER | FRANQUEADO | GERENTE | SUPER_ADMIN |
| ----------------------- | ------ | ---------- | ------- | ----------- |
| Criar usuário professor | ✅     | ✅         | ✅      |             |
| Visualizar professores  | ✅     | ✅         | ✅      | ✅          |
| Editar professor        | ✅     | ✅         | ✅      | ✅          |
| Alterar status          | ✅     | ✅         | ✅      |             |
| Excluir professor       | ✅     |            |         |             |

---

## 🎯 Vantagens do Novo Fluxo

### ✅ Consistência

- Todos os perfis (aluno, professor, recepcionista) seguem o mesmo padrão de onboarding

### ✅ Segurança

- Separação clara entre criação de credenciais e completar cadastro
- Validação em duas etapas

### ✅ Rastreabilidade

- Vínculo `usuario_id` → `professores` sempre consistente
- Histórico completo no banco

### ✅ UX Melhorado

- Professor completa o próprio cadastro (dados mais precisos)
- Gerente só cria credenciais iniciais (menos trabalho)

### ✅ Manutenção

- Um único ponto de criação de usuários (`/usuarios`)
- Menos duplicação de código

---

## 📊 Diagrama do Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                    GERENTE/FRANQUEADO                       │
│                                                             │
│  1. Acessa /usuarios                                        │
│  2. Clica "Novo Usuário"                                    │
│  3. Preenche: nome, email, username, cpf, senha             │
│  4. Seleciona perfil: PROFESSOR                             │
│  5. Marca unidade                                           │
│  6. Salva (cadastro_completo = FALSE)                       │
│                                                             │
│  ✅ Usuário criado                                          │
│  ✅ Vinculado à unidade (professor_unidades)                │
│  ✅ JÁ APARECE em /professores                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      PROFESSOR (Login)                      │
│                                                             │
│  1. Acessa /login com credenciais fornecidas               │
│  2. Sistema detecta: perfil=PROFESSOR + cadastro=FALSE      │
│  3. Redirecionamento automático → /complete-profile         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PROFESSOR (Complete Profile)               │
│                                                             │
│  Preenche formulário:                                       │
│  • Data nascimento                                          │
│  • Gênero                                                   │
│  • Faixa (AZUL/ROXA/MARROM/PRETA/CORAL)                     │
│  • Especialidades                                           │
│  • Telefone contato                                         │
│                                                             │
│  Ao salvar:                                                 │
│  ✅ INSERT INTO professores                                 │
│  ✅ UPDATE professor_unidades SET professor_id              │
│  ✅ UPDATE usuarios SET cadastro_completo = TRUE            │
│  ✅ Status inicial: INATIVO (aguarda aprovação)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                GERENTE/FRANQUEADO (Aprovação)               │
│                                                             │
│  1. Acessa /admin/usuarios-pendentes ou /professores        │
│  2. Visualiza professor com status INATIVO                  │
│  3. Altera status: INATIVO → ATIVO                          │
│                                                             │
│  ✅ Professor aprovado e pode ministrar aulas               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Como Testar

### Teste Completo do Fluxo:

1. **Login como Gerente/Franqueado**

   ```
   URL: http://200.98.72.161/login
   ```

2. **Criar usuário professor**

   ```
   URL: http://200.98.72.161/usuarios
   - Clicar "Novo Usuário"
   - Preencher dados
   - Selecionar perfil: PROFESSOR
   - Salvar
   ```

3. **Verificar listagem**

   ```
   URL: http://200.98.72.161/professores
   - Professor deve aparecer com status "INATIVO"
   ```

4. **Logout e login como professor**

   ```
   URL: http://200.98.72.161/login
   - Usar credenciais criadas
   - Verificar redirecionamento automático para /complete-profile
   ```

5. **Completar cadastro**

   ```
   URL: http://200.98.72.161/complete-profile
   - Preencher todos os campos
   - Salvar
   - Verificar redirecionamento para dashboard
   ```

6. **Voltar como gerente e aprovar**
   ```
   URL: http://200.98.72.161/professores
   - Alterar status: INATIVO → ATIVO
   ```

---

## 📝 Notas Técnicas

### Backend

**Arquivo:** `backend/src/auth/auth.service.ts`

- Método `completeProfile()` detecta perfil PROFESSOR
- Cria registro em `professores` com `faixa_ministrante`
- Atualiza `professor_unidades` com `professor_id`

**Arquivo:** `backend/src/people/services/professores.service.ts`

- Valida faixa ministrante (AZUL, ROXA, MARROM, PRETA, CORAL)
- Garante vínculo correto `usuario_id` → `professor_id`

### Frontend

**Arquivo:** `frontend/app/complete-profile/page.tsx`

- Detecta perfil via `isProfessor`
- Renderiza campos condicionalmente: `{isProfessor && (...)}`
- Mapeia `faixa_atual` → backend processa como `faixa_ministrante`

**Arquivo:** `frontend/app/professores/page.tsx`

- **REMOVIDO:** Botão "Novo Professor"
- **REMOVIDO:** Modal de criação
- **MANTIDO:** Listagem, edição, alteração de status, exclusão

---

## 🔄 Migração de Dados Existentes

Se houver professores cadastrados pelo método antigo:

```sql
-- Verificar professores sem usuario_id
SELECT id, nome_completo, email, cpf
FROM professores
WHERE usuario_id IS NULL;

-- Para cada professor, criar usuário correspondente
-- (executar manualmente ou via script de migração)
```

---

## ✅ Checklist de Deploy

- [x] Remover botão "Novo Professor" de `/professores`
- [x] Remover modal/formulário de criação
- [x] Remover imports não utilizados (Plus, PersonForm, Button)
- [x] Verificar `complete-profile` suporta professores
- [x] Testar fluxo completo em desenvolvimento
- [ ] **Fazer commit e push das alterações**
- [ ] **Deploy em produção**
- [ ] **Testar em produção**
- [ ] **Documentar para equipe**

---

**Última atualização:** 22/11/2025
