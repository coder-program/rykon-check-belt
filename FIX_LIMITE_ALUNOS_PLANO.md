# FIX: Validação de Limite de Alunos por Plano

## 🐛 Problema Identificado

O sistema permitia vincular mais de 1 aluno em um plano configurado para ter apenas 1 aluno (ou qualquer limite definido em `max_alunos`). Não havia validação no backend nem feedback visual no frontend sobre o limite de vagas disponíveis.

## ✅ Solução Implementada

### 1. Backend - Validação na Criação de Assinatura

**Arquivo:** `backend/src/financeiro/services/assinaturas.service.ts`

**Alteração:** Adicionada validação no método `create()` que:

- Verifica se o plano tem um limite de alunos configurado (`max_alunos > 0`)
- Conta quantos alunos ativos já estão vinculados ao plano
- Impede a criação de nova assinatura se o limite for atingido
- Retorna mensagem clara informando o limite e quantidade atual

```typescript
// Verificar limite de alunos no plano
if (plano.max_alunos && plano.max_alunos > 0) {
  const totalAlunosAtivos = await this.assinaturaRepository.count({
    where: {
      plano_id: createAssinaturaDto.plano_id,
      status: StatusAssinatura.ATIVA,
    },
  });

  if (totalAlunosAtivos >= plano.max_alunos) {
    throw new BadRequestException(
      `Este plano atingiu o limite máximo de ${plano.max_alunos} aluno(s). Atualmente existem ${totalAlunosAtivos} aluno(s) ativo(s) neste plano.`
    );
  }
}
```

### 2. Frontend - Página de Assinaturas

**Arquivo:** `frontend/app/financeiro/assinaturas/page.tsx`

**Alterações:**

1. **Contador de Alunos por Plano:**

   - Adicionado state `planosComContagem` para armazenar a contagem de alunos ativos por plano
   - Contagem é calculada ao carregar os dados

2. **Validação Pré-Envio:**

   - Validação no `handleSubmit` antes de enviar ao backend
   - Impede o envio se o limite já foi atingido
   - Mostra mensagem de erro amigável

3. **Feedback Visual no Seletor de Planos:**
   - Exibe contador de vagas ao lado de cada plano (ex: "3/5 alunos")
   - Desabilita planos que atingiram o limite
   - Marca planos completos com indicação "COMPLETO"
   - Mostra quantidade de vagas disponíveis abaixo do seletor com cores:
     - 🟢 Verde: Várias vagas disponíveis
     - 🟠 Laranja: Poucas vagas (≤2)
     - 🔴 Vermelho: Sem vagas

### 3. Frontend - Página de Planos

**Arquivo:** `frontend/app/financeiro/planos/page.tsx`

**Alterações:**

1. **Carregamento de Assinaturas:**

   - Carrega lista de assinaturas junto com planos
   - Permite calcular ocupação em tempo real

2. **Visualização de Ocupação nos Cards:**
   - Barra de progresso visual mostrando ocupação do plano
   - Contador numérico (ex: "3/5")
   - Cores indicativas:
     - 🟢 Verde: < 80% ocupado
     - 🟠 Laranja: 80-99% ocupado
     - 🔴 Vermelho: 100% ocupado
   - Alertas visuais:
     - "⚠️ Plano completo" quando atingir 100%
     - "⚡ Poucas vagas restantes" quando atingir 80%

## 🎯 Comportamento Esperado

### Cenário 1: Plano com Limite Definido e Vagas Disponíveis

- ✅ Sistema permite criar nova assinatura
- ✅ Mostra quantidade de vagas restantes
- ✅ Feedback visual indica disponibilidade

### Cenário 2: Plano com Limite Atingido

- ❌ Sistema **não permite** criar nova assinatura
- ❌ Plano aparece como **desabilitado** no seletor
- ❌ Mensagem clara indica que o limite foi atingido
- ❌ Backend rejeita requisição com erro descritivo

### Cenário 3: Plano sem Limite (max_alunos = null ou 0)

- ✅ Sistema permite criar assinaturas ilimitadamente
- ✅ Não mostra contador de ocupação
- ✅ Sem restrições

## 📊 Exemplo de Uso

### Plano "Basic" com limite de 1 aluno:

1. **Sem alunos:**

   - Seletor: "Basic - R$ 100,00 (0/1 alunos)"
   - Status: "✓ 1 vaga(s) disponível(is)" (verde)

2. **Com 1 aluno ativo:**
   - Seletor: "Basic - R$ 100,00 (1/1 alunos) - COMPLETO" (desabilitado)
   - Status: "✗ Plano completo - sem vagas disponíveis" (vermelho)
   - Card do plano: Barra 100% vermelha + "⚠️ Plano completo"

## 🔍 Validações Implementadas

### Backend

- ✅ Contagem de assinaturas ativas por plano
- ✅ Validação antes de criar nova assinatura
- ✅ Mensagem de erro descritiva
- ✅ Considera apenas assinaturas com status ATIVA

### Frontend

- ✅ Validação pré-envio
- ✅ Desabilitação de planos completos
- ✅ Feedback visual em tempo real
- ✅ Contadores precisos de ocupação
- ✅ Interface clara e intuitiva

## 🔄 Estados Considerados

Apenas assinaturas com status **ATIVA** são contabilizadas no limite. Assinaturas com os seguintes status **não** afetam o limite:

- PAUSADA
- CANCELADA
- EXPIRADA

## 🎨 Melhorias Visuais

1. **Barra de Progresso:** Representação visual da ocupação
2. **Cores Semânticas:** Verde/Laranja/Vermelho indicam disponibilidade
3. **Ícones Informativos:** ✓, ✗, ⚠️, ⚡ melhoram compreensão
4. **Desabilitação Inteligente:** Planos completos não podem ser selecionados
5. **Feedback Imediato:** Usuário vê disponibilidade antes de tentar criar

## 📝 Notas Técnicas

- A validação é **dupla** (frontend + backend) para máxima segurança
- Contagem é **reativa** e atualiza ao carregar dados
- Interface **previne** tentativas inválidas
- Backend **garante** integridade dos dados
- Mensagens de erro são **claras e descritivas**

## 🚀 Status

✅ **CONCLUÍDO** - Sistema agora respeita o limite de alunos por plano em todos os fluxos.
