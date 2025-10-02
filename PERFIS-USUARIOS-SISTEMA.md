# 📋 Sistema de Perfis e Permissões - Team Cruz

## 🎯 Visão Geral

O sistema implementa um modelo de controle de acesso baseado em **Perfis (Roles)** e **Permissões** granulares, com auditoria completa.

---

## 👥 Perfis de Usuário Disponíveis

### 1. **Master** 🔑
- **Código:** `master`
- **Descrição:** Administrador master do sistema
- **Permissões:** TODAS as permissões do sistema
- **Uso:** Equipe técnica e administração central da Team Cruz

### 2. **Franqueado** 🏢
- **Código:** `franqueado`
- **Descrição:** Proprietário de franquia
- **Permissões:**
  - ✅ **Unidades:** Leitura, Escrita, Exclusão
  - ✅ **Alunos:** Leitura, Escrita
  - ✅ **Professores:** Leitura, Escrita
  - ✅ **Financeiro:** Leitura, Escrita
  - ✅ **Relatórios:** Leitura
  - ✅ **Franquias:** Apenas Leitura (visualiza suas próprias franquias)
- **Uso:** Proprietários de franquias que gerenciam múltiplas unidades

### 3. **Gerente de Unidade** 🏪
- **Código:** `gerente_unidade`
- **Descrição:** Gerente de unidade/academia
- **Permissões:**
  - ✅ **Unidades:** Leitura, Escrita (apenas dados operacionais)
  - ✅ **Alunos:** Leitura, Escrita
  - ✅ **Professores:** Apenas Leitura
  - ✅ **Financeiro:** Apenas Leitura
  - ✅ **Relatórios:** Leitura
- **Uso:** Gerentes responsáveis por uma unidade específica

### 4. **Instrutor/Professor** 🥋
- **Código:** `instrutor`
- **Descrição:** Instrutor/Professor de jiu-jitsu
- **Permissões:**
  - ✅ **Alunos:** Leitura, Escrita (gerenciar alunos e aulas)
  - ✅ **Unidades:** Apenas Leitura (visualiza informações da unidade)
  - ✅ **Graduações:** Pode aprovar graduações
  - ✅ **Presenças:** Pode registrar check-ins
- **Uso:** Professores que ministram aulas e acompanham evolução dos alunos

### 5. **Aluno** 🎓
- **Código:** `aluno`
- **Descrição:** Aluno de jiu-jitsu
- **Permissões:**
  - ✅ **Alunos:** Apenas Leitura (seus próprios dados)
  - ✅ Visualizar seu histórico de presenças
  - ✅ Visualizar sua graduação atual
  - ✅ Visualizar seu progresso
- **Uso:** Alunos matriculados nas academias

---

## 🔐 Níveis de Permissão

O sistema trabalha com 4 níveis de permissão:

