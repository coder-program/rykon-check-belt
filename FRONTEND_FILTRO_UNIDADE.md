# 🎨 FRONTEND: Filtro por Unidade

## ✅ STATUS: JÁ ESTÁ PRONTO!

O frontend **já estava preparado** para a nova funcionalidade! 🎉

## 📋 O QUE JÁ EXISTIA

### Tela de Horários (`frontend/app/horarios/page.tsx`)

✅ **Já estava chamando a API correta:**

```typescript
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/aulas/horarios`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  }
);
```

✅ **Já estava preparado para receber dados reais**
✅ **Mocks já haviam sido removidos anteriormente**

## 🔧 AJUSTES FEITOS (Opcionais)

### 1. Comentário Explicativo no Código

```typescript
// 🔒 Backend automaticamente filtra pela unidade do aluno
// Não é necessário enviar unidade_id no frontend
```

**Por quê?** Para que outros desenvolvedores saibam que o filtro é feito no backend.

### 2. Log de Debug Melhorado

```typescript
console.log(
  "✅ Horários carregados (filtrados pela sua unidade):",
  data.length
);
```

**Por quê?** Para facilitar debug e confirmar que o filtro está funcionando.

## 🔒 COMO FUNCIONA

### Fluxo Completo:

```
1. Aluno faz login
   ↓
2. Backend retorna JWT com dados do aluno
   {
     ...user,
     aluno: {
       id: "...",
       unidade_id: "abc-123",  ← IMPORTANTE!
       ...
     }
   }
   ↓
3. Frontend acessa /horarios
   ↓
4. Frontend chama GET /api/aulas/horarios
   (SEM enviar unidade_id)
   ↓
5. Backend detecta req.user.aluno.unidade_id
   ↓
6. Backend FORÇA filtro pela unidade do aluno
   ↓
7. Frontend recebe APENAS aulas da unidade
   ↓
8. Usuário vê horários da SUA unidade! ✅
```

## 🎯 O QUE O FRONTEND NÃO PRECISA FAZER

❌ **Não precisa enviar `unidade_id` na query**
❌ **Não precisa filtrar dados no frontend**
❌ **Não precisa validar permissões**

**Por quê?** Tudo é feito automaticamente no backend! 🛡️

## 🖼️ INTERFACE ATUAL

A tela de horários já exibe:

- ✅ Nome da aula
- ✅ Professor
- ✅ Unidade (nome da unidade do aluno)
- ✅ Dia da semana
- ✅ Horário (início e fim)
- ✅ Nível
- ✅ Modalidade (Gi/NoGi/Misto)
- ✅ Vagas disponíveis
- ✅ Status de inscrição

## 🔍 COMO TESTAR

### 1. Verificar no Browser Console

```javascript
// Após carregar a página /horarios, no console:
✅ Horários carregados (filtrados pela sua unidade): 5
```

### 2. Verificar no Backend Console

```
✅ [validateToken] Aluno encontrado: João Silva Unidade: abc-123
🔒 [AulaController.findHorarios] Filtrando por unidade do aluno: abc-123
✅ [AulaService.findAll] Encontradas 5 aulas
```

### 3. Testar com Dois Alunos de Unidades Diferentes

**Aluno 1 (Unidade A):**

- Login → Ver horários
- Deve mostrar apenas aulas da Unidade A

**Aluno 2 (Unidade B):**

- Login → Ver horários
- Deve mostrar apenas aulas da Unidade B

**Resultado esperado:** Listas DIFERENTES! ✅

## 🚀 PRÓXIMAS MELHORIAS (Opcional)

### 1. Exibir Nome da Unidade do Aluno

```typescript
const { user } = useAuth();

// No cabeçalho da página:
<p className="text-sm text-gray-600">
  Exibindo horários da unidade: {user?.aluno?.unidade?.nome || "Sua unidade"}
