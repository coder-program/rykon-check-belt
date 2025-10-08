# Status do Sistema de Usuários, Perfis e Permissões

## ✅ SIM! Tudo está funcionando e integrado

As tabelas `teamcruz.usuarios`, `teamcruz.perfis`, `teamcruz.perfil_permissoes` e `teamcruz.permissoes` **já estão criadas, funcionando e sendo usadas** tanto no backend quanto no frontend!

---

## 📊 Estrutura das Tabelas

### 1. `teamcruz.usuarios`
```sql
CREATE TABLE teamcruz.usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  nome VARCHAR NOT NULL,
  cpf VARCHAR,
  telefone VARCHAR,
  ativo BOOLEAN DEFAULT true,
  cadastro_completo BOOLEAN DEFAULT false,
  ultimo_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `teamcruz.perfis`
```sql
CREATE TABLE teamcruz.perfis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR UNIQUE NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. `teamcruz.permissoes`
```sql
CREATE TABLE teamcruz.permissoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR UNIQUE NOT NULL,
  nome VARCHAR NOT NULL,
  descricao TEXT,
  tipo_id UUID REFERENCES teamcruz.tipos_permissao(id),
  nivel_id UUID REFERENCES teamcruz.niveis_permissao(id),
  modulo VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. `teamcruz.perfil_permissoes` (Tabela de junção N:N)
```sql
CREATE TABLE teamcruz.perfil_permissoes (
  perfil_id UUID REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
  permissao_id UUID REFERENCES teamcruz.permissoes(id) ON DELETE CASCADE,
  PRIMARY KEY (perfil_id, permissao_id)
);
```

### 5. `teamcruz.usuario_perfis` (Tabela de junção N:N)
```sql
CREATE TABLE teamcruz.usuario_perfis (
  usuario_id UUID REFERENCES teamcruz.usuarios(id) ON DELETE CASCADE,
  perfil_id UUID REFERENCES teamcruz.perfis(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, perfil_id)
);
```

---

## 🔧 Backend - Totalmente Implementado

### Entidades

#### `Usuario` Entity
**Arquivo**: `backend/src/usuarios/entities/usuario.entity.ts`

```typescript
@Entity({ name: 'usuarios', schema: 'teamcruz' })
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  cpf: string;

  @Column({ nullable: true })
  telefone: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ default: false })
  cadastro_completo: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_login: Date;

  // Relacionamento N:N com Perfis
  @ManyToMany(() => Perfil, (perfil) => perfil.usuarios)
  @JoinTable({
    name: 'usuario_perfis',
    joinColumn: { name: 'usuario_id' },
    inverseJoinColumn: { name: 'perfil_id' },
  })
  perfis: Perfil[];
}
```

#### `Perfil` Entity
**Arquivo**: `backend/src/usuarios/entities/perfil.entity.ts`

```typescript
@Entity({ name: 'perfis', schema: 'teamcruz' })
export class Perfil {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao: string;

  @Column({ default: true })
  ativo: boolean;

  // Relacionamento N:N com Permissões
  @ManyToMany(() => Permissao, (permissao) => permissao.perfis)
  @JoinTable({
    name: 'perfil_permissoes',
    joinColumn: { name: 'perfil_id' },
    inverseJoinColumn: { name: 'permissao_id' },
  })
  permissoes: Permissao[];

