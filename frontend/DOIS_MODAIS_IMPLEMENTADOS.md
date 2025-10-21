## ✅ **Dois Modais Separados Implementados**

### **Resumo da Implementação:**

🔹 **Modal 1: Dados do Usuário**

- Nome, email, telefone, data de nascimento, status (ativo/pendente)
- Botão: "Usuário" (azul)
- Função: `handleEditUser()`
- Mutation: `saveUserMutation`

🔹 **Modal 2: Dados Pessoais**

- CPF, gênero, unidade
- **Se Professor:** faixa ministrante, data docência, registro profissional
- **Se Aluno:** faixa atual, grau, matrícula, dados do responsável
- Botão: "Dados Pessoais" (roxo)
- Função: `handleEditPersonalData()`
- Mutation: `savePersonMutation`

### **Estrutura dos Botões:**

```tsx
<Button onClick={() => handleEditUser(userItem.id)}>
  <User className="h-4 w-4 mr-1" />
  Usuário
</Button>
<Button onClick={() => handleEditPersonalData(userItem.id)}>
  <Edit className="h-4 w-4 mr-1" />
  Dados Pessoais
</Button>
```

### **Estados Criados:**

- `isUserModalOpen` / `setIsUserModalOpen`
- `isPersonModalOpen` / `setIsPersonModalOpen`
- `editUserForm` / `setEditUserForm`
- `editPersonForm` / `setEditPersonForm`
- `editingUser` / `setEditingUser`
- `editingPerson` / `setEditingPerson`

### **Fluxo de Funcionamento:**

1. **Admin clica "Usuário"** → Abre modal básico com dados de login/perfil
2. **Admin clica "Dados Pessoais"** → Abre modal específico de aluno/professor
3. **Cada modal salva independente** → Atualizações separadas no backend
4. **Campos condicionais** → Professor vs Aluno mostram campos diferentes

### **Status:** ✅ **Implementação Completa**

- Dois modais independentes funcionando
- Botões separados na interface
- Mutations específicas para cada tipo
- Interface responsiva e intuitiva

A funcionalidade está pronta! O admin agora tem controle granular sobre a edição de dados dos usuários. 🎉
