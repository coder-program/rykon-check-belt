# Sistema de Modalidades - Separação por Arte Marcial

**Data:** 2024-11-09
**Status:** ✅ Backend Implementado | 🔄 Frontend Pendente

## 📋 Visão Geral

Sistema para separar alunos por modalidade (Jiu-Jitsu, Muay Thai, MMA, Boxe, etc.), facilitando:

- ✅ Controle de faturamento por modalidade
- ✅ Gestão independente de cada arte marcial
- ✅ Relatórios e estatísticas segmentados
- ✅ Valores de mensalidade diferenciados

---

## 🎯 Problema Resolvido

### Situação Anterior:

- Todos os alunos misturados sem distinção de modalidade
- Difícil controlar faturamento específico de Jiu-Jitsu vs Muay Thai
- Impossível filtrar alunos por arte marcial
- Sem controle de valores diferenciados por modalidade

### Solução Implementada:

- ✅ Tabela `modalidades` com cadastro de artes marciais
- ✅ Campo `modalidade_id` na tabela `alunos`
- ✅ CRUD completo de modalidades no backend
- ✅ Relacionamento Many-to-One (Aluno → Modalidade)
- ✅ Valores de mensalidade específicos por modalidade
- ✅ Filtros e relatórios por modalidade

---

## 🗄️ Estrutura de Banco de Dados

### Tabela: `modalidades`

```sql
CREATE TABLE teamcruz.modalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,          -- Jiu-Jitsu, Muay Thai, etc.
  descricao TEXT,                              -- Descrição detalhada
  valor_mensalidade DECIMAL(10, 2),           -- Valor padrão (R$ 250,00)
  ativo BOOLEAN DEFAULT TRUE,                  -- Modalidade ativa/inativa
  cor VARCHAR(7),                              -- Código hex (#1E3A8A)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modalidades Pré-cadastradas:

| Nome           | Descrição                                 | Valor     | Cor                |
| -------------- | ----------------------------------------- | --------- | ------------------ |
| **Jiu-Jitsu**  | Brazilian Jiu-Jitsu - Técnicas de solo    | R$ 250,00 | #1E3A8A (Azul)     |
| **Muay Thai**  | Boxe tailandês - Socos, chutes, joelhadas | R$ 220,00 | #DC2626 (Vermelho) |
| **MMA**        | Artes marciais mistas                     | R$ 280,00 | #7C3AED (Roxo)     |
| **Boxe**       | Boxe tradicional                          | R$ 200,00 | #EA580C (Laranja)  |
| **Wrestling**  | Luta olímpica                             | R$ 230,00 | #059669 (Verde)    |
| **Kickboxing** | Boxe + Chutes                             | R$ 210,00 | #D97706 (Amarelo)  |

### Atualização na Tabela `alunos`:

```sql
ALTER TABLE teamcruz.alunos
ADD COLUMN modalidade_id UUID;

ALTER TABLE teamcruz.alunos
ADD CONSTRAINT fk_alunos_modalidade
FOREIGN KEY (modalidade_id)
REFERENCES teamcruz.modalidades(id)
ON DELETE SET NULL;
```

---

## 🔧 Backend - API Implementada

### Entity: `Modalidade`

**Arquivo:** `backend/src/modalidades/entities/modalidade.entity.ts`

```typescript
@Entity({ name: "modalidades", schema: "teamcruz" })
export class Modalidade {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100, unique: true })
  nome: string;

  @Column({ type: "text", nullable: true })
  descricao: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  valor_mensalidade: number;

  @Column({ type: "boolean", default: true })
  ativo: boolean;

  @Column({ type: "varchar", length: 7, nullable: true })
  cor: string; // #FF5733

  @OneToMany(() => Aluno, (aluno) => aluno.modalidade)
  alunos: Aluno[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### Entity: `Aluno` (Atualizada)

**Arquivo:** `backend/src/people/entities/aluno.entity.ts`

```typescript
@ManyToOne(() => Modalidade, (modalidade) => modalidade.alunos, {
  eager: false,
  nullable: true,
})
@JoinColumn({ name: 'modalidade_id' })
modalidade: Modalidade;
```

### Endpoints Disponíveis:

#### 1. **GET /modalidades**

Lista todas as modalidades

**Query Params:**

- `apenasAtivas=true` - Filtra apenas modalidades ativas

**Response:**

```json
[
  {
    "id": "uuid",
    "nome": "Jiu-Jitsu",
    "descricao": "Brazilian Jiu-Jitsu...",
    "valor_mensalidade": 250.0,
    "ativo": true,
    "cor": "#1E3A8A",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

#### 2. **GET /modalidades/:id**

Busca modalidade por ID

#### 3. **GET /modalidades/:id/estatisticas**

Estatísticas da modalidade

**Response:**

```json
{
  "modalidade": {
    "id": "uuid",
    "nome": "Jiu-Jitsu",
    "cor": "#1E3A8A",
    "valor_mensalidade": 250.0
  },
  "totalAlunos": 45,
  "faturamentoPotencial": 11250.0
}
```

#### 4. **POST /modalidades**

Criar nova modalidade

**Body:**

```json
{
  "nome": "Capoeira",
  "descricao": "Arte marcial brasileira",
  "valor_mensalidade": 180.0,
  "cor": "#FCD34D",
  "ativo": true
}
```

#### 5. **PATCH /modalidades/:id**

Atualizar modalidade

#### 6. **PATCH /modalidades/:id/ativar**

Ativar modalidade

#### 7. **PATCH /modalidades/:id/desativar**

Desativar modalidade

#### 8. **DELETE /modalidades/:id**

Deletar modalidade

---

## 📊 Queries Úteis

### 1. Contar Alunos por Modalidade

```sql
SELECT
  m.nome AS modalidade,
  m.cor,
  COUNT(a.id) AS total_alunos,
  SUM(m.valor_mensalidade) AS faturamento_potencial
FROM teamcruz.modalidades m
LEFT JOIN teamcruz.alunos a ON m.id = a.modalidade_id AND a.ativo = TRUE
GROUP BY m.id, m.nome, m.cor, m.valor_mensalidade
ORDER BY total_alunos DESC;
```

### 2. Faturamento por Modalidade e Unidade

```sql
SELECT
  u.nome AS unidade,
  m.nome AS modalidade,
  COUNT(a.id) AS total_alunos,
  m.valor_mensalidade,
  (COUNT(a.id) * m.valor_mensalidade) AS faturamento_mensal
FROM teamcruz.alunos a
INNER JOIN teamcruz.modalidades m ON a.modalidade_id = m.id
INNER JOIN teamcruz.unidades u ON a.unidade_id = u.id
WHERE a.ativo = TRUE
GROUP BY u.id, u.nome, m.id, m.nome, m.valor_mensalidade
ORDER BY u.nome, faturamento_mensal DESC;
```

### 3. Comparar Jiu-Jitsu vs Muay Thai

```sql
SELECT
  m.nome AS modalidade,
  COUNT(a.id) AS total_alunos,
  AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.data_nascimento))) AS idade_media
