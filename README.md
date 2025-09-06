# 👥 Sistema Base de Autenticação e Gerenciamento de Usuários

Sistema base desenvolvido com **NestJS** (backend) e **React** (frontend) para autenticação JWT e gerenciamento completo de usuários, perfis e permissões. Projetado para ser **reutilizado como fundação** em outros projetos.

## ✨ Características

- 🔐 **Autenticação JWT** completa com refresh tokens
- 👤 **Gestão de Usuários** com perfis e permissões granulares
- 🔒 **Sistema de Permissões** baseado em roles e perfis
- 📋 **Auditoria** completa de todas as ações
- 🔑 **Reset de Senha** via email (estrutura implementada)
- 🛡️ **Guards e Decorators** para proteção de rotas
- 🏗️ **Arquitetura modular** facilmente extensível

## 🚀 Módulos Implementados

### ✅ **Módulos Essenciais**

- **🔐 Auth** - Autenticação JWT, login, logout, refresh tokens
- **👥 Usuários** - CRUD completo de usuários
- **🎭 Perfis** - Gestão de perfis/roles
- **🔑 Permissões** - Sistema granular de permissões
- **📋 Auditoria** - Logs de todas as ações do sistema
- **🔒 Reset de Senha** - Fluxo completo de recuperação de senha

## 🛠️ Tecnologias

### **Backend (NestJS)**

- **Framework:** NestJS + TypeScript
- **Banco de Dados:** PostgreSQL + TypeORM
- **Autenticação:** JWT + Passport (Local & JWT Strategies)
- **Validação:** Class Validator + Class Transformer
- **Hash:** bcrypt para senhas
- **UUID:** Para IDs únicos
- **Middleware:** Auditoria automática

### **Frontend (React)**

- **Framework:** React + JavaScript
- **Roteamento:** React Router
- **Estado:** Context API
- **Estilização:** CSS Modules
- **HTTP:** Axios
- **Testes:** React Testing Library

### **Segurança**

- **JWT Tokens** com expiração configurável
- **Password Hashing** com bcrypt
- **Guards** para proteção de rotas
- **Decorators** para permissões
- **Rate Limiting** (estrutura preparada)
- **CORS** configurado

## 🏗️ Estrutura do Projeto

```
acesso-perfil-usuarios/
├── backend/                    # API NestJS
│   ├── src/
│   │   ├── auth/              # Módulo de Autenticação
│   │   │   ├── dto/           # DTOs para auth
│   │   │   ├── entities/      # Entidades (PasswordReset)
│   │   │   ├── guards/        # Guards JWT e Local
│   │   │   ├── strategies/    # Strategies Passport
│   │   │   ├── decorators/    # Decorators customizados
│   │   │   └── auth.service.ts # Lógica de autenticação
│   │   ├── usuarios/          # Módulo de Usuários
│   │   │   ├── controllers/   # Controllers REST
│   │   │   ├── dto/          # DTOs de usuários
│   │   │   ├── entities/     # User, Profile, Permission
│   │   │   └── services/     # Lógica de negócio
│   │   ├── audit/            # Módulo de Auditoria
│   │   │   ├── entities/     # AuditLog entity
│   │   │   ├── middleware/   # Middleware de auditoria
│   │   │   └── audit.service.ts # Serviço de auditoria
│   │   ├── app.module.ts     # Módulo principal
│   │   └── main.ts           # Entry point
│   └── README.md             # Documentação do backend
├── frontend/                  # Interface React
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── contexts/         # Context API
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── services/        # Serviços de API
│   │   └── App.js           # Componente principal
│   └── README.md            # Documentação do frontend
├── package.json             # Scripts do projeto
└── README.md               # Esta documentação
```

## 🚀 Como Usar Este Projeto Base

### **1. Instalação Completa**

```bash
# Clonar este repositório
git clone <este-repositorio>
cd acesso-perfil-usuarios

# Instalar todas as dependências
npm run install:all
```

### **2. Configuração do Backend**

```bash
# Navegar para o backend
cd backend

# Configurar ambiente
cp env.example .env

# Editar .env com suas configurações
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=sua_senha
DB_NAME=acesso_perfil_usuarios
JWT_SECRET=seu-jwt-secret-muito-forte
```

### **3. Configuração do Frontend**

```bash
# Navegar para o frontend
cd frontend

# Editar .env
REACT_APP_API_URL=http://localhost:3001
```

### **4. Executar o Projeto**

```bash
# Backend (Terminal 1)
npm run dev:backend

# Frontend (Terminal 2)
npm run dev:frontend

# Popular dados iniciais (Terminal 3)
npm run seed
```

### **5. Acessar o Sistema**

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **Credenciais:** `admin` / `admin123`

## 📡 Endpoints Disponíveis

### **Autenticação** (`/auth`)

```bash
# Login
POST /auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Perfil do usuário logado
GET /auth/profile
# Headers: Authorization: Bearer <jwt_token>

# Refresh token
POST /auth/refresh

# Alterar senha
POST /auth/change-password
{
  "currentPassword": "senha_atual",
  "newPassword": "nova_senha"
}

# Esqueci minha senha
POST /auth/forgot-password
{
  "email": "usuario@email.com"
}

# Reset de senha
POST /auth/reset-password
{
  "token": "token_recebido_por_email",
  "newPassword": "nova_senha"
}
```

