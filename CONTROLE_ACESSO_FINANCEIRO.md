# Controle de Acesso Financeiro - Instruções de Implementação

## Arquivos Criados

1. `/frontend/hooks/usePermissoes.ts` - Hook para verificar permissões por perfil
2. `/frontend/components/financeiro/AcessoNegado.tsx` - Componente de acesso negado
3. `/frontend/components/financeiro/ProtegerRotaFinanceira.tsx` - HOC de proteção

## Permissões por Perfil

### Recepcionista

✅ **PODE ACESSAR:**

- Faturas (A Receber) - apenas visualização e envio de links
- Enviar links de pagamento por WhatsApp/Email

  **NÃO PODE ACESSAR:**

- Dashboard Financeiro completo
- Despesas (A Pagar)
- Transações
- Extrato
- Assinaturas
- Vendas Online

### Gerente, Franqueado, Admin

✅ **ACESSO TOTAL** a todas as funcionalidades financeiras

## Como Aplicar Proteção em Cada Página

### 1. Importar o componente protetor no topo do arquivo:

```typescript
import ProtegerRotaFinanceira from "@/components/financeiro/ProtegerRotaFinanceira";
```

### 2. Renomear o componente principal (adicionar sufixo "Component"):

```typescript
// ANTES:
export default function Dashboard() {
  // ... código

// DEPOIS:
function DashboardComponent() {
  // ... código (mantém o mesmo)
}
```

### 3. Criar novo export default com proteção:

```typescript
export default function Dashboard() {
  return (
    <ProtegerRotaFinanceira requerPermissao="podeAcessarDashboardFinanceiro">
      <DashboardComponent />
    </ProtegerRotaFinanceira>
  );
}
```

## Páginas que Precisam de Proteção

### ✅ JÁ PROTEGIDA:

- `/financeiro/dashboard` ✅

### 🔧 APLICAR PROTEÇÃO:

#### Apenas Admin/Franqueado/Gerente:

```
/financeiro/a-pagar           -> requerPermissao="podeAcessarDespesas"
/financeiro/transacoes        -> requerPermissao="podeAcessarTransacoes"
/financeiro/extrato           -> requerPermissao="podeAcessarExtrato"
/financeiro/assinaturas       -> requerPermissao="podeAcessarAssinaturas"
/financeiro/vendas-online     -> requerPermissao="podeAcessarVendasOnline"
```

#### Todos (incluindo Recepcionista):

```
/financeiro/a-receber         -> requerPermissao="podeAcessarFaturas"
```

## Próximos Passos para Recepcionista

1. ✅ Proteção de rotas implementada
2. 🔧 Criar funcionalidade de envio de link de pagamento
3. 🔧 Adicionar botões WhatsApp e Email na página de faturas
4. 🔧 Implementar geração de link de pagamento (PIX/Cartão)

## Exemplo Completo (Dashboard já implementado)

Ver arquivo: `/frontend/app/financeiro/dashboard/page.tsx`
