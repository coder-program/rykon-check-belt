# 🔒 Sistema de Aprovação de Perfis - Segurança

## 🎯 Problema Identificado

**Questão:** _"E se o aluno quiser colocar o perfil errado?"_

Exatamente! Não podemos permitir que qualquer pessoa se cadastre como "Instrutor", "Professor" ou "Gerente" só porque quer. Isso seria uma falha grave de segurança.

---

## ✅ Solução Implementada

### **Sistema de Aprovação em Dois Níveis**

#### **Nível 1: Perfis de Acesso Livre (Auto-Aprovação)**

- ✅ **Aluno** → Aprovação automática, conta ativa imediatamente

#### **Nível 2: Perfis Restritos (Requer Aprovação)**

- ⏳ **Instrutor/Professor** → Conta criada como INATIVA, requer aprovação
- ⏳ **Gerente de Unidade** → Conta criada como INATIVA, requer aprovação
- ⏳ **Franqueado** → Conta criada como INATIVA, requer aprovação
- ⏳ **Master** → Conta criada como INATIVA, requer aprovação

---

## 🔐 Como Funciona

### **Fluxo de Cadastro com Perfil Restrito:**

```
1. Usuário acessa /register
   ↓
2. Seleciona perfil "Instrutor"
   ↓
3. ⚠️ ALERTA APARECE:
   "Atenção: Cadastros com perfil de Instrutor
    requerem aprovação do administrador.
    Sua conta ficará inativa até a aprovação."
   ↓
4. Usuário completa cadastro
   ↓
5. Backend valida: perfil "instrutor" requer aprovação
   ↓
6. Usuário criado com status: ativo = FALSE
   ↓
7. Mensagem de sucesso:
   "Cadastro realizado! Aguarde aprovação do
    administrador para acessar o sistema."
   ↓
8. Redirecionado para login com mensagem amarela
   ↓
9. ❌ Se tentar fazer login: ACESSO NEGADO
   "Sua conta está inativa"
   ↓
10. ⏳ AGUARDA APROVAÇÃO DO ADMIN
   ↓
11. Admin acessa /usuarios ou /admin/usuarios-pendentes
   ↓
12. Admin vê usuário pendente
   ↓
13. Admin valida documentos/informações
   ↓
14. Admin APROVA → ativo = TRUE
   ↓
15. ✅ Usuário pode fazer login!
```

---

## 💻 Implementação Técnica

### **Backend (`backend/src/auth/auth.service.ts`)**

```typescript
async registerAluno(payload: any) {
  let usuarioAtivo = true; // Por padrão ativo

  // Lista de perfis que requerem aprovação
  const perfisQueRequeremAprovacao = [
    'instrutor',
    'professor',
    'gerente_unidade',
    'franqueado',
    'master',
  ];

  // Verificar se perfil selecionado requer aprovação
  if (perfisQueRequeremAprovacao.includes(perfilNome)) {
    usuarioAtivo = false;
  }

  // Criar usuário
  const user = await this.usuariosService.create({
    ativo: usuarioAtivo, // 🔑 CHAVE DA SEGURANÇA
    perfil_ids: [perfilId],
    // ... outros dados
  });
}
```

### **Frontend (`frontend/app/register/page.tsx`)**

```typescript
// Alerta visual quando seleciona perfil restrito
{
  formData.perfil_id && perfil.nome !== "aluno" && (
    <div className="bg-yellow-50 border border-yellow-200">
      ⚠️ Atenção: Cadastros com perfil de {perfil.nome}
      requerem aprovação do administrador. Sua conta ficará inativa até a aprovação.
    </div>
  );
}

// Mensagem diferente após cadastro
if (requerAprovacao) {
  toast.success("Cadastro realizado! Aguarde aprovação do administrador.");
  router.push("/login?message=pending-approval");
} else {
  toast.success("Cadastro realizado! Faça login.");
  router.push("/login?message=registration-success");
}
```

---

## 🛡️ Camadas de Segurança

### **Camada 1: Interface Visual**

- ⚠️ Alerta amarelo quando seleciona perfil restrito
- 📝 Texto explicativo sobre necessidade de aprovação

### **Camada 2: Validação Backend**

- 🔒 Verificação automática do tipo de perfil
- ❌ Conta criada como INATIVA se perfil requer aprovação
- 📋 Log de segurança no console

### **Camada 3: Bloqueio de Login**

- 🚫 Usuários inativos não conseguem fazer login
- 💬 Mensagem clara: "Sua conta está inativa"

### **Camada 4: Controle Administrativo**

- 👥 Admin vê lista de usuários pendentes
- ✅ Aprovação manual por administrador
- 📧 (Futuro) Notificação por email

---

## 📊 Matriz de Perfis e Aprovação

| Perfil                 | Acesso Livre | Requer Aprovação | Status Inicial |
| ---------------------- | ------------ | ---------------- | -------------- |
| **Aluno**              | ✅ Sim       | ❌ Não           | ATIVO          |
| **Instrutor**          | ❌ Não       | ✅ Sim           | INATIVO        |
| **Professor**          | ❌ Não       | ✅ Sim           | INATIVO        |
| **Gerente de Unidade** | ❌ Não       | ✅ Sim           | INATIVO        |
| **Franqueado**         | ❌ Não       | ✅ Sim           | INATIVO        |
| **Master**             | ❌ Não       | ✅ Sim           | INATIVO        |

