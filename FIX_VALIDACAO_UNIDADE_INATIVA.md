# 🔧 Correção: Validação de Unidade Inativa no Cadastro de Usuários

## 📋 Descrição do Bug

O sistema permitia cadastrar novos usuários em unidades com status **INATIVA** ou **HOMOLOGACAO**, o que não deveria ser permitido. Apenas unidades com status **ATIVA** devem aceitar novos cadastros de usuários.

## 🎯 Objetivo

Implementar validação para garantir que usuários só possam ser cadastrados/vinculados a unidades com status **ATIVA**.

## ✅ Correções Implementadas

### 1. **Validação no Serviço de Usuários** (`usuarios.service.ts`)

**Arquivo:** `backend/src/usuarios/services/usuarios.service.ts`

**Alteração:** Adicionada validação no método `create()` para verificar o status da unidade antes de criar o usuário.

```typescript
// ✅ VALIDAÇÃO: Verificar se unidade está ativa (quando unidade_id for informada)
if (createUsuarioDto.unidade_id) {
  const unidadeData = await this.dataSource.query(
    `SELECT id, nome, status FROM teamcruz.unidades WHERE id = $1`,
    [createUsuarioDto.unidade_id]
  );

  if (!unidadeData || unidadeData.length === 0) {
    throw new BadRequestException(
      "Unidade não encontrada. Verifique o ID informado."
    );
  }

  if (unidadeData[0].status !== "ATIVA") {
    throw new BadRequestException(
      `Não é possível cadastrar usuário na unidade "${unidadeData[0].nome}" pois ela está com status "${unidadeData[0].status}". Apenas unidades ATIVAS podem receber novos cadastros.`
    );
  }
}
```

**Impacto:**

- Validação aplicada para todos os perfis: GERENTE_UNIDADE, PROFESSOR, INSTRUTOR, RECEPCIONISTA
- Mensagem de erro clara e informativa para o usuário

---

### 2. **Validação no Serviço de Gerente de Unidades** (`gerente-unidades.service.ts`)

**Arquivo:** `backend/src/people/services/gerente-unidades.service.ts`

**Alterações:**

1. Importado `BadRequestException` e `DataSource`
2. Adicionada validação no método `vincular()` para verificar status da unidade

```typescript
async vincular(
  usuarioId: string,
  unidadeId: string,
): Promise<GerenteUnidade> {
  // ✅ Verificar se a unidade existe e está ativa
  const unidadeData = await this.dataSource.query(
    `SELECT id, nome, status FROM teamcruz.unidades WHERE id = $1`,
    [unidadeId],
  );

  if (!unidadeData || unidadeData.length === 0) {
    throw new NotFoundException(
      'Unidade não encontrada. Verifique o ID informado.',
    );
  }

  if (unidadeData[0].status !== 'ATIVA') {
    throw new BadRequestException(
      `Não é possível vincular gerente à unidade "${unidadeData[0].nome}" pois ela está com status "${unidadeData[0].status}". Apenas unidades ATIVAS podem receber novos vínculos.`,
    );
  }
  // ... resto do código
}
```

**Impacto:**

- Validação aplicada ao vincular gerentes a unidades
- Previne vínculos indevidos mesmo em operações diretas

---

### 3. **Validação no Serviço de Professores** (`professores.service.ts`)

**Arquivo:** `backend/src/people/services/professores.service.ts`

**Alteração:** Adicionada validação no método `create()` antes de criar o professor.

```typescript
async create(dto: CreateProfessorDto): Promise<Person> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. ✅ Verificar se a unidade existe e está ativa
    const unidadeData = await queryRunner.manager.query(
      `SELECT id, nome, status FROM teamcruz.unidades WHERE id = $1`,
      [dto.unidade_id],
    );

    if (!unidadeData || unidadeData.length === 0) {
      throw new NotFoundException(
        'Unidade não encontrada. Verifique o ID informado.',
      );
    }

    if (unidadeData[0].status !== 'ATIVA') {
      throw new BadRequestException(
        `Não é possível cadastrar professor na unidade "${unidadeData[0].nome}" pois ela está com status "${unidadeData[0].status}". Apenas unidades ATIVAS podem receber novos cadastros.`,
      );
    }
    // ... resto do código
  }
}
```

**Impacto:**

- Validação aplicada ao cadastrar professores/instrutores
- Protege integridade dos dados dentro de transações

---

### 4. **Validação no Serviço de Recepcionistas** (`recepcionista-unidades.service.ts`)

**Arquivo:** `backend/src/people/services/recepcionista-unidades.service.ts`

**Alterações:**

1. Importado `BadRequestException`
2. Adicionada validação no método `create()` para verificar status da unidade

