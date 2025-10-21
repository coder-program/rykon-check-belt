# Sistema de Histórico de Competições

## 📋 Resumo

Implementado sistema completo para gerenciar e exibir o histórico de participações em competições/campeonatos de Jiu-Jitsu dos alunos.

## 🗄️ Estrutura do Banco de Dados

### Tabela: `teamcruz.competicoes`

Armazena informações sobre competições/campeonatos:

```sql
- id (UUID)
- nome (VARCHAR 255) - Nome da competição
- descricao (TEXT) - Descrição detalhada
- organizador (VARCHAR 255) - Quem organiza
- tipo (ENUM) - LOCAL, REGIONAL, ESTADUAL, NACIONAL, INTERNACIONAL, INTERNO
- modalidade (ENUM) - GI, NO_GI, AMBOS
- data_inicio (DATE)
- data_fim (DATE)
- local (VARCHAR 255)
- cidade (VARCHAR 100)
- estado (VARCHAR 2)
- pais (VARCHAR 50)
- site_url (VARCHAR 500)
- regulamento_url (VARCHAR 500)
- valor_inscricao (DECIMAL 10,2)
- status (ENUM) - AGENDADA, EM_ANDAMENTO, FINALIZADA, CANCELADA
- ativo (BOOLEAN)
- created_at, updated_at, created_by, updated_by
```

### Tabela: `teamcruz.aluno_competicoes`

Registra participações e resultados dos alunos:

```sql
- id (UUID)
- aluno_id (UUID) - FK para alunos
- competicao_id (UUID) - FK para competicoes
- categoria_peso (VARCHAR 50) - ex: Leve, Médio, Pesado
- categoria_idade (VARCHAR 50) - ex: Juvenil, Adulto, Master
- categoria_faixa (VARCHAR 50) - Faixa competida
- colocacao (INTEGER) - Posição final (1, 2, 3, etc)
- posicao (ENUM) - OURO, PRATA, BRONZE, PARTICIPOU, DESCLASSIFICADO
- total_lutas (INTEGER)
- vitorias (INTEGER)
- derrotas (INTEGER)
- observacoes (TEXT)
- peso_pesagem (DECIMAL 5,2)
- tempo_total_lutas (VARCHAR 20)
- premiacao_valor (DECIMAL 10,2)
- premiacao_descricao (VARCHAR 255)
- certificado_url (VARCHAR 500)
- foto_premiacao_url (VARCHAR 500)
- video_url (VARCHAR 500)
- created_at, updated_at, created_by, updated_by
```

### Índices Criados

- `idx_competicoes_data_inicio` - Busca por data
- `idx_competicoes_tipo` - Filtro por tipo
- `idx_competicoes_status` - Filtro por status
- `idx_aluno_competicoes_aluno` - Busca por aluno
- `idx_aluno_competicoes_posicao` - Filtro por posição

## 🔧 Backend

### Entidades TypeORM

#### `Competicao` Entity

- Mapeamento completo da tabela
- Enums: `TipoCompeticao`, `ModalidadeCompeticao`, `StatusCompeticao`
- Métodos auxiliares:
  - `isAberta()` - Verifica se está aberta
  - `isFinalizada()` - Verifica se finalizou
  - `getDataFormatada()` - Formata data em pt-BR

#### `AlunoCompeticao` Entity

- Mapeamento completo da tabela
- Enum: `PosicaoCompeticao`
- Relacionamentos: `Aluno`, `Competicao`
- Métodos auxiliares:
  - `isPodio()` - Verifica se ficou no pódio
  - `getMedalhaCor()` - Retorna cor da medalha (hex)
  - `getMedalhaEmoji()` - Retorna emoji da medalha
  - `getAproveitamento()` - Calcula % de vitórias

### Módulo `CompeticoesModule`

- Registra entidades
- Exporta serviço para uso em outros módulos

### Serviço `CompeticoesService`

Métodos implementados:

**Competições:**

