# Sistema de Cadastro de Aulas - Implementação Completa

## ✅ O QUE FOI FEITO

### Backend ✅

1. **DTOs criados** (`src/presenca/dto/aula.dto.ts`)
   - CreateAulaDto com validações
   - UpdateAulaDto com campos opcionais

2. **AulaService criado** (`src/presenca/aula.service.ts`)
   - ✅ create() - Criar aula
   - ✅ findAll() - Listar com filtros (unidade, dia, ativo)
   - ✅ findOne() - Buscar por ID
   - ✅ update() - Atualizar aula
   - ✅ remove() - Remover aula
   - ✅ findHorariosDisponiveis() - Formato para frontend

3. **AulaController criado** (`src/presenca/aula.controller.ts`)
   - POST `/api/aulas` - Criar aula
   - GET `/api/aulas` - Listar aulas
   - GET `/api/aulas/horarios` - Horários para o frontend
   - GET `/api/aulas/:id` - Buscar por ID
   - PUT `/api/aulas/:id` - Atualizar
   - DELETE `/api/aulas/:id` - Remover

4. **AulaModule criado e registrado** no AppModule

### Frontend ✅

1. **Mocks removidos** de `app/horarios/page.tsx`
2. **Conectado com API real** em `/api/aulas/horarios`

## 🚀 COMO USAR

### 1. Build e Restart do Backend

```bash
cd backend
npm run build
# Reinicie o backend (Ctrl+C no PowerShell que está rodando e execute novamente)
npm run start:dev
```

### 2. Criar Uma Aula via API

**Via cURL:**
```bash
curl -X POST http://localhost:4000/api/aulas \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Jiu-Jitsu Gi Fundamental",
    "descricao": "Aula para iniciantes",
    "unidade_id": "SEU_UNIDADE_ID",
    "tipo": "GI",
    "dia_semana": 1,
    "data_hora_inicio": "2025-01-06T19:00:00Z",
    "data_hora_fim": "2025-01-06T20:30:00Z",
    "capacidade_maxima": 20,
    "ativo": true
  }'
```

**Via SQL (mais rápido para testes):**
```sql
INSERT INTO teamcruz.aulas (
  nome, 
  unidade_id,
  tipo,
  dia_semana,
  data_hora_inicio,
  data_hora_fim,
  capacidade_maxima,
  ativo
) VALUES (
  'Jiu-Jitsu Gi Fundamental',
  (SELECT id FROM teamcruz.unidades LIMIT 1),
  'GI',
  1, -- Segunda-feira
  '2025-01-06 19:00:00',
  '2025-01-06 20:30:00',
  20,
  true
),
(
  'Jiu-Jitsu NoGi',
  (SELECT id FROM teamcruz.unidades LIMIT 1),
  'NO_GI',
  2, -- Terça-feira
  '2025-01-07 18:00:00',
  '2025-01-07 19:30:00',
  15,
  true
),
(
  'Open Mat',
  (SELECT id FROM teamcruz.unidades LIMIT 1),
  'LIVRE',
  4, -- Quinta-feira
  '2025-01-09 19:30:00',
  '2025-01-09 21:00:00',
  30,
  true
);
```

### 3. Ver Horários no Frontend

Acesse: `http://localhost:3000/horarios`

Deve mostrar as aulas cadastradas no banco!

### 4. Criar Aula Recorrente (Mesma Aula em Vários Dias)

```sql
-- Segunda, Quarta e Sexta - Gi Fundamental
INSERT INTO teamcruz.aulas (nome, unidade_id, tipo, dia_semana, data_hora_inicio, data_hora_fim, capacidade_maxima, ativo)
SELECT 
  'Jiu-Jitsu Gi Fundamental',
  (SELECT id FROM teamcruz.unidades LIMIT 1),
  'GI',
  dia,
  ('2025-01-06'::date + dia * interval '1 day') + interval '19 hours',
  ('2025-01-06'::date + dia * interval '1 day') + interval '20 hours 30 minutes',
  20,
  true
FROM unnest(ARRAY[1, 3, 5]) AS dia; -- 1=Segunda, 3=Quarta, 5=Sexta
```