```typescript
async create(
  dto: CreateRecepcionistaUnidadeDto,
  user?: any,
): Promise<RecepcionistaUnidade> {
  // ✅ Verificar se a unidade existe e está ativa
  const unidadeData = await this.dataSource.query(
    `SELECT id, nome, status FROM teamcruz.unidades WHERE id = $1`,
    [dto.unidade_id],
  );

  if (!unidadeData || unidadeData.length === 0) {
    throw new NotFoundException(
      'Unidade não encontrada. Verifique o ID informado.',
    );
  }

  if (unidadeData[0].status !== 'ATIVA') {
    throw new BadRequestException(
      `Não é possível vincular recepcionista à unidade "${unidadeData[0].nome}" pois ela está com status "${unidadeData[0].status}". Apenas unidades ATIVAS podem receber novos vínculos.`,
    );
  }
  // ... resto do código
}
```

**Impacto:**

- Validação aplicada ao vincular recepcionistas a unidades
- Consistência com outras validações do sistema

---

## 📊 Resumo das Validações

| Serviço                             | Método       | Validação                                                     |
| ----------------------------------- | ------------ | ------------------------------------------------------------- |
| `usuarios.service.ts`               | `create()`   | ✅ Verifica status da unidade antes de criar usuário          |
| `gerente-unidades.service.ts`       | `vincular()` | ✅ Verifica status da unidade antes de vincular gerente       |
| `professores.service.ts`            | `create()`   | ✅ Verifica status da unidade antes de criar professor        |
| `recepcionista-unidades.service.ts` | `create()`   | ✅ Verifica status da unidade antes de vincular recepcionista |

---

## 🧪 Como Testar

### Teste 1: Cadastro de Usuário em Unidade Inativa

```bash
# Cenário: Tentar cadastrar um gerente em uma unidade inativa
POST /usuarios
{
  "nome": "João Silva",
  "email": "joao@teste.com",
  "username": "joao.silva",
  "cpf": "12345678901",
  "password": "123456",
  "perfil_ids": ["<id_perfil_gerente>"],
  "unidade_id": "<id_unidade_inativa>"
}

# Resultado Esperado:
# Status: 400 Bad Request
# Mensagem: "Não é possível cadastrar usuário na unidade 'Sorocaba 1' pois ela está com status 'INATIVA'. Apenas unidades ATIVAS podem receber novos cadastros."
```

### Teste 2: Cadastro de Professor em Unidade em Homologação

```bash
# Cenário: Tentar cadastrar um professor em unidade em homologação
POST /professores
{
  "nome": "Maria Santos",
  "cpf": "98765432100",
  "email": "maria@teste.com",
  "unidade_id": "<id_unidade_homologacao>",
  "faixa_atual": "PRETA",
  "graus": 1
}

# Resultado Esperado:
# Status: 400 Bad Request
# Mensagem: "Não é possível cadastrar professor na unidade 'TeamCruz Nova' pois ela está com status 'HOMOLOGACAO'. Apenas unidades ATIVAS podem receber novos cadastros."
```

### Teste 3: Cadastro em Unidade Ativa (Deve Funcionar)

```bash
# Cenário: Cadastrar usuário em unidade ativa
POST /usuarios
{
  "nome": "Pedro Costa",
  "email": "pedro@teste.com",
  "username": "pedro.costa",
  "cpf": "11122233344",
  "password": "123456",
  "perfil_ids": ["<id_perfil_recepcionista>"],
  "unidade_id": "<id_unidade_ativa>"
}

# Resultado Esperado:
# Status: 201 Created
# Retorna: Dados do usuário cadastrado com sucesso
```

---

## 🎯 Benefícios

1. **Integridade de Dados**: Garante que apenas unidades operacionais recebam novos usuários
2. **Experiência do Usuário**: Mensagens de erro claras e informativas
3. **Regra de Negócio**: Alinha o sistema com as políticas de gestão de unidades
4. **Prevenção de Erros**: Evita cadastros indevidos que poderiam causar problemas operacionais
5. **Consistência**: Validação aplicada em todos os pontos de entrada do sistema

---

## 📌 Observações

- A validação verifica **apenas o status da unidade**, não afeta outras validações existentes
- Unidades com status **ATIVA** continuam funcionando normalmente
- Unidades com status **INATIVA** ou **HOMOLOGACAO** não aceitam novos cadastros/vínculos
- A validação é aplicada tanto para cadastro direto quanto para vinculação posterior
- Mensagens de erro incluem o nome da unidade para facilitar a identificação

---

## 🔄 Status dos Arquivos Modificados

- ✅ `backend/src/usuarios/services/usuarios.service.ts`
- ✅ `backend/src/people/services/gerente-unidades.service.ts`
- ✅ `backend/src/people/services/professores.service.ts`
- ✅ `backend/src/people/services/recepcionista-unidades.service.ts`

---

## 📅 Data da Correção

**Data:** 13 de novembro de 2025

---

## ✅ Conclusão

O bug foi corrigido com sucesso. Agora o sistema valida adequadamente o status da unidade antes de permitir qualquer cadastro ou vinculação de usuários, garantindo que apenas unidades **ATIVAS** possam receber novos registros.
