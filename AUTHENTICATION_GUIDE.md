# 📚 Guia de Autenticação e Controle de Acesso - TeamCruz

## 🎯 Visão Geral

Este documento descreve a estrutura completa de autenticação, perfis de acesso e permissões do sistema TeamCruz Jiu-Jitsu.

## 🔐 Arquitetura de Autenticação

### Backend (NestJS)

#### Guards
- **JwtAuthGuard**: Valida tokens JWT nas rotas protegidas
- **LocalAuthGuard**: Valida credenciais no login (username/email + senha)

#### Estratégia JWT
- Localização: `backend/src/auth/strategies/jwt.strategy.ts`
- Extrai token do header `Authorization: Bearer <token>`
- Valida token e popula dados do usuário no request

#### Serviços Principais
- **AuthService** (`backend/src/auth/auth.service.ts`)
  - `login()`: Autenticação e geração de token
  - `validateToken()`: Validação de token JWT
  - `getUserProfile()`: Retorna perfil completo do usuário
  - `registerAluno()`: Auto-cadastro de alunos
  - `completeProfile()`: Completar dados após primeiro login

- **UsuariosService** (`backend/src/usuarios/services/usuarios.service.ts`)
  - `create()`: Criação de novos usuários
  - `findAll()`: Listar todos os usuários
  - `findPendingApproval()`: Usuários aguardando aprovação
  - `approveUser()`: Aprovar usuário
  - `rejectUser()`: Rejeitar e remover usuário
  - `getUserPermissions()`: Retornar códigos de permissões
  - `getUserPerfis()`: Retornar nomes dos perfis

### Frontend (Next.js)

#### Contexto de Autenticação
- **AuthContext** (`frontend/app/auth/AuthContext.tsx`)
  - Gerencia estado global de autenticação
  - Funções: `login()`, `logout()`, `checkAuthStatus()`
  - Provê: `user`, `loading`, `isAuthenticated`

#### Serviço de Autenticação
- **authService** (`frontend/lib/services/authService.ts`)
  - `login()`: Chamada ao endpoint de login
  - `validateToken()`: Validação via `/auth/profile`
  - `register()`: Auto-cadastro
  - `completeProfile()`: Completar perfil

#### Componentes de Proteção
- **ProtectedRoute** (`frontend/components/auth/ProtectedRoute.tsx`)
  - Componente wrapper para proteger rotas
  - Suporta verificação de perfis e permissões
  - Exibe mensagem de acesso negado quando necessário

#### Hook de Permissões
- **usePermissions** (`frontend/hooks/usePermissions.ts`)
  - Funções utilitárias para verificação de acesso
  - Métodos disponíveis:
    - `hasPerfil(perfil: string)`: Verifica perfil específico
    - `hasAnyPerfil(perfis: string[])`: Verifica qualquer perfil da lista
    - `hasAllPerfis(perfis: string[])`: Verifica todos os perfis
    - `hasPermission(permission: string)`: Verifica permissão específica
    - `isMaster()`, `isFranqueado()`, `isInstrutor()`, `isAluno()`
    - `getUserPerfis()`, `getUserPermissions()`

---

## 👥 Perfis de Acesso

### 1. Master (Administrador do Sistema)
**Descrição**: Controle total do sistema

**Permissões**:
- ✅ Gerenciar todos os usuários
- ✅ Aprovar/rejeitar cadastros
- ✅ Gerenciar franqueados e unidades
- ✅ Configurar sistema de graduação
- ✅ Configurar sistema de presença
- ✅ Associar professores a unidades
- ✅ Visualizar relatórios completos
- ✅ Gerenciar perfis e permissões

**Rotas Acessíveis**:
- `/dashboard` - Dashboard Master
- `/usuarios` - Gestão de usuários
- `/admin/usuarios-pendentes` - Aprovação de cadastros
- `/admin/gestao-franqueados` - Gestão de franqueados
- `/admin/gestao-unidades` - Gestão de unidades
- `/admin/sistema-graduacao` - Sistema de graduação
- `/admin/sistema-presenca` - Sistema de presença
- `/alunos` - Gestão de alunos
- `/professores` - Gestão de professores
- `/franqueados` - Visualizar franqueados
- `/unidades` - Visualizar unidades

### 2. Franqueado
**Descrição**: Dono de unidade(s)

**Permissões**:
- ✅ Visualizar dados das suas unidades
- ✅ Gerenciar alunos das suas unidades
- ✅ Visualizar professores das suas unidades
- ✅ Relatórios de presença das suas unidades
- ✅ Relatórios de graduação das suas unidades

**Rotas Acessíveis**:
- `/dashboard` - Dashboard Franqueado
- `/alunos` - Alunos das suas unidades (filtrado)
- `/presenca` - Presença das suas unidades
- `/graduacao` - Graduação das suas unidades

### 3. Instrutor/Professor
**Descrição**: Professor de uma ou mais unidades

**Permissões**:
- ✅ Registrar presença dos alunos
- ✅ Visualizar seus alunos
- ✅ Registrar evolução de graduação
- ✅ Visualizar horários de aula