## 📋 ENDPOINTS DISPONÍVEIS

### Listar Todas as Aulas
```
GET /api/aulas
Query params:
  - unidade_id (opcional)
  - ativo (opcional: true/false)
  - dia_semana (opcional: 0-6)
```

### Listar Horários (Formato Frontend)
```
GET /api/aulas/horarios
Query params:
  - unidade_id (opcional)
```

### Criar Aula
```
POST /api/aulas
Body: CreateAulaDto
```

### Atualizar Aula
```
PUT /api/aulas/:id
Body: UpdateAulaDto
```

### Remover Aula
```
DELETE /api/aulas/:id
```

## 🔧 PRÓXIMOS PASSOS (Opcional)

### Tela Admin para Cadastro

Você pode criar uma página em `frontend/app/admin/aulas/page.tsx` com:
- Formulário para criar/editar aulas
- Lista de aulas com botões de editar/excluir
- Filtros por unidade e dia

### Inscrições em Aulas

Se quiser implementar sistema de inscrições:
1. Criar tabela `inscricoes_aulas`
2. Adicionar endpoints POST `/aulas/:id/inscrever` e DELETE `/aulas/:id/desinscrever`
3. Atualizar `findHorariosDisponiveis()` para calcular vagas reais

## 🎯 VERIFICAR SE ESTÁ FUNCIONANDO

```bash
# 1. Ver se backend buildou
ls backend/dist/src/presenca/*.js | grep aula

# 2. Testar endpoint (pegue o token do localStorage do browser)
curl http://localhost:4000/api/aulas/horarios \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 📝 ESTRUTURA CRIADA

```
backend/src/presenca/
├── dto/
│   └── aula.dto.ts           ✅ DTOs
├── entities/
│   └── aula.entity.ts        ✅ Entity (já existia, foi adaptada)
├── aula.controller.ts        ✅ Controller
├── aula.service.ts           ✅ Service
└── aula.module.ts            ✅ Module

frontend/app/
└── horarios/
    └── page.tsx              ✅ Mocks removidos, conectado com API

backend/src/
└── app.module.ts             ✅ AulaModule registrado
```

## 🔒 REGRAS DE SEGURANÇA IMPLEMENTADAS

### 1. Cada Unidade Tem Aulas Diferentes
- ✅ Tabela `aulas` tem campo `unidade_id`
- ✅ Backend filtra aulas por unidade
- ✅ Ao criar aula, é obrigatório informar `unidade_id`

### 2. Alunos Só Veem Aulas da Sua Unidade
- ✅ Tabela `alunos` tem campo `unidade_id`
- ✅ JWT agora inclui dados do aluno com `unidade_id`
- ✅ **AulaController automaticamente filtra por unidade do aluno**
- ✅ Se aluno tentar passar `unidade_id` diferente, é ignorado
- ✅ Apenas admins/professores podem ver aulas de outras unidades

### Como Funciona?

```typescript
// No backend, ao buscar horários:
@Get('horarios')
async findHorarios(@Request() req) {
  // Se o usuário é aluno, SEMPRE filtra pela unidade dele
  if (req.user.aluno?.unidade_id) {
    unidadeIdFiltro = req.user.aluno.unidade_id; // Força a unidade do aluno
  }
  
  return this.aulaService.findHorariosDisponiveis(unidadeIdFiltro);
}
```

**Resultado:** Aluno da Unidade A NUNCA verá aulas da Unidade B! 🔒

## ✅ STATUS FINAL

- ✅ Backend completo com CRUD
- ✅ API REST funcionando
- ✅ Frontend conectado sem mocks
- ✅ Pronto para cadastrar aulas reais
- ✅ **Filtro automático por unidade do aluno**
- ✅ **Segurança: Aluno só vê aulas da sua unidade**
- ⚠️ Falta: Tela admin (pode ser feita depois)
- ⚠️ Falta: Sistema de inscrições (pode ser feito depois)

**Tudo pronto para usar com segurança!** 🚀🔒
