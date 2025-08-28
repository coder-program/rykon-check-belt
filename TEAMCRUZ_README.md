# 🥋 TeamCruz Jiu-Jitsu - Sistema de Controle de Presença e Graduação

![TeamCruz Logo](https://img.shields.io/badge/TeamCruz-Jiu--Jitsu-red?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAyMnM4LTQgOC0xMFY1bC04LTMtOCAzdjdjMCA2IDggMTAgOCAxMHoiLz48L3N2Zz4=)
![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/status-MVP-yellow?style=for-the-badge)

## 🎯 Visão Geral

Sistema moderno e completo para gestão de academias de Jiu-Jitsu, com foco em controle de presença e progressão automática de graduações (graus/faixas).

### ⭐ Principais Funcionalidades

- **Check-in Inteligente** 📱
  - QR Code
  - Lista Manual
  - Modo Totem (auto check-in)
  
- **Graduação Automática** 🏆
  - 1 grau a cada 20 aulas (configurável)
  - Máximo 4 graus por faixa
  - Notificações automáticas de progresso

- **Dashboard Completo** 📊
  - Estatísticas em tempo real
  - Ranking de assiduidade
  - Próximos graduáveis
  - Aulas do dia

## 🚀 Como Acessar

### 1. Iniciar o Sistema

```bash
# Subir o banco de dados TeamCruz
docker-compose up teamcruz-db -d

# Iniciar o backend (em uma aba do terminal)
cd backend
npm run start:dev

# Iniciar o frontend (em outra aba)
cd frontend
npm start
```

### 2. URLs de Acesso

- **Dashboard TeamCruz**: http://localhost:3001/teamcruz
- **Sistema Check-in**: http://localhost:3001/teamcruz/checkin
- **Banco de Dados**: PostgreSQL porta `5433`
- **PgAdmin**: http://localhost:5050 (admin@teamcruz.com / admin123)

## 🏗️ Arquitetura

```
teamcruz-jiujitsu/
├── backend/
│   └── src/
│       └── teamcruz/         # Módulos do TeamCruz
│           ├── alunos/       # Gestão de alunos
│           ├── instrutores/  # Gestão de instrutores
│           ├── turmas/       # Gestão de turmas
│           ├── aulas/        # Controle de aulas
│           ├── presencas/    # Sistema de presença
│           ├── graduacoes/   # Sistema de graduação
│           ├── checkin/      # APIs de check-in
│           ├── dashboard/    # APIs do dashboard
│           └── config/       # Configurações
│
├── frontend/
│   └── src/
│       └── pages/
│           └── teamcruz/     # Páginas do TeamCruz
│               ├── Dashboard.jsx
│               └── CheckIn.jsx
│
└── database/
    └── init.sql              # Schema completo do banco
```

## 🎨 Design System

### Cores das Faixas
- **Branca**: `#FFFFFF`
- **Cinza**: `#808080`
- **Amarela**: `#FFD700`
- **Laranja**: `#FFA500`
- **Verde**: `#008000`
- **Azul**: `#0000FF`
- **Roxa**: `#800080`
- **Marrom**: `#8B4513`
- **Preta**: `#000000`
- **Coral**: `#FF7F50` (Mestres)
- **Vermelha**: `#FF0000` (Grão-Mestre)

### Tema Visual
- **Dark Mode**: Interface escura moderna
- **Cor Principal**: Vermelho (`#DC2626`)
- **Animações**: Framer Motion
- **Ícones**: Heroicons + Lucide React

## 📊 Regras de Negócio

### Progressão de Graus
1. **20 presenças** = 1 grau (configurável)
2. **Máximo 4 graus** por faixa
3. Ao atingir 4 graus → Elegível para promoção de faixa
4. Promoção de faixa é **manual** (decisão do instrutor)

### Check-in
- **Tolerância**: 15 minutos após início da aula
- **Validação**: Aluno ativo + turma correta
- **Prevenção**: Sem duplicidade no mesmo horário

## 🛠️ Stack Tecnológica

### Backend
- **NestJS** (Node.js framework)
- **TypeORM** (ORM)
- **PostgreSQL** (Banco de dados)
- **JWT** (Autenticação)
- **Clean Architecture** + SOLID

### Frontend
- **React 18**
- **Tailwind CSS** (Estilização)
- **Framer Motion** (Animações)
- **Chart.js** (Gráficos)
- **React Hook Form** (Formulários)
- **Date-fns** (Manipulação de datas)

## 📦 Instalação Completa

### Pré-requisitos
- Node.js 18+
- Docker & Docker Compose
- NPM ou Yarn

### Passo a Passo

1. **Clonar o repositório**
```bash
git clone [seu-repo]
cd rykon-check-belt
```

2. **Instalar dependências do Backend**
```bash
cd backend
npm install
```

3. **Instalar dependências do Frontend**
```bash
cd ../frontend
npm install --legacy-peer-deps
```

4. **Configurar variáveis de ambiente**
```bash
# backend/.env
TEAMCRUZ_DB_HOST=localhost
TEAMCRUZ_DB_PORT=5433
TEAMCRUZ_DB_USER=teamcruz_admin
TEAMCRUZ_DB_PASSWORD=cruz@jiujitsu2024
TEAMCRUZ_DB_NAME=teamcruz_db
```

5. **Iniciar o banco de dados**
```bash
docker-compose up teamcruz-db -d
```

6. **Iniciar o sistema**
```bash
# Terminal 1 - Backend
cd backend && npm run start:dev

# Terminal 2 - Frontend
cd frontend && npm start
```

## 🔐 Credenciais de Acesso

### Banco de Dados
- **Host**: localhost
- **Porta**: 5433
- **Database**: teamcruz_db
- **Usuário**: teamcruz_admin
- **Senha**: cruz@jiujitsu2024

### PgAdmin
- **Email**: admin@teamcruz.com
- **Senha**: admin123

## 📱 Funcionalidades Implementadas

### ✅ MVP Completo
- [x] Dashboard principal com estatísticas
- [x] Sistema de check-in (3 modos)
- [x] Visualização de próximos graduáveis
- [x] Ranking de assiduidade
- [x] Controle de aulas do dia
- [x] Interface dark mode moderna
- [x] Animações fluidas
- [x] Design responsivo

### 🚧 Em Desenvolvimento
- [ ] API REST completa
- [ ] Integração com câmera para QR
- [ ] Sistema de notificações push
- [ ] Relatórios detalhados
- [ ] App mobile PWA
- [ ] Certificados digitais

## 📈 Roadmap

### Fase 1 - MVP (Atual) ✅
- Interface principal
- Sistema de check-in
- Dashboard com métricas
- Banco de dados estruturado

### Fase 2 - Integração
- APIs REST completas
- Autenticação JWT
- Conexão frontend/backend
- Validações e regras de negócio

### Fase 3 - Funcionalidades Avançadas
- App mobile PWA
- Notificações push/email
- Relatórios PDF
- Integrações (pagamento, CRM)

### Fase 4 - Escala
- Multi-unidade
- Eventos de graduação
- Campeonatos
- Analytics avançado

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é propriedade da **TeamCruz Jiu-Jitsu**.

## 👥 Time

- **Carlos Cruz** - Fundador/Professor
- **Equipe de Desenvolvimento** - Sistema

## 📞 Contato

- **Email**: contato@teamcruz.com.br
- **Tel**: (11) 98765-4321
- **Instagram**: @teamcruzjiujitsu

---

<div align="center">
  <strong>🥋 OSS! 🥋</strong>
  <br>
  <em>Desenvolvido com ❤️ para a família TeamCruz</em>
</div>