**Rotas Acessíveis**:
- `/dashboard` - Dashboard Instrutor
- `/meus-alunos` - Lista de alunos do professor
- `/presenca` - Registrar presença
- `/graduacao` - Registrar evolução
- `/horarios` - Horários de aula

### 4. Aluno
**Descrição**: Aluno matriculado

**Permissões**:
- ✅ Visualizar próprio progresso
- ✅ Visualizar própria frequência
- ✅ Visualizar horários de aula

**Rotas Acessíveis**:
- `/dashboard` - Dashboard Aluno
- `/meu-progresso` - Progresso e graduação
- `/horarios` - Horários de aula

---

## 🔒 Endpoints Protegidos

### Backend

#### Endpoints Públicos (sem autenticação)
```
POST /auth/login
POST /auth/register
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/health
```

#### Endpoints Protegidos (requerem JWT)
```
GET  /auth/profile          - @UseGuards(JwtAuthGuard)
GET  /auth/me               - @UseGuards(JwtAuthGuard)
POST /auth/complete-profile - @UseGuards(JwtAuthGuard)
POST /auth/refresh          - @UseGuards(JwtAuthGuard)
POST /auth/change-password  - @UseGuards(JwtAuthGuard)

GET    /usuarios/pendentes/list - @UseGuards(JwtAuthGuard)
PATCH  /usuarios/:id/aprovar    - @UseGuards(JwtAuthGuard)
PATCH  /usuarios/:id/rejeitar   - @UseGuards(JwtAuthGuard)
```

### Frontend

#### Rotas Públicas
```
/login
/register
/auth/callback
```

#### Rotas Protegidas (requerem autenticação)
```
/dashboard
/complete-profile
/usuarios
/alunos
/professores
/franqueados
/unidades
/presenca
/graduacao
/horarios
/meu-progresso
/meus-alunos
```

#### Rotas Admin (requerem perfil Master)
```
/admin/usuarios-pendentes
/admin/gestao-franqueados
/admin/gestao-unidades
/admin/sistema-graduacao
/admin/sistema-presenca
```

---

## 🛠️ Como Usar

### Proteger uma Rota no Frontend

```tsx
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function MyProtectedPage() {
  return (
    <ProtectedRoute requiredPerfis={["master", "franqueado"]}>
      <div>Conteúdo protegido</div>
    </ProtectedRoute>
  );
}
```

### Usar Hook de Permissões

```tsx
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const { isMaster, hasPerfil, hasPermission } = usePermissions();

  if (isMaster()) {
    return <AdminPanel />;
  }

  if (hasPerfil("instrutor")) {
    return <InstructorPanel />;
  }

  return <DefaultView />;
}
```

### Proteger Endpoint no Backend

```typescript
@UseGuards(JwtAuthGuard)
@Get('my-protected-route')
async myProtectedRoute(@Request() req) {
  // req.user contém os dados do usuário autenticado
  return this.myService.getData(req.user.id);
}
```

---

## 🔄 Fluxo de Autenticação

### 1. Login
```
1. Usuário envia email/username e senha para POST /auth/login
2. Backend valida credenciais via LocalAuthGuard
3. Backend gera token JWT com payload:
   - sub: userId
   - username
   - email
   - permissions: array de códigos de permissões
4. Backend retorna:
   - access_token
   - user: { id, username, email, nome, cadastro_completo, permissions, permissionsDetail, perfis }
5. Frontend armazena token no localStorage
6. Frontend atualiza AuthContext com dados do usuário
7. Redirecionamento automático para /dashboard ou /complete-profile
```

### 2. Validação Automática
```
1. App carrega, AuthContext executa checkAuthStatus()
2. Busca token do localStorage
3. Chama GET /auth/profile com token
4. Backend valida token via JwtAuthGuard
5. Backend retorna dados completos do usuário
6. Frontend atualiza estado de autenticação
```

### 3. Acesso a Rota Protegida
```
1. Usuário navega para rota protegida
2. ProtectedRoute verifica se está autenticado
3. Se não autenticado, redireciona para /login
4. Se autenticado, verifica perfis/permissões necessárias
5. Se tem acesso, renderiza conteúdo
6. Se não tem acesso, exibe mensagem de acesso negado
```

---

## 📊 Estrutura de Dados

### Usuário (Backend)
```typescript
{
  id: string (UUID),
  username: string,
  email: string,
  password: string (hash bcrypt),
  nome: string,
  cpf?: string,
  telefone?: string,
  ativo: boolean,
  cadastro_completo: boolean,
  ultimo_login?: Date,
  created_at: Date,
  updated_at: Date,
  perfis: Perfil[]
}
```

### Perfil
```typescript
{
  id: string (UUID),
  nome: string,  // "Master", "Franqueado", "Instrutor", "Aluno"
  descricao: string,
  ativo: boolean,
  permissoes: Permissao[]
}
```