FROM teamcruz.alunos a
INNER JOIN teamcruz.modalidades m ON a.modalidade_id = m.id
WHERE a.ativo = TRUE
  AND m.nome IN ('Jiu-Jitsu', 'Muay Thai')
GROUP BY m.nome;
```

---

## 🎨 Frontend - A Implementar

### 1. Página de Gestão de Modalidades

**Arquivo:** `frontend/app/modalidades/page.tsx`

**Funcionalidades:**

- ✅ Lista de modalidades (cards coloridos)
- ✅ CRUD completo (criar, editar, desativar)
- ✅ Modal para criar/editar
- ✅ Color picker para escolher cor
- ✅ Estatísticas inline (quantidade de alunos, faturamento)
- ✅ Busca e filtros

**UI Sugerida:**

```tsx
<Card style={{ borderLeft: `4px solid ${modalidade.cor}` }}>
  <CardContent>
    <h3>{modalidade.nome}</h3>
    <Badge>{modalidade.totalAlunos} alunos</Badge>
    <p>R$ {modalidade.valor_mensalidade}/mês</p>
    <Button onClick={() => editarModalidade(modalidade)}>Editar</Button>
  </CardContent>
</Card>
```

### 2. Filtro de Modalidades na Lista de Alunos

**Arquivo:** `frontend/app/alunos/page.tsx`

**Adicionar:**

```tsx
<Tabs defaultValue="todas">
  <TabsList>
    <TabsTrigger value="todas">Todas</TabsTrigger>
    <TabsTrigger value="jiu-jitsu">
      <Badge style={{ backgroundColor: "#1E3A8A" }}>Jiu-Jitsu</Badge>
    </TabsTrigger>
    <TabsTrigger value="muay-thai">
      <Badge style={{ backgroundColor: "#DC2626" }}>Muay Thai</Badge>
    </TabsTrigger>
    <TabsTrigger value="mma">
      <Badge style={{ backgroundColor: "#7C3AED" }}>MMA</Badge>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### 3. Formulário de Cadastro de Alunos

**Arquivo:** `frontend/components/alunos/AlunoForm.tsx`

**Adicionar campo:**

```tsx
<div>
  <label>Modalidade *</label>
  <select
    value={formData.modalidade_id}
    onChange={(e) =>
      setFormData({ ...formData, modalidade_id: e.target.value })
    }
    required
  >
    <option value="">Selecione a modalidade</option>
    {modalidades.map((modalidade) => (
      <option key={modalidade.id} value={modalidade.id}>
        {modalidade.nome} - R$ {modalidade.valor_mensalidade}/mês
      </option>
    ))}
  </select>
</div>
```

### 4. Dashboard com Gráficos por Modalidade

**Arquivo:** `frontend/app/dashboard/page.tsx`

**Adicionar:**

- Gráfico de pizza: Distribuição de alunos por modalidade
- Gráfico de barras: Faturamento por modalidade
- Cards com total de alunos e faturamento por modalidade

---

## 🚀 Como Usar

### 1. **Executar SQL**

```bash
psql -U postgres -d teamcruz -f create-modalidades-table.sql
```

### 2. **Reiniciar Backend**

```bash
cd backend
npm run start:dev
```