- `listarCompetições(filtros)` - Lista com filtros
- `buscarCompeticao(id)` - Busca por ID
- `criarCompeticao(data, userId)` - Cria nova
- `atualizarCompeticao(id, data, userId)` - Atualiza
- `deletarCompeticao(id)` - Desativa

**Participações:**

- `buscarHistoricoAluno(alunoId)` - Histórico + estatísticas
- `meuHistoricoCompeticoes(userId)` - Histórico do usuário logado
- `registrarParticipacao(data, userId)` - Registra resultado
- `atualizarParticipacao(id, data, userId)` - Atualiza
- `deletarParticipacao(id)` - Remove

**Estatísticas calculadas:**

- Total de competições
- Total de ouros, pratas, bronzes
- Total de pódios
- Total de lutas, vitórias, derrotas
- Aproveitamento geral (%)

### Controller `CompeticoesController`

Endpoints criados:

```typescript
GET    /competicoes                      - Listar competições
GET    /competicoes/:id                  - Buscar competição
POST   /competicoes                      - Criar competição
PUT    /competicoes/:id                  - Atualizar competição
DELETE /competicoes/:id                  - Deletar competição

GET    /competicoes/aluno/:alunoId/historico - Histórico do aluno
GET    /competicoes/meu-historico            - Meu histórico
POST   /competicoes/participacao             - Registrar participação
PUT    /competicoes/participacao/:id         - Atualizar participação
DELETE /competicoes/participacao/:id         - Deletar participação
```

## 🎨 Frontend

### Dashboard do Aluno

#### Novas Interfaces TypeScript

```typescript
interface HistoricoCompeticao {
  id: string;
  competicao: {
    nome: string;
    tipo: string;
    data: string;
    local: string;
    cidade: string;
  };
  posicao: string;
  categoria_peso: string;
  categoria_faixa: string;
  medalha_emoji: string;
  total_lutas: number;
  vitorias: number;
  derrotas: number;
  aproveitamento: number;
}

interface EstatisticasCompeticoes {
  totalCompeticoes: number;
  totalOuros: number;
  totalPratas: number;
  totalBronzes: number;
  totalPodios: number;
  totalLutas: number;
  totalVitorias: number;
  totalDerrotas: number;
  aproveitamento: number;
}
```

#### Novos Estados

```typescript
const [historicoCompeticoes, setHistoricoCompeticoes] = useState<
  HistoricoCompeticao[]
>([]);
const [estatisticasCompeticoes, setEstatisticasCompeticoes] =
  useState<EstatisticasCompeticoes | null>(null);
```

#### Carregamento de Dados

Adicionado na `Promise.allSettled`:

```typescript
http("/competicoes/meu-historico", { auth: true });
```

#### Nova Seção: "Histórico de Competições"

Substituiu "Conquistas Recentes" por:

**Header:**

- Ícone de troféu
- Estatísticas resumidas: `X 🥇 | Y 🥈 | Z 🥉 - W% de aproveitamento`

**Lista de Competições (últimas 5):**

- Emoji da medalha (🥇🥈🥉🎖️)
- Nome da competição
- Tipo e categoria (peso + faixa)
- Data e cidade
- Estatísticas: Vitórias/Derrotas e aproveitamento
- Cor da posição (dourado/prata/bronze)

**Estado Vazio:**

- Ícone de troféu grande
- Mensagem motivacional
- Botão para ver competições disponíveis

**Ver Mais:**

- Botão para ver histórico completo (se > 5 competições)

### Design Visual

```
┌────────────────────────────────────────────────────┐
│ 🏆 Histórico de Competições                        │
│ 3 🥇 | 2 🥈 | 1 🥉 - 85% de aproveitamento         │
├────────────────────────────────────────────────────┤
│ 🥇  Campeonato Estadual 2025                 OURO  │
│     ESTADUAL - Médio (AZUL)                        │
│     15/10/2025 • São Paulo                         │
│     5V / 1D - 83% de aproveitamento                │
├────────────────────────────────────────────────────┤
│ 🥈  Copa TeamCruz 2025                      PRATA  │
│     INTERNO - Leve (AZUL)                          │
│     01/10/2025 • São Paulo                         │
│     3V / 2D - 60% de aproveitamento                │
└────────────────────────────────────────────────────┘
     [Ver todas (6 competições)]
```

