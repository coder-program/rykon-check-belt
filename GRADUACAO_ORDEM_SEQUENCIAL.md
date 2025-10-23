# Sistema de Graduação por Ordem Sequencial

## 📋 Visão Geral

O sistema de graduação do **Rykon Check Belt** foi implementado para seguir uma **ordem sequencial obrigatória** baseada no campo `ordem` da tabela `faixa_def`. Isso garante que os alunos progridam de forma ordenada através das faixas.

## 🎯 Regras de Graduação

### 1. Ordem Sequencial Obrigatória

- Cada faixa possui um número de **ordem** definido na tabela `faixa_def`
- Um aluno **só pode ser graduado** para faixas com ordem **superior** à sua faixa atual
- **Exemplo**: Se o aluno está na faixa ordem 2 (Azul), só pode graduar para ordem 3, 4, 5, etc.

### 2. Tipos de Graduação

#### **Graduação Automática**

- Sistema determina automaticamente a **próxima faixa na sequência**
- Se aluno está na ordem 2, sistema busca automaticamente a faixa ordem 3
- **Mais seguro** para manter a progressão natural

#### **Graduação Manual (Faixa Específica)**

- Permite escolher qualquer faixa com ordem superior à atual
- Útil para casos especiais (aluno com experiência anterior, etc.)
- Sistema ainda **impede** graduação para faixas de ordem inferior

## 🗂️ Estrutura da Tabela `faixa_def`

```sql
CREATE TABLE teamcruz.faixa_def (
    id UUID PRIMARY KEY,
    codigo VARCHAR(50),           -- Ex: "BRANCA", "AZUL", "ROXA"
    nome_exibicao VARCHAR(40),    -- Nome exibido na interface
    cor_hex VARCHAR(7),           -- Cor em hexadecimal (#FFFFFF)
    ordem INTEGER,                -- ⭐ CAMPO CRUCIAL para sequenciamento
    graus_max INTEGER DEFAULT 4,
    aulas_por_grau INTEGER DEFAULT 40,
    categoria VARCHAR(20),        -- ADULTO, INFANTIL, MESTRE
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 📈 Exemplo de Progressão

| Ordem | Faixa  | Código | Pode graduar para              |
| ----- | ------ | ------ | ------------------------------ |
| 1     | Branca | BRANCA | Ordem 2+ (Azul, Roxa, etc.)    |
| 2     | Azul   | AZUL   | Ordem 3+ (Roxa, Marrom, etc.)  |
| 3     | Roxa   | ROXA   | Ordem 4+ (Marrom, Preta, etc.) |
| 4     | Marrom | MARROM | Ordem 5+ (Preta, Cinza, etc.)  |
| ...   | ...    | ...    | ...                            |

## 🔧 Funções Implementadas

### 1. `listarFaixasValidasParaGraduacao(alunoId, categoria)`

- Busca a faixa atual do aluno
- Retorna apenas faixas com ordem superior
- Filtra por categoria (ADULTO/INFANTIL)

### 2. `buscarProximaFaixa(alunoId, categoria)`

- Encontra especificamente a próxima faixa na sequência (ordem atual + 1)
- Usado na graduação automática

### 3. `graduarAlunoAutomatico(alunoId, observacao)`

- Busca automaticamente a próxima faixa
- Executa a graduação para ordem atual + 1
- Mais seguro e seguindo progressão natural

## 🎨 Interface do Usuário

### **Modal de Graduação Manual**

#### Opção 1: Graduação Automática

```
🔘 Próxima faixa automática
   ➜ ROXA (Ordem: 3)
```

#### Opção 2: Graduação Específica

```
🔘 Escolher faixa específica
   ℹ️ Apenas faixas com ordem superior à atual são exibidas

   📋 Dropdown:
   - ROXA (Ordem: 3)
   - MARROM (Ordem: 4)
   - PRETA (Ordem: 5)
   - ...
```

## 🛡️ Validações de Segurança

### Frontend

- Dropdown só exibe faixas válidas (ordem superior)
- Indicador visual da próxima faixa automática
- Mensagem quando não há próxima faixa (faixa máxima)

### Backend

- Validação adicional no endpoint de graduação
- Impede graduação para ordem inferior ou igual
- Log de tentativas inválidas

## 📊 Logs de Debug

O sistema inclui logs detalhados para monitoramento:

```javascript
console.log("Aluno na faixa ordem 2, próxima faixa: ROXA (ordem: 3)");
console.log("Faixas válidas para graduação:", ["ROXA", "MARROM", "PRETA"]);
```

## 🔄 Fluxo Completo

1. **Usuário seleciona aluno** para graduação manual
2. **Sistema busca faixa atual** do aluno (ex: AZUL - ordem 2)
3. **Sistema determina próxima faixa** automática (ex: ROXA - ordem 3)
4. **Interface mostra opções**:
   - Automática: ➜ ROXA (Ordem: 3)
   - Manual: Lista com ROXA, MARROM, PRETA... (ordens 3+)
5. **Usuário escolhe** tipo de graduação
6. **Sistema executa** graduação respeitando regras de ordem

## ⚠️ Casos Especiais

### Aluno na Faixa Máxima

- Sistema detecta quando não há próxima faixa
- Exibe mensagem: "Não há próxima faixa disponível"
- Opção manual ainda permite ver faixas superiores (se existirem)

### Erro na Determinação da Ordem

- Fallback: exibe todas as faixas da categoria
- Log do erro para investigação
- Usuário pode ainda fazer graduação manual

## 🎯 Benefícios

✅ **Progressão Ordenada**: Garante sequência natural de graduação
✅ **Flexibilidade**: Permite graduação manual quando necessário
✅ **Segurança**: Impede graduações inválidas
✅ **Transparência**: Interface clara sobre próxima faixa
✅ **Auditoria**: Logs detalhados para monitoramento

---

**Implementado em**: 23/10/2025
**Versão**: 1.0
**Status**: ✅ Funcional e testado