| Código | Nome | Descrição | Cor |
|--------|------|-----------|-----|
| `READ` | Leitura | Permissão para visualizar | 🟢 Verde (#28a745) |
| `WRITE` | Escrita | Permissão para criar e editar | 🟡 Amarelo (#ffc107) |
| `DELETE` | Exclusão | Permissão para excluir | 🔴 Vermelho (#dc3545) |
| `ADMIN` | Administração | Permissão total | 🟣 Roxo (#6f42c1) |

---

## 📦 Módulos do Sistema

O sistema está dividido nos seguintes módulos, cada um com permissões específicas:

### 1. **FRANQUIAS** 🏢
- Gestão de franquias
- Permissões: `FRANQUIAS_READ`, `FRANQUIAS_WRITE`, `FRANQUIAS_DELETE`, `FRANQUIAS_ADMIN`

### 2. **UNIDADES** 🏪
- Gestão de unidades/academias
- Permissões: `UNIDADES_READ`, `UNIDADES_WRITE`, `UNIDADES_DELETE`, `UNIDADES_ADMIN`

### 3. **ALUNOS** 🎓
- Gestão de alunos
- Permissões: `ALUNOS_READ`, `ALUNOS_WRITE`, `ALUNOS_DELETE`, `ALUNOS_ADMIN`

### 4. **PROFESSORES** 🥋
- Gestão de professores
- Permissões: `PROFESSORES_READ`, `PROFESSORES_WRITE`, `PROFESSORES_DELETE`, `PROFESSORES_ADMIN`

### 5. **FINANCEIRO** 💰
- Gestão financeira
- Permissões: `FINANCEIRO_READ`, `FINANCEIRO_WRITE`, `FINANCEIRO_DELETE`, `FINANCEIRO_ADMIN`

### 6. **USUÁRIOS** 👤
- Gestão de usuários do sistema
- Permissões: `USUARIOS_READ`, `USUARIOS_WRITE`, `USUARIOS_DELETE`, `USUARIOS_ADMIN`

### 7. **RELATÓRIOS** 📊
- Acesso a relatórios
- Permissões: `RELATORIOS_READ` (apenas leitura)

### 8. **CONFIGURAÇÕES** ⚙️
- Configurações do sistema
- Permissões: `CONFIGURACOES_READ`, `CONFIGURACOES_WRITE`, `CONFIGURACOES_DELETE`, `CONFIGURACOES_ADMIN`

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### `perfis`
```sql
- id (UUID)
- nome (string, unique)
- descricao (text)
- ativo (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

#### `permissoes`
```sql
- id (UUID)
- codigo (string, unique)
- nome (string)
- descricao (text)
- tipo_id (UUID) -> tipos_permissao
- nivel_id (UUID) -> niveis_permissao
- modulo (string)
- ativo (boolean)
```

#### `usuario_perfis` (Many-to-Many)
```sql
- usuario_id (UUID)
- perfil_id (UUID)
```

#### `perfil_permissoes` (Many-to-Many)
```sql
- perfil_id (UUID)
- permissao_id (UUID)
```

---

## 🚀 Como Usar no Sistema

### Backend (NestJS)

#### Proteger Rotas com Perfis
```typescript
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@Controller('unidades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesController {
  
  @Get()
  @Roles('master', 'franqueado', 'gerente_unidade')
  findAll() {
    // Apenas master, franqueado e gerente podem listar unidades
  }
  
  @Post()
  @Roles('master', 'franqueado')
  create() {
    // Apenas master e franqueado podem criar unidades
  }
}
```

#### Verificar Permissões Específicas
```typescript
// No service ou controller
const hasPermission = user.perfis.some(perfil =>
  perfil.permissoes.some(perm => perm.codigo === 'ALUNOS_WRITE')
);
```

### Frontend (React)

#### Proteger Componentes
```typescript
// Hook personalizado
function useHasPermission(permission: string) {
  const { user } = useAuth();
  return user?.perfis?.some(perfil =>
    perfil.permissoes?.some(p => p.codigo === permission)
  );
}

// Uso no componente
function AlunosPage() {
  const canEdit = useHasPermission('ALUNOS_WRITE');
  
  return (
    <div>
      <h1>Alunos</h1>
      {canEdit && <Button>Adicionar Aluno</Button>}
    </div>
  );
}
```

---

## 📍 Onde Definir Perfis de Novos Usuários

### 1. **Via Migração (Seed)** - ✅ Recomendado para Perfis Padrão
**Arquivo:** `src/migrations/1756928100000-SeedPerfisPermissoes.ts`

Este arquivo já contém a definição dos 5 perfis padrão do sistema. Se precisar adicionar um novo perfil padrão, adicione aqui.

### 2. **Via API REST** - ✅ Recomendado para Novos Perfis Personalizados

#### Criar Perfil
```http
POST /api/perfis
Content-Type: application/json
Authorization: Bearer {token}

{
  "nome": "supervisor",
  "descricao": "Supervisor de múltiplas unidades",
  "ativo": true,
  "permissao_ids": [
    "uuid-da-permissao-1",
    "uuid-da-permissao-2"
  ]
}
```

#### Listar Perfis
```http
GET /api/perfis
Authorization: Bearer {token}
```

#### Atualizar Perfil
```http
PATCH /api/perfis/{id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "nome": "supervisor_regional",
  "descricao": "Atualizado"
}
```

#### Adicionar Permissão a um Perfil
```http
POST /api/perfis/{perfil_id}/permissoes/{permissao_id}
Authorization: Bearer {token}
```

### 3. **Via Interface Web** - ✅ Recomendado para Administradores

A tela de gerenciamento está em:
- **Rota:** `/usuarios`
- **Componente:** `frontend/components/usuarios/UsuariosManager.tsx`

Esta tela possui 3 abas:
1. **Usuários** - Gerenciar usuários e atribuir perfis
2. **Perfis** - Criar/editar perfis e suas permissões
3. **Permissões** - Visualizar todas as permissões disponíveis

---

## 🔄 Fluxo de Criação de Novo Usuário

### Passo a Passo:

1. **Criar o Usuário**
```http
POST /api/usuarios
{
  "username": "joao.silva",
  "email": "joao@teamcruz.com",
  "password": "senha123",
  "nome": "João Silva",
  "cpf": "123.456.789-00",
  "perfil_ids": ["uuid-do-perfil-instrutor"]
}
```

2. **O sistema automaticamente:**
   - Cria o usuário
   - Vincula aos perfis especificados
   - Herda todas as permissões daqueles perfis
   - Registra em auditoria

3. **O usuário pode fazer login e:**
   - Acessa apenas as funcionalidades permitidas pelo(s) seu(s) perfil(is)
   - Todas as ações são auditadas

---

## 🛡️ Segurança e Auditoria

### Auditoria Automática
Todas as operações são registradas na tabela `audit_log`:
- Quem fez a ação (usuário)
- Quando (timestamp)
- O que foi feito (ação)
- Em qual entidade (tabela/ID)
- Valores antes e depois (JSON)

### Exemplo de Registro de Auditoria
```json
{
  "entity": "Usuario",
  "entity_id": "uuid-123",
  "action": "UPDATE",
  "user_id": "uuid-admin",
  "changes": {
    "perfis": {
      "before": ["aluno"],
      "after": ["instrutor"]
    }
  },
  "timestamp": "2025-10-02T12:00:00Z"
}
```

---

## 🎨 Próximos Passos para Implementar

### Frontend
- [ ] Criar página de gerenciamento de perfis (atualmente está mockada)
- [ ] Integrar com API real do backend
- [ ] Adicionar permissões específicas para graduações
- [ ] Criar visualização de hierarquia de perfis

### Backend
- [✅] Sistema de perfis implementado
- [✅] Sistema de permissões implementado
- [✅] Auditoria configurada
- [ ] Adicionar permissões específicas para módulo de graduações
- [ ] Implementar filtros por unidade para gerentes

---

## 📞 Dúvidas Comuns

### Como adicionar um novo perfil personalizado?
Use a interface web em `/usuarios` > aba "Perfis" > "Novo Perfil"

### Como atribuir perfil a um usuário existente?
Use a interface web em `/usuarios` > aba "Usuários" > botão de edição > selecionar perfis

### Um usuário pode ter múltiplos perfis?
**Sim!** Um usuário pode ter quantos perfis precisar. Ele terá a soma de todas as permissões de todos os seus perfis.

### Como criar permissões personalizadas?
Atualmente, as permissões são criadas via migration. Para adicionar novas, crie uma nova migration seguindo o padrão existente.

---

## 📝 Usuário Padrão do Sistema

**Username:** `admin`  
**Email:** `admin@teamcruz.com`  
**Senha:** `admin123`  
**Perfil:** Master  
**Permissões:** Todas

⚠️ **IMPORTANTE:** Altere a senha padrão em produção!

---

## 🔗 Arquivos Relacionados

### Backend
- `src/usuarios/entities/perfil.entity.ts` - Entidade Perfil
- `src/usuarios/entities/permissao.entity.ts` - Entidade Permissão
- `src/usuarios/controllers/perfis.controller.ts` - Controller de Perfis
- `src/usuarios/services/perfis.service.ts` - Service de Perfis
- `src/migrations/1756928100000-SeedPerfisPermissoes.ts` - Seed de dados
- `src/auth/guards/roles.guard.ts` - Guard de proteção por perfil

### Frontend
- `frontend/app/usuarios/page.tsx` - Página de usuários
- `frontend/components/usuarios/UsuariosManager.tsx` - Componente principal

---

**Criado em:** 02/10/2025  
**Última atualização:** 02/10/2025  
**Versão:** 1.0