  // Relacionamento N:N com Usuários
  @ManyToMany(() => Usuario, (usuario) => usuario.perfis)
  usuarios: Usuario[];
}
```

---

### API Endpoints Disponíveis

#### Usuários
- `POST /api/usuarios` - Criar usuário
- `GET /api/usuarios` - Listar todos os usuários
- `GET /api/usuarios/:id` - Buscar usuário por ID
- `GET /api/usuarios/:id/permissions` - Listar permissões do usuário
- `PATCH /api/usuarios/:id` - Atualizar usuário
- `DELETE /api/usuarios/:id` - Remover usuário
- `GET /api/usuarios/pendentes/list` - Listar usuários pendentes de aprovação
- `PATCH /api/usuarios/:id/aprovar` - Aprovar usuário
- `PATCH /api/usuarios/:id/rejeitar` - Rejeitar usuário

#### Perfis
- `POST /api/perfis` - Criar perfil
- `GET /api/perfis` - Listar perfis
- `GET /api/perfis/:id` - Buscar perfil por ID
- `PATCH /api/perfis/:id` - Atualizar perfil
- `DELETE /api/perfis/:id` - Remover perfil

#### Permissões
- `POST /api/permissoes` - Criar permissão
- `GET /api/permissoes` - Listar permissões
- `GET /api/permissoes/:id` - Buscar permissão por ID
- `PATCH /api/permissoes/:id` - Atualizar permissão
- `DELETE /api/permissoes/:id` - Remover permissão

---

### Services Implementados

#### `UsuariosService`
**Arquivo**: `backend/src/usuarios/services/usuarios.service.ts`

**Funcionalidades**:
- ✅ `create()` - Cria usuário com hash de senha e vincula perfis
- ✅ `findAll()` - Lista usuários com perfis e permissões
- ✅ `findOne()` - Busca usuário com perfis e permissões
- ✅ `findByUsername()` - Busca por username ou email
- ✅ `update()` - Atualiza usuário e seus perfis
- ✅ `remove()` - Remove usuário
- ✅ `validatePassword()` - Valida senha com bcrypt
- ✅ `updateUltimoLogin()` - Atualiza data do último login
- ✅ `getUserPermissions()` - Retorna todas as permissões do usuário
- ✅ `findPendingApproval()` - Busca usuários pendentes
- ✅ `approveUser()` - Aprova usuário
- ✅ `rejectUser()` - Rejeita usuário

**Exemplo de Uso**:
```typescript
// Criar usuário com perfis
const usuario = await usuariosService.create({
  nome: 'João Silva',
  email: 'joao@example.com',
  username: 'joao',
  password: '123456',
  perfil_ids: ['perfil-id-1', 'perfil-id-2'], // ← Vincula aos perfis
});

// Buscar usuário com perfis e permissões
const usuario = await usuariosService.findOne('user-id');
// Retorna: { ..., perfis: [{ ..., permissoes: [...] }] }
```

---

## 🎨 Frontend - Totalmente Integrado

### Tela de Registro
**Arquivo**: `frontend/app/register/page.tsx`

**Funcionalidades**:
- ✅ Formulário de cadastro completo
- ✅ Carrega perfis disponíveis via API `GET /perfis`
- ✅ Permite seleção de perfil (Aluno, Professor, Instrutor)
- ✅ Valida dados antes de enviar
- ✅ Envia para `POST /auth/register` incluindo `perfil_id`
- ✅ Feedback visual de erros e sucesso

**Fluxo**:
```typescript
// 1. Carrega perfis disponíveis
const perfis = await getPerfis(); // GET /api/perfis

// 2. Filtra apenas perfis públicos
const perfisPublicos = perfis.filter(p => 
  ['aluno', 'professor', 'instrutor'].includes(p.nome.toLowerCase())
);

// 3. Permite seleção no formulário
<Select value={formData.perfil_id} onChange={...}>
  {perfisPublicos.map(perfil => (
    <SelectItem value={perfil.id}>{perfil.nome}</SelectItem>
  ))}
</Select>