### Permissão
```typescript
{
  id: string (UUID),
  codigo: string,  // Identificador único (ex: "usuarios:criar")
  nome: string,
  descricao: string,
  modulo: string,  // Módulo do sistema
  nivel: PermissaoNivel,
  tipo: PermissaoTipo
}
```

### Payload JWT
```typescript
{
  sub: string,        // userId
  username: string,
  email: string,
  permissions: string[],  // Array de códigos de permissão
  iat: number,
  exp: number
}
```

### Dados do Usuário Retornados
```typescript
{
  id: string,
  username: string,
  email: string,
  nome: string,
  cpf?: string,
  telefone?: string,
  ativo: boolean,
  cadastro_completo: boolean,
  ultimo_login?: Date,
  perfis: string[],  // Array de nomes de perfis
  permissions: string[],  // Array de códigos de permissões
  permissionsDetail: PermissionDetail[]  // Array com detalhes completos
}
```

---

## 🧪 Testando Autenticação

### Criar Usuário Master Manualmente (via SQL)
```sql
-- 1. Buscar ID do perfil Master
SELECT id FROM perfis WHERE nome = 'Master';

-- 2. Criar usuário (senha: "admin123")
INSERT INTO usuarios (id, username, email, password, nome, ativo, cadastro_completo)
VALUES (
  uuid_generate_v4(),
  'admin',
  'admin@teamcruz.com',
  '$2b$10$YourHashedPasswordHere',
  'Administrador',
  true,
  true
);

-- 3. Associar perfil Master
INSERT INTO usuario_perfis (usuario_id, perfil_id)
VALUES (
  (SELECT id FROM usuarios WHERE username = 'admin'),
  (SELECT id FROM perfis WHERE nome = 'Master')
);
```

### Testar Login via API
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@teamcruz.com",
    "password": "admin123"
  }'
```

### Testar Rota Protegida
```bash
curl -X GET http://localhost:4000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🐛 Troubleshooting

### Problema: "Access Denied" mesmo logado como Master
**Solução**: 
1. Verificar se perfis estão sendo retornados no `/auth/profile`
2. Abrir console e verificar `userData.perfis`
3. Confirmar que backend está populando `usuario.perfis` com relations

### Problema: Token expirado
**Solução**: 
- Tokens JWT expiram em 30 minutos
- Implementar refresh token ou fazer novo login

### Problema: Perfis não sendo reconhecidos
**Solução**:
- Verificar se `getUserPerfis()` retorna array de strings (nomes dos perfis)
- Confirmar que frontend está normalizando perfis (case-insensitive)
- Usar hook `usePermissions` para verificações

---

## 📝 Arquivos Importantes

### Backend
```
src/auth/
├── auth.controller.ts       - Endpoints de autenticação
├── auth.service.ts          - Lógica de autenticação
├── guards/
│   ├── jwt-auth.guard.ts    - Guard JWT
│   └── local-auth.guard.ts  - Guard de login
└── strategies/
    └── jwt.strategy.ts      - Estratégia JWT

src/usuarios/
├── controllers/
│   └── usuarios.controller.ts
├── services/
│   ├── usuarios.service.ts
│   └── perfis.service.ts
├── entities/
│   ├── usuario.entity.ts
│   ├── perfil.entity.ts
│   └── permissao.entity.ts
└── dto/
    └── create-usuario.dto.ts
```

### Frontend
```
app/auth/
└── AuthContext.tsx          - Contexto de autenticação

components/auth/
└── ProtectedRoute.tsx       - Componente de proteção

hooks/
└── usePermissions.ts        - Hook de permissões

lib/services/
└── authService.ts           - Serviço de autenticação

components/dashboard/
├── MasterDashboard.tsx
├── FranqueadoDashboard.tsx
├── InstrutorDashboard.tsx
└── AlunoDashboard.tsx
```

---

## ✅ Checklist de Implementação

- [x] JwtAuthGuard implementado
- [x] LocalAuthGuard implementado  
- [x] JWT Strategy configurada
- [x] AuthContext criado
- [x] authService implementado
- [x] ProtectedRoute component criado
- [x] usePermissions hook criado
- [x] Dashboards específicos por perfil
- [x] Rota de aprovação de usuários (Master only)
- [x] Sistema de perfis e permissões
- [x] Documentação completa
- [x] Arquivos de teste/debug removidos

---

## 🚀 Próximos Passos Sugeridos

1. **Implementar Refresh Token**
   - Adicionar endpoint de refresh
   - Armazenar refresh token em httpOnly cookie
   - Auto-renovação de tokens

2. **Adicionar Rate Limiting**
   - Proteger endpoints de login
   - Prevenir brute force

3. **Implementar 2FA (Autenticação de Dois Fatores)**
   - TOTP via Google Authenticator
   - SMS/Email de verificação

4. **Auditoria de Acesso**
   - Log de todas as ações
   - Histórico de logins
   - Rastreamento de mudanças

5. **Política de Senhas**
   - Complexidade mínima
   - Expiração periódica
   - Histórico de senhas

---

**Última atualização**: 2025-10-05
**Versão**: 1.0.0