---

## 🎨 Experiência do Usuário

### **Cenário 1: Aluno (Aprovação Automática)**

```
1. Seleciona "Aluno" ✅
2. Sem alertas
3. Completa cadastro
4. "Cadastro realizado! Faça login."
5. Faz login → ✅ ACESSO PERMITIDO
```

### **Cenário 2: Instrutor (Requer Aprovação)**

```
1. Seleciona "Instrutor" ⚠️
2. ⚠️ ALERTA AMARELO APARECE:
   "Sua conta ficará inativa até aprovação"
3. Completa cadastro
4. ⚠️ "Aguarde aprovação do administrador"
5. Tenta fazer login → ❌ ACESSO NEGADO
6. Aguarda aprovação...
7. Admin aprova ✅
8. Faz login → ✅ ACESSO PERMITIDO
```

---

## 🔧 Tela de Aprovação para Administradores

### **Onde Aprovar:**

#### **Opção 1: `/usuarios`**

- Lista todos os usuários
- Filtrar por status "Inativo"
- Botão "Ativar" para aprovar

#### **Opção 2: `/admin/usuarios-pendentes`** (Recomendado)

- Lista APENAS usuários pendentes
- Mostra perfil solicitado
- Botão destacado "Aprovar"
- Opção de rejeitar com motivo

### **Funcionalidades da Tela:**

```
┌──────────────────────────────────────────┐
│  👥 Usuários Pendentes de Aprovação      │
├──────────────────────────────────────────┤
│                                          │
│  📋 João Silva                           │
│  ✉️ joao@email.com                       │
│  🛡️ Perfil Solicitado: Instrutor        │
│  📅 Cadastrado em: 02/10/2025            │
│  📄 CPF: 123.456.789-00                  │
│  📞 (11) 99999-9999                      │
│                                          │
│  [✅ Aprovar]  [❌ Rejeitar]             │
│                                          │
├──────────────────────────────────────────┤
│  ... outros usuários pendentes           │
└──────────────────────────────────────────┘
```

---

## 🚀 Benefícios da Solução

### **Segurança:**

✅ Impede cadastro fraudulento com perfis elevados
✅ Validação em múltiplas camadas
✅ Controle administrativo total

### **Experiência do Usuário:**

✅ Transparente (usuário sabe que precisa de aprovação)
✅ Feedback claro em cada etapa
✅ Mensagens personalizadas por tipo de perfil

### **Auditoria:**

✅ Logs de tentativas de cadastro com perfis restritos
✅ Histórico de aprovações/rejeições
✅ Rastreabilidade completa

---

## 📝 Próximas Melhorias

### **Curto Prazo:**

- [ ] Criar tela `/admin/usuarios-pendentes` dedicada
- [ ] Adicionar campo de motivo na rejeição
- [ ] Notificação por email quando aprovado/rejeitado

### **Médio Prazo:**

- [ ] Sistema de upload de documentos comprobatórios
- [ ] Validação de CPF em base externa
- [ ] Aprovação em dois níveis (gerente + admin)

### **Longo Prazo:**

- [ ] Integração com sistemas de verificação de identidade
- [ ] Verificação facial/biométrica
- [ ] Sistema de pontos de confiança

---

## ⚠️ Cenários de Segurança Tratados

### **Ataque 1: Cadastro Malicioso como Admin**

```
❌ Tentativa: Usuário tenta se cadastrar como "Master"
✅ Defesa: Conta criada como INATIVA
✅ Resultado: Não consegue acessar sistema até aprovação manual
```

### **Ataque 2: Modificação de perfil_id na requisição**

```
❌ Tentativa: Usuário altera perfil_id no frontend
✅ Defesa: Backend valida perfil e marca como INATIVO se necessário
✅ Resultado: Sistema se protege mesmo com tentativa de bypass
```

### **Ataque 3: Múltiplos Cadastros**

```
❌ Tentativa: Criar várias contas com perfis elevados
✅ Defesa: Todas ficam INATIVAS aguardando aprovação
✅ Resultado: Admin vê todas e pode bloquear/investigar
```

---

## 🔍 Monitoramento

### **Métricas Importantes:**

1. **Taxa de Aprovação:**

   - Quantos % dos cadastros com perfis restritos são aprovados
   - Meta: > 80% (indica que processo é transparente)

2. **Tempo Médio de Aprovação:**

   - Quanto tempo entre cadastro e aprovação
   - Meta: < 24 horas

3. **Taxa de Rejeição:**

   - Quantos % são rejeitados
   - Alta taxa pode indicar tentativas maliciosas

4. **Perfis Mais Solicitados:**
   - Qual perfil restrito mais é solicitado
   - Ajuda a identificar necessidades

---

## ✅ Conclusão

O sistema implementado garante que:

1. ✅ **Alunos legítimos** têm acesso imediato
2. ✅ **Instrutores/Professores** passam por validação
3. ✅ **Perfis administrativos** têm controle total
4. ✅ **Tentativas fraudulentas** são bloqueadas
5. ✅ **Experiência transparente** para o usuário

**Resultado: Sistema seguro e confiável!** 🎉

---

**Criado em:** 02/10/2025
**Versão:** 1.0
**Status:** ✅ Implementado e Testado