// 4. Envia no registro
await authService.register({
  ...formData,
  perfil_id: formData.perfil_id  // ← Perfil selecionado
});
```

---

### Tela de Gerenciamento de Usuários
**Arquivo**: `frontend/app/usuarios/page.tsx`

Renderiza o componente `<UsuariosManager />` que permite:
- ✅ Listar todos os usuários
- ✅ Criar novos usuários
- ✅ Editar usuários existentes
- ✅ Atribuir/remover perfis
- ✅ Ativar/desativar usuários
- ✅ Visualizar permissões de cada usuário

---

### Tela de Usuários Pendentes
**Arquivo**: `frontend/app/admin/usuarios-pendentes/page.tsx`

**Funcionalidades**:
- ✅ Lista usuários com `cadastro_completo = false`
- ✅ Botão para aprovar usuário → `PATCH /usuarios/:id/aprovar`
- ✅ Botão para rejeitar usuário → `PATCH /usuarios/:id/rejeitar`

---

## 🔐 Autenticação e Autorização

### Como Funciona

1. **Registro**:
   ```
   POST /auth/register
   Body: { nome, email, password, perfil_id }
   ↓
   UsuariosService.create() 
   ↓
   Cria usuário na tabela usuarios
   ↓
   Vincula perfil na tabela usuario_perfis
   ↓
   Perfil traz permissões via perfil_permissoes
   ```

2. **Login**:
   ```
   POST /auth/login
   Body: { username, password }
   ↓
   UsuariosService.findByUsername()
   ↓
   Valida senha com bcrypt
   ↓
   Retorna JWT com perfis e permissões
   ```

3. **Verificação de Permissões**:
   ```typescript
   // No JWT payload
   {
     userId: 'uuid',
     username: 'joao',
     perfis: ['Master', 'Franqueado'],
     permissoes: ['ADMIN_FULL', 'UNIDADES_GERENCIAR', ...]
   }
   ```

---

## 📦 Perfis Pré-Cadastrados

A migration `SeedPerfisPermissoes` cria automaticamente os perfis:

### 1. **Master** (Administrador Total)
- Todas as permissões
- Acesso completo ao sistema

### 2. **Franqueado**
- Gerenciar suas unidades
- Gerenciar alunos
- Visualizar relatórios

### 3. **Instrutor**
- Registrar presenças
- Gerenciar aulas
- Visualizar alunos

### 4. **Aluno**
- Visualizar histórico próprio
- Atualizar dados pessoais

### 5. **Professor**
- Similar a Instrutor
- Pode gerenciar graduações

---

## 🔄 Relacionamentos

```
Usuario 1 ──┬──► N usuario_perfis ◄──┬── N Perfil
            │                        │
            │                        │
            │                        └──► N perfil_permissoes ◄── N Permissao
            │
            └──► 1 Person (tabela pessoas - dados complementares)
```

**Exemplo de Usuário Completo**:
```json
{
  "id": "uuid-1",
  "username": "joao",
  "email": "joao@example.com",
  "nome": "João Silva",
  "cpf": "123.456.789-00",
  "ativo": true,
  "cadastro_completo": true,
  "perfis": [
    {
      "id": "perfil-1",
      "nome": "Instrutor",
      "permissoes": [
        {
          "codigo": "PRESENCAS_REGISTRAR",
          "nome": "Registrar Presenças"
        },
        {
          "codigo": "AULAS_GERENCIAR",
          "nome": "Gerenciar Aulas"
        }
      ]
    }
  ]
}
```

---

## ✅ Checklist Completo

### Backend
- ✅ Tabelas criadas via migrations
- ✅ Entidades TypeORM configuradas
- ✅ Relacionamentos N:N funcionando
- ✅ Services completos (CRUD + extras)
- ✅ Controllers com endpoints REST
- ✅ Validações e tratamento de erros
- ✅ Hash de senhas com bcrypt
- ✅ Seeds de perfis e permissões

### Frontend
- ✅ Tela de registro integrada
- ✅ Seleção de perfil no cadastro
- ✅ Gerenciamento de usuários
- ✅ Aprovação de cadastros pendentes
- ✅ Visualização de permissões
- ✅ Feedback de erros e sucessos

### Integração
- ✅ API comunicando com banco corretamente
- ✅ Frontend consumindo endpoints
- ✅ Perfis sendo vinculados no cadastro
- ✅ Permissões sendo carregadas no login
- ✅ Guards de autenticação funcionando

---

## 🎯 Conclusão

**SIM!** O sistema de usuários, perfis e permissões está **100% funcional e integrado**:

1. ✅ Tabelas existem e estão sendo usadas
2. ✅ Backend grava em todas as tabelas
3. ✅ Frontend consome e exibe os dados
4. ✅ Relacionamentos N:N funcionam perfeitamente
5. ✅ Permissões são herdadas corretamente dos perfis
6. ✅ Sistema de aprovação de usuários implementado

**O sistema está pronto para produção!** 🚀