### 3. **Testar Endpoints**

```bash
# Listar modalidades
curl -X GET http://localhost:4000/api/modalidades \
  -H "Authorization: Bearer SEU_TOKEN"

# Criar nova modalidade
curl -X POST http://localhost:4000/api/modalidades \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Capoeira",
    "descricao": "Arte marcial brasileira",
    "valor_mensalidade": 180.00,
    "cor": "#FCD34D"
  }'

# Estatísticas de Jiu-Jitsu
curl -X GET http://localhost:4000/api/modalidades/{ID}/estatisticas \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## 📦 Arquivos Criados/Modificados

### Backend

```
✅ create-modalidades-table.sql
✅ backend/src/modalidades/
    ├── entities/modalidade.entity.ts
    ├── dto/create-modalidade.dto.ts
    ├── dto/update-modalidade.dto.ts
    ├── modalidades.service.ts
    ├── modalidades.controller.ts
    └── modalidades.module.ts
✅ backend/src/people/entities/aluno.entity.ts (atualizado)
✅ backend/src/app.module.ts (importado ModalidadesModule)
```

### Frontend (A Implementar)

```
 frontend/app/modalidades/page.tsx
 frontend/components/modalidades/ModalidadeCard.tsx
 frontend/components/modalidades/ModalidadeForm.tsx
 frontend/lib/modalidadesApi.ts
 Atualizar frontend/app/alunos/page.tsx (filtro)
 Atualizar frontend/components/alunos/AlunoForm.tsx (campo)
```

---

## 💡 Casos de Uso

### Caso 1: Academia com Jiu-Jitsu e Muay Thai

```
Unidade: Team Cruz Academia
├─ Jiu-Jitsu (30 alunos × R$ 250 = R$ 7.500)
└─ Muay Thai (20 alunos × R$ 220 = R$ 4.400)
Total: 50 alunos | R$ 11.900/mês
```

### Caso 2: Condomínio vs Academia

```
Unidade: Team Cruz Academia
└─ Jiu-Jitsu (25 alunos × R$ 250 = R$ 6.250)

Unidade: Condomínio Residencial
└─ Jiu-Jitsu (15 alunos × R$ 200 = R$ 3.000)
```

_Mesma modalidade, valores diferentes por unidade_

### Caso 3: Aluno Treina Múltiplas Modalidades

**Opção A: Criar Plano Combinado**

```
Modalidade: "Jiu-Jitsu + Muay Thai"
Valor: R$ 400/mês (desconto vs R$ 470 separados)
```

**Opção B: Many-to-Many (Futuro)**

```sql
CREATE TABLE aluno_modalidades (
  aluno_id UUID,
  modalidade_id UUID,
  PRIMARY KEY (aluno_id, modalidade_id)
);
```

---

## ⚠️ Considerações Importantes

### 1. Valor da Mensalidade

- Campo `valor_mensalidade` na modalidade é **referência**
- Pode ser sobrescrito no cadastro do aluno
- Útil para alunos com desconto ou planos especiais

### 2. Alunos Existentes

- SQL script atualiza alunos existentes para Jiu-Jitsu
- Revisar e ajustar manualmente se necessário

### 3. Modalidade Obrigatória?

- Atualmente: **opcional** (`nullable: true`)
- Recomendação: tornar obrigatório após migração

### 4. Múltiplas Modalidades

- Implementação atual: **ONE modalidade por aluno**
- Para múltiplas: criar planos combinados OU implementar many-to-many

### 5. Cores

- Formato hex: `#RRGGBB`
- Validação no backend: regex `/^#[0-9A-F]{6}$/i`
- Uso: badges, gráficos, filtros

---

## ✅ Checklist de Implementação

### Backend

- [x] Criar tabela `modalidades`
- [x] Inserir modalidades padrão
- [x] Adicionar campo `modalidade_id` em `alunos`
- [x] Criar entity `Modalidade`
- [x] Atualizar entity `Aluno`
- [x] Criar DTOs (Create, Update)
- [x] Criar Service com CRUD
- [x] Criar Controller com endpoints
- [x] Criar Module
- [x] Registrar em AppModule
- [ ] Executar SQL no banco

### Frontend

- [ ] Criar página `/modalidades`
- [ ] Criar componente `ModalidadeCard`
- [ ] Criar componente `ModalidadeForm`
- [ ] Criar API service (`modalidadesApi.ts`)
- [ ] Adicionar filtro na lista de alunos
- [ ] Adicionar campo no formulário de alunos
- [ ] Criar dashboard com gráficos
- [ ] Criar relatório de faturamento

---

## 🎉 Resultado Final

Com esse sistema, a academia pode:

- ✅ **Separar claramente** alunos de Jiu-Jitsu vs Muay Thai
- ✅ **Controlar faturamento** específico de cada modalidade
- ✅ **Criar relatórios** segmentados
- ✅ **Definir valores** diferentes por arte marcial
- ✅ **Gerenciar** cada modalidade de forma independente
- ✅ **Expandir facilmente** para novas modalidades (Capoeira, Judô, etc.)

**Próximo Passo:** Executar SQL e implementar frontend! 🚀