### **Usuários** (`/usuarios`)

```bash
# Listar usuários
GET /usuarios

# Criar usuário
POST /usuarios
{
  "username": "novo_usuario",
  "email": "usuario@email.com",
  "password": "senha123",
  "nome": "Nome Completo",
  "cpf": "12345678901",
  "telefone": "11999999999"
}

# Buscar, atualizar e deletar
GET /usuarios/:id
PUT /usuarios/:id
DELETE /usuarios/:id
```

### **Perfis e Permissões**

- `GET /perfis` - Listar perfis
- `POST /perfis` - Criar perfil
- `GET /permissoes` - Listar permissões
- `POST /permissoes` - Criar permissão

### **Auditoria**

- `GET /audit/logs` - Logs de auditoria

## 🔒 Sistema de Permissões

### **Como Usar Guards**

```typescript
// Proteger rota com JWT
@UseGuards(JwtAuthGuard)
@Get('protected')
getProtectedRoute() {
  return 'Rota protegida';
}

// Proteger com permissões específicas
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('usuarios.create')
@Post('usuarios')
createUser() {
  return 'Só usuários com permissão podem criar';
}
```

### **Decorator de Usuário Atual**

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: Usuario) {
  return user; // Usuário já injetado
}
```

## 🚀 Como Estender Este Projeto

### **1. Adicionar Novos Módulos (Backend)**

```bash
# Criar novo módulo
nest g module meu-modulo
nest g controller meu-modulo
nest g service meu-modulo

# Criar entidade
nest g class meu-modulo/entities/minha-entidade.entity --no-spec
```

### **2. Estrutura Recomendada para Novos Módulos**

```
meu-modulo/
├── dto/                    # Data Transfer Objects
├── entities/              # Entidades TypeORM
├── services/              # Lógica de negócio
├── controllers/           # Endpoints REST
└── meu-modulo.module.ts   # Definição do módulo
```

### **3. Integrar com Sistema de Permissões**

```typescript
// No seu novo controller
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions('meu-modulo.create')
@Post()
create(@Body() createDto: CreateDto) {
  return this.service.create(createDto);
}
```

### **4. Adicionar Nova Página (Frontend)**

```javascript
// 1. Criar componente
const MinhaNovaPage = () => {
  return <div>Minha Nova Página</div>;
};

// 2. Adicionar rota no App.js
<Route
  path="/minha-pagina"
  element={
    <ProtectedRoute>
      <MinhaNovaPage />
    </ProtectedRoute>
  }
/>;
```

## 💡 Recursos Implementados

- ✅ **Autenticação JWT** completa
- ✅ **CRUD de Usuários** com validações
- ✅ **Sistema de Perfis** e Permissões
- ✅ **Auditoria** de todas as ações
- ✅ **Reset de Senha** (estrutura completa)
- ✅ **Guards** e **Decorators** prontos
- ✅ **TypeORM** configurado
- ✅ **Validações** com class-validator
- ✅ **UUIDs** para todos os IDs
- ✅ **Timestamps** automáticos
- ✅ **Interface React** responsiva
- ✅ **Context API** para estado global
- ✅ **Rotas protegidas** no frontend

## 🎯 Melhorias Futuras

- [ ] Integração com serviço de email
- [ ] Rate limiting
- [ ] Documentação Swagger
- [ ] Testes automatizados
- [ ] Docker containerização
- [ ] CI/CD pipeline

## 🤝 Como Contribuir

Este projeto foi criado para ser uma base sólida para sistemas de autenticação. Sinta-se livre para:

- Fazer fork do projeto
- Criar issues para melhorias
- Submeter pull requests
- Usar como base para seus projetos

## 📝 Scripts Disponíveis

### **Projeto Completo**

```bash
npm run install:all     # Instalar todas as dependências
npm run dev:backend     # Executar backend em desenvolvimento
npm run dev:frontend    # Executar frontend em desenvolvimento
npm run build:backend   # Build do backend
npm run build:frontend  # Build do frontend
npm run seed           # Popular dados iniciais
```

### **Backend**

```bash
npm run start:dev      # Desenvolvimento com watch
npm run build         # Build para produção
npm run start:prod    # Executar produção
npm run seed          # Popular dados iniciais
npm test              # Testes unitários
```

### **Frontend**

```bash
npm start             # Desenvolvimento
npm run build         # Build para produção
npm test              # Testes
```

## 📄 Licença

MIT License - Livre para uso em projetos públicos e privados.

## ❤️ Créditos

Desenvolvido como base reutilizável para sistemas de autenticação e gestão de usuários.

---

**📞 Precisa de ajuda?** Abra uma issue no GitHub!

**🚀 Quer contribuir?** Faça um fork e submeta um PR!

---

> **Este é um projeto base!** Use-o como fundação para construir sistemas mais complexos. Toda a estrutura de autenticação, permissões e auditoria já está implementada e testada.
