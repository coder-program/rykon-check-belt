# Vinculação de Usuário ao Franqueado

## ✅ Implementação Concluída

Foi implementado o sistema de vinculação manual de usuários aos franqueados através da interface de administração.

## 📋 O que foi feito

### 1. Backend

#### SQL Migration (`backend/add-usuario-id-to-franqueado.sql`)

```sql
-- Adiciona coluna usuario_id à tabela franqueados
ALTER TABLE franqueados ADD COLUMN usuario_id UUID;
ALTER TABLE franqueados ADD CONSTRAINT fk_franqueado_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
CREATE INDEX idx_franqueados_usuario_id ON franqueados(usuario_id);
```

#### Entity (`backend/src/people/entities/franqueado.entity.ts`)

- Adicionado campo `usuario_id: string`
- Adicionado relacionamento `@ManyToOne` com `Usuario`

#### Service (`backend/src/people/services/franqueados.service.ts`)

- Método `getByUsuarioId(usuarioId: string)` - busca franqueado por ID do usuário
- Atualizado `formatarFranqueado()` para incluir `usuario_id`

#### Controller (`backend/src/people/controllers/franqueados.controller.ts`)

- Endpoint `GET /franqueados/me` - retorna franqueado do usuário logado

#### Usuarios Service (`backend/src/usuarios/services/usuarios.service.ts`)

- Método `findByPerfil(perfilNome: string)` - busca usuários por nome do perfil

#### Usuarios Controller (`backend/src/usuarios/controllers/usuarios.controller.ts`)

- Endpoint `GET /usuarios?perfil=FRANQUEADO` - lista usuários filtrados por perfil

### 2. Frontend

#### API Functions

**`frontend/lib/peopleApi.ts`**

- `getMyFranqueado()` - busca franqueado do usuário logado

**`frontend/lib/usuariosApi.ts`**

- `getUsuariosByPerfil(perfil: string)` - busca usuários por perfil

#### Dashboard (`frontend/components/dashboard/FranqueadoDashboard.tsx`)

- Refatorado para usar dados reais via `getMyFranqueado()`
- Busca unidades vinculadas ao franqueado
- Calcula estatísticas reais (alunos, receita)

#### Admin Interface (`frontend/app/admin/gestao-franqueados/page.tsx`)

- Query `usuariosFranqueadosQuery` - lista usuários com perfil FRANQUEADO
- Mutation `vincularUsuarioMutation` - atualiza `franqueado.usuario_id`
- Função `abrirModalVincularUsuario()` - abre modal de vinculação
- Botão "Vincular Usuário" em cada card de franqueado
- Modal completo com:
  - Select dropdown de usuários filtrados por perfil FRANQUEADO
  - Indicador quando franqueado já tem usuário vinculado
  - Validação de campos
  - Loading states
  - Toast de sucesso/erro

## 🚀 Como usar

### Passo 1: Executar a Migration

```bash
psql -U postgres -d rykon_db -f backend/add-usuario-id-to-franqueado.sql
```

### Passo 2: Criar Usuário com Perfil FRANQUEADO

1. Acesse `/admin/usuarios` como MASTER
2. Clique em "Novo Usuário"
3. Preencha os dados
4. Selecione o perfil **FRANQUEADO**
5. Salve

### Passo 3: Criar Franqueado

1. Acesse `/admin/franqueados`
2. Clique em "Novo Franqueado"
3. Preencha os dados da empresa
4. Salve

### Passo 4: Vincular Usuário ao Franqueado

1. Acesse `/admin/gestao-franqueados`
2. Localize o franqueado na lista
3. Clique no botão **"Vincular Usuário"** (ícone roxo)
4. Selecione o usuário no dropdown
5. Clique em "Salvar Vínculo"

### Passo 5: Testar Dashboard

1. Faça logout
2. Faça login com o usuário vinculado ao franqueado
3. O dashboard deve mostrar:
   - Dados reais do franqueado
   - Lista de unidades vinculadas
   - Estatísticas de alunos
   - Receita mensal estimada

## 🔄 Fluxo Completo

```
Usuario (perfil: FRANQUEADO)
    ↓ (usuario_id)
Franqueado
    ↓ (franqueado_id)
Unidade
    ↓ (unidade_id)
Aluno
```

## 📊 Endpoints Criados

| Método | Endpoint                      | Descrição                                  |
| ------ | ----------------------------- | ------------------------------------------ |
| GET    | `/franqueados/me`             | Retorna franqueado do usuário logado       |
| GET    | `/usuarios?perfil=FRANQUEADO` | Lista usuários por perfil                  |
| PATCH  | `/franqueados/:id`            | Atualiza franqueado (incluindo usuario_id) |

## 🎨 UI/UX

### Botão "Vincular Usuário"

- Cor roxa para diferenciar de "Gerenciar Unidades" (azul)
- Ícone `UserCog` identificando função de usuário
- Tooltip explicativo ao hover

### Modal de Vinculação

- Título claro: "Vincular Usuário ao Franqueado"
- Nome do franqueado visível no subtítulo
- Select com formato: `Nome do Usuário (email@exemplo.com)`
- Opção "Nenhum usuário selecionado" para desvincular
- Alerta quando franqueado já tem usuário vinculado
- Aviso quando não há usuários disponíveis

### Estados

- Loading ao buscar usuários
- Loading ao salvar vínculo
- Toast de sucesso
- Toast de erro com mensagem detalhada

## 🔒 Segurança

- Endpoint `/franqueados/me` protegido com `JwtAuthGuard`
- Apenas usuários autenticados podem buscar seu franqueado
- Interface de vinculação restrita a perfil MASTER
- Validação de perfil FRANQUEADO no filtro

## 📝 Notas Técnicas

### Por que Option 1 (Manual Linking)?

- **Controle total**: Admin decide quando e quem vincular
- **Flexibilidade**: Pode trocar usuário responsável depois
- **Separação de dados**: Usuário e empresa são entidades independentes
- **Auditoria**: Mudanças visíveis e rastreáveis

### Alternativas não escolhidas

- **Option 2 (Auto by Email)**: Muito automático, pode vincular incorretamente
- **Option 3 (Form Field)**: Exige criar usuário antes do franqueado, fluxo rígido

## ✅ Checklist de Validação

- [x] Migration SQL criada
- [x] Entity atualizada
- [x] Service methods implementados
- [x] Endpoints criados
- [x] API functions no frontend
- [x] Dashboard refatorado com dados reais
- [x] Interface de vinculação criada
- [x] Modal funcional com validações
- [x] Botão adicionado aos cards
- [ ] **Migration executada no banco** (pendente - você deve executar)
- [ ] **Teste end-to-end** (pendente - após executar migration)

## 🐛 Troubleshooting

### Dashboard mostra erro "Franqueado não encontrado"

- Verifique se o usuário está vinculado a um franqueado
- Execute: `SELECT * FROM franqueados WHERE usuario_id = '<user_id>';`

### Dropdown de usuários vazio

- Verifique se existem usuários com perfil FRANQUEADO
- Execute: `SELECT u.* FROM usuarios u JOIN usuario_perfis up ON u.id = up.usuario_id JOIN perfis p ON up.perfil_id = p.id WHERE p.nome = 'FRANQUEADO';`

### Erro ao salvar vínculo

- Verifique se a migration foi executada
- Verifique se a coluna `usuario_id` existe: `\d franqueados`

## 📚 Referências

- Arquivos modificados: 12
- Linhas adicionadas: ~400
- Endpoints criados: 2
- Modals criados: 1
- Mutations criadas: 1
- Queries criadas: 1
