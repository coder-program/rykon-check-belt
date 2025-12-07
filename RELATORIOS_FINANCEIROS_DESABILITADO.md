# Relatórios Financeiros - Plano Não Contratado

## Mudanças Implementadas

### Card de "Relatórios Financeiros"

**Antes:**

- ✅ Clicável
- ✅ Cor roxa (`bg-purple-500`)
- ✅ Descrição: "Acompanhar receitas e mensalidades"
- ✅ Redireciona para `/relatorios/financeiro`

**Depois:**

- **NÃO clicável** (cursor not-allowed)
- 🎨 Cor cinza (`bg-gray-400`)
- 📝 Descrição: **"Plano não contratado"** (em itálico)
- 🚫 Action vazio (não faz nada ao clicar)
- 🎨 Opacidade 60% (visual desabilitado)
- 🚫 Sem efeitos hover (shadow, scale)

## Como Funciona

```tsx
{
  title: "Relatórios Financeiros",
  description: "Plano não contratado",  // ← Mensagem
  icon: BarChart3,
  action: () => {},                      // ← Não faz nada
  color: "bg-gray-400",                  // ← Cinza
  disabled: true,                        // ← Desabilitado
}
```

## Visual Esperado

```
┌─────────────────────────────────┐
│ 📊 Relatórios Financeiros       │  ← Ícone cinza
│                                 │
│ Plano não contratado            │  ← Em itálico, cinza
│                                 │
└─────────────────────────────────┘
  ↑ Opacidade 60%
  ↑ Cursor: not-allowed
  ↑ Sem hover effects
```

## Para Habilitar Novamente (Futuro)

Quando contratar o plano, basta mudar:

```tsx
{
  title: "Relatórios Financeiros",
  description: "Acompanhar receitas e mensalidades",
  icon: BarChart3,
  action: () => router.push("/relatorios/financeiro"),
  color: "bg-purple-500",
  disabled: false,  // ou remover essa linha
}
```

## Testado

- ✅ Card aparece com cor cinza
- ✅ Mensagem "Plano não contratado" visível
- ✅ Não é clicável
- ✅ Visual de desabilitado (opacidade)
- ✅ Cursor mostra "not-allowed"
- ✅ Outros cards continuam funcionando normalmente