## 📦 Arquivos Criados

### Backend

1. `backend/create-competicoes-table.sql` - Script SQL de criação
2. `backend/src/competicoes/entities/competicao.entity.ts` - Entidade Competição
3. `backend/src/competicoes/entities/aluno-competicao.entity.ts` - Entidade Participação
4. `backend/src/competicoes/competicoes.module.ts` - Módulo
5. `backend/src/competicoes/competicoes.service.ts` - Serviço
6. `backend/src/competicoes/competicoes.controller.ts` - Controller

### Atualizados

7. `backend/src/app.module.ts` - Registro do CompeticoesModule
8. `frontend/components/dashboard/AlunoDashboard.tsx` - Exibição do histórico

## 🚀 Instalação

### 1. Criar Tabelas no Banco

```bash
cd backend
psql -h 200.98.72.161 -U teamcruz_app -d teamcruz_db -f create-competicoes-table.sql
```

### 2. Reiniciar Backend

```bash
cd backend
npm run start:dev
```

### 3. Reiniciar Frontend

```bash
cd frontend
npm run dev
```

## 🧪 Como Testar

### 1. Cadastrar uma Competição (Admin)

```bash
POST http://localhost:4000/competicoes
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "nome": "Copa TeamCruz 2025",
  "tipo": "INTERNO",
  "modalidade": "GI",
  "data_inicio": "2025-11-15",
  "local": "Academia TeamCruz",
  "cidade": "São Paulo",
  "estado": "SP",
  "status": "FINALIZADA"
}
```

### 2. Registrar Participação

```bash
POST http://localhost:4000/competicoes/participacao
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "aluno_id": "UUID_DO_ALUNO",
  "competicao_id": "UUID_DA_COMPETICAO",
  "categoria_peso": "Médio",
  "categoria_faixa": "AZUL",
  "posicao": "OURO",
  "colocacao": 1,
  "total_lutas": 5,
  "vitorias": 5,
  "derrotas": 0
}
```

### 3. Ver no Dashboard

```
1. Login como aluno
2. Acessar http://localhost:3000/dashboard
3. Rolar até "Histórico de Competições"
4. Verificar medalhas e estatísticas
```

## 📊 Casos de Uso

### Para Alunos:

- Visualizar histórico completo de competições
- Ver estatísticas de desempenho
- Acompanhar evolução competitiva
- Motivação através de conquistas visíveis

### Para Professores/Admins:

- Registrar resultados de competições
- Acompanhar performance dos alunos
- Gerenciar competições internas
- Incentivar participação em campeonatos

### Para Franqueados:

- Dashboard com estatísticas da unidade
- Comparar performance entre alunos
- Promover cultura competitiva
- Valorizar conquistas dos alunos

## 🎯 Próximos Passos

### Curto Prazo

- [ ] Interface de cadastro/edição de competições
- [ ] Upload de certificados e fotos
- [ ] Notificações de novas competições
- [ ] Filtros de busca no histórico

### Médio Prazo

- [ ] Galeria de fotos de pódios
- [ ] Vídeos de lutas
- [ ] Comparação com outros alunos
- [ ] Badges por conquistas

### Longo Prazo

- [ ] Integração com APIs de competições (IBJJF, AJP, etc)
- [ ] Sistema de inscrição online
- [ ] Pagamento de inscrições
- [ ] Certificados automáticos

## 🏆 Benefícios

✅ **Motivação:** Alunos visualizam suas conquistas
✅ **Transparência:** Histórico completo acessível
✅ **Organização:** Dados centralizados
✅ **Estatísticas:** Métricas de performance
✅ **Marketing:** Divulgar conquistas da unidade
✅ **Gestão:** Acompanhar evolução competitiva

---

**Status:** ✅ Implementado e Pronto para Uso
**Data:** 20/10/2025
**Versão:** 1.0.0
