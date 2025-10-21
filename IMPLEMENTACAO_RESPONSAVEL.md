# Implementação do Perfil RESPONSÁVEL

## ✅ O que já foi feito:

### 1. **Migration** (`1738451000000-CreateResponsaveisTable.ts`)

- ✅ Tabela `teamcruz.responsaveis` criada
- ✅ Coluna `responsavel_id` adicionada em `teamcruz.alunos`
- ✅ Foreign Keys e Índices configurados

### 2. **Entities**

- ✅ `Responsavel.entity.ts` criada
- ✅ `Aluno.entity.ts` atualizada com relacionamento `@ManyToOne`
- ✅ Campos legados mantidos (responsavel_nome, responsavel_cpf, etc)

### 3. **DTOs**

- ✅ `CreateResponsavelDto` criada
- ✅ `UpdateResponsavelDto` criada
- ✅ Enum `GeneroResponsavel` (MASCULINO, FEMININO)

## 📋 O que falta implementar:

### 4. **Service** - `responsaveis.service.ts`

Precisa criar:

- `create()` - Criar responsável vinculado a um usuário
- `findAll()` - Listar todos responsáveis (admin)
- `findOne()` - Buscar responsável por ID
- `findByUsuarioId()` - Buscar responsável pelo usuario_id
- `update()` - Atualizar dados do responsável
- `remove()` - Desativar responsável
- `getDependentes()` - Listar alunos dependentes do responsável

### 5. **Controller** - `responsaveis.controller.ts`

Endpoints:

- `POST /responsaveis` - Criar responsável
- `GET /responsaveis` - Listar (admin)
- `GET /responsaveis/:id` - Buscar por ID
- `GET /responsaveis/meu-perfil` - Buscar responsável logado
- `PATCH /responsaveis/:id` - Atualizar
- `DELETE /responsaveis/:id` - Desativar
- `GET /responsaveis/meus-dependentes` - Listar dependentes do responsável logado
- `POST /responsaveis/dependentes` - Adicionar dependente (aluno)

### 6. **Auth Service** - Atualizar `auth.service.ts`

Adicionar lógica para:

- Criar registro em `responsaveis` quando perfil = "RESPONSÁVEL"
- No `completeProfile()`, tratar perfil RESPONSÁVEL

### 7. **Frontend - Página de Cadastro** (`/register`)

- Adicionar opção "RESPONSÁVEL" no combo de perfis
- Mostrar descrição: "Responsável por alunos (não pratica)"

### 8. **Frontend - Complete Profile** (`/complete-profile`)

- Criar formulário específico para RESPONSÁVEL
- Campos adicionais: profissão, empresa, renda familiar

### 9. **Frontend - Dashboard Responsável**

Criar `ResponsavelDashboard.tsx` com:

- **Resumo**: Total de dependentes, mensalidades, presenças
- **Lista de Dependentes**: Cards com foto, nome, faixa, próxima aula
- **Botão "Adicionar Dependente"**: Modal para cadastrar novo aluno
- **Quick Actions**:
  - Ver Presenças dos Filhos
  - Calendário de Aulas
  - Mensalidades
  - Comunicados da Academia

### 10. **Frontend - Modal Adicionar Dependente**

Formulário para cadastrar aluno vinculado ao responsável:

- Dados pessoais do dependente
- Unidade
- Faixa inicial
- Dados médicos
- Auto-preenche responsavel_id com o responsável logado

### 11. **Perfil no Banco de Dados**

Criar perfil "RESPONSÁVEL" na tabela `teamcruz.perfis`:

```sql
INSERT INTO teamcruz.perfis (nome, descricao, ativo)
VALUES ('RESPONSÁVEL', 'Responsável por alunos dependentes (não pratica)', true);
```

## 🔄 Fluxo Completo Esperado:

### Cadastro:

1. Usuário acessa `/register`
2. Seleciona perfil "RESPONSÁVEL"
3. Preenche dados básicos (nome, email, CPF, telefone, data_nascimento)
4. Sistema cria usuário com `ativo: false`, `cadastro_completo: false`

### Completar Cadastro:

5. Faz login → redireciona para `/complete-profile`
6. Preenche dados adicionais (profissão, endereço, renda familiar)
7. Sistema cria registro em `responsaveis`
8. Marca `cadastro_completo: true`, `ativo: true`

### Dashboard:

9. Acessa `/dashboard`
10. Vê dashboard específico de Responsável
11. Lista vazia de dependentes
12. Clica "Adicionar Dependente"

### Adicionar Dependente:

13. Modal abre com formulário
14. Preenche dados do filho (nome, CPF, data_nascimento, faixa, unidade)
15. Sistema cria aluno com `responsavel_id = responsavel.id`
16. Aluno aparece na lista de dependentes

### Gestão:

17. Responsável vê presenças de todos os filhos
18. Recebe notificações de aulas, graduações, mensalidades
19. Pode editar dados dos dependentes
20. Dashboard mostra resumo consolidado

## 🎯 Próximos Passos:

1. Rodar migration para criar tabela
2. Criar Service e Controller
3. Atualizar Auth Service
4. Criar componentes Frontend
5. Testar fluxo completo
6. Ajustar permissões e autorizações

---

**Status**: Estrutura base criada (Entities, DTOs, Migration) ✅
**Próximo**: Implementar Service e Controller 🚀