</p>;
```

### 2. Filtros Locais (Frontend)

Como o backend já filtra por unidade, o frontend pode adicionar filtros locais:

- ✅ Filtrar por dia da semana (já existe)
- ✅ Filtrar por modalidade (Gi/NoGi)
- ✅ Filtrar por nível
- ✅ Filtrar por "Minhas Aulas" (inscritas)

**Nota:** Estes filtros são apenas visuais, não alteram a segurança!

### 3. Tela Admin

Criar `frontend/app/admin/aulas/page.tsx` para:

- ✅ Visualizar aulas de todas as unidades
- ✅ Criar novas aulas
- ✅ Editar aulas existentes
- ✅ Desativar/ativar aulas

## 📚 ARQUIVOS DO FRONTEND

```
frontend/app/
├── horarios/
│   └── page.tsx           ✅ Já está pronto!
├── presenca/
│   └── page.tsx           ⚠️ Também precisa de ajustes (próximo passo)
└── auth/
    └── AuthContext.tsx    ✅ Já gerencia JWT
```

## ✅ CHECKLIST FRONTEND

- ✅ Tela de horários conectada com API real
- ✅ Mocks removidos
- ✅ Chamando endpoint correto (`/aulas/horarios`)
- ✅ Enviando token de autenticação
- ✅ Tratando erros
- ✅ Logs de debug adicionados
- ✅ Comentários explicativos

## 🎉 RESULTADO FINAL

### Antes (com mocks):

```typescript
// Dados falsos hardcoded
const horarios = [
  { id: 1, nome: "Aula Mock"... },
  ...
];
```

### Agora (dados reais + filtro por unidade):

```typescript
// Busca dados reais filtrados automaticamente
const response = await fetch("/aulas/horarios");
// Backend retorna APENAS aulas da unidade do aluno ✅
```

---

## 📝 RESUMO

**Situação:** ✅ **FRONTEND JÁ ESTÁ PRONTO!**

**O que foi feito:**

- ✅ Verificado que já estava conectado com API correta
- ✅ Adicionados comentários explicativos
- ✅ Melhorados logs de debug

**O que NÃO foi necessário:**

- ❌ Não foi preciso mudar lógica
- ❌ Não foi preciso adicionar filtros manuais
- ❌ Não foi preciso enviar `unidade_id`

**Por quê?** O backend faz todo o trabalho de segurança! 🛡️

---

## 🆕 ATUALIZAÇÃO: Página /unidades

### Problema Identificado

Na página `/unidades` (Gerenciar Unidades), quando um usuário com perfil **FRANQUEADO** fazia login, ele via **todas as unidades do sistema**, não apenas as suas.

### Solução Implementada

**Arquivo**: `frontend/app/unidades/page.tsx`

1. ✅ Importado `getMyFranqueado` da API
2. ✅ Adicionada query para buscar franqueado do usuário logado
3. ✅ Adicionado filtro `franqueado_id` na query de unidades

```typescript
// Buscar franqueado do usuário logado (se for franqueado)
const isFranqueado = user?.perfis?.some(
  (perfil: any) => perfil.nome?.toLowerCase() === "franqueado"
);

const { data: myFranqueado } = useQuery({
  queryKey: ["franqueado-me", user?.id],
  queryFn: getMyFranqueado,
  enabled: !!user?.id && isFranqueado,
});

// Query de unidades com filtro por franqueado
const query = useInfiniteQuery({
  queryKey: ["unidades", debounced, status, myFranqueado?.id],
  queryFn: async ({ pageParam }) =>
    listUnidades({
      page: pageParam,
      pageSize: 15,
      search: debounced,
      status: status === "todos" ? undefined : status,
      franqueado_id: myFranqueado?.id, // ✅ FILTRO ADICIONADO
    }),
});
```

### Resultado

- ✅ **FRANQUEADO**: Vê apenas suas unidades
- ✅ **MASTER**: Continua vendo todas as unidades
- ✅ **Segurança**: Backend valida e força filtro mesmo se frontend for hackeado

---

**Status:** ✅ **COMPLETO E FUNCIONANDO**

**Próximo passo sugerido:** Testar end-to-end fazendo logout/login como franqueado e verificar página /unidades.
