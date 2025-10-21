# Cadastro Completo de Usuários por Franqueado

## 📋 Resumo da Implementação

Sistema completo de cadastro de usuários (Gerente, Recepcionista, Professor, Instrutor) por franqueados, com campos dinâmicos específicos para cada perfil e opção de ativação imediata.

---

## ✅ Funcionalidades Implementadas

### 1. **Checkbox "Deixar Ativo"**

- ✅ Visível apenas para usuários franqueados
- ✅ Permite criar usuário diretamente como ATIVO (pula fluxo de aprovação)
- ✅ Se desmarcado: usuário criado como INATIVO (requer aprovação)
- ✅ Redirecionamento condicional após cadastro:
  - Ativo: `/admin/usuarios`
  - Inativo: `/admin/usuarios-pendentes`

### 2. **Campos Dinâmicos por Perfil**

#### **GERENTE_UNIDADE**

Campos básicos (já existentes):

- Nome completo
- Email
- CPF
- Telefone
- Senha
- Unidade

**Backend**: Atualiza `unidades.responsavel_cpf` com o CPF do gerente

#### **RECEPCIONISTA**

Campos básicos + específicos:

- **Turno** (dropdown opcional): Manhã, Tarde, Noite, Integral
- **Horário de Entrada** (time, opcional)
- **Horário de Saída** (time, opcional)

**Backend**: Cria registro em `recepcionista_unidades` com os dados do turno/horários

#### **PROFESSOR / INSTRUTOR**

Campos básicos + específicos **obrigatórios**:

- **Data de Nascimento** (date, obrigatório)
- **Gênero** (dropdown obrigatório): Masculino, Feminino, Outro
- **Faixa Ministrante** (dropdown obrigatório): Azul, Roxa, Marrom, Preta, Coral, Vermelha

**Backend**:

- Cria registro em `professores` (tabela Person)
- Cria vínculo em `professor_unidades` com `is_principal=true`

---

## 🎨 Frontend - Alterações

### **Arquivo**: `frontend/app/admin/cadastrar-usuario/page.tsx`

#### **1. Estado Expandido**

```typescript
const [formData, setFormData] = useState({
  // Campos básicos
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  password: "",
  confirmPassword: "",
  perfil_id: "",
  unidade_id: "",
  ativo: false,

  // Campos PROFESSOR/INSTRUTOR
  data_nascimento: "",
  genero: "",
  faixa_ministrante: "",

  // Campos RECEPCIONISTA
  turno: "",
  horario_entrada: "",
  horario_saida: "",
});
```

#### **2. Detecção de Perfil**

```typescript
const perfilSelecionado = perfisDisponiveis?.find(
  (p: any) => p.id === formData.perfil_id
);
const perfilNome = perfilSelecionado?.nome || "";
const isProfessor = ["PROFESSOR", "INSTRUTOR"].includes(perfilNome);
const isRecepcionista = perfilNome === "RECEPCIONISTA";
```

#### **3. Validações Específicas**

```typescript
if (isProfessor) {
  if (!formData.data_nascimento) {
    setError("Data de nascimento é obrigatória para Professor/Instrutor");
    return;
  }
  if (!formData.genero) {
    setError("Gênero é obrigatório para Professor/Instrutor");
    return;
  }
  if (!formData.faixa_ministrante) {
    setError("Faixa ministrante é obrigatória para Professor/Instrutor");
    return;
  }
}
```

#### **4. Payload Condicional**

```typescript
const payload: any = {
  username,
  nome: formData.nome,
  email: formData.email,
  cpf: cpfSemFormatacao,
  telefone: telefoneSemFormatacao,
  password: formData.password,
  perfil_ids: [formData.perfil_id],
  unidade_id: formData.unidade_id,
  ativo: !!formData.ativo,
};

// Campos específicos por perfil
if (isProfessor) {
  payload.data_nascimento = formData.data_nascimento;
  payload.genero = formData.genero;
  payload.faixa_ministrante = formData.faixa_ministrante;
}

if (isRecepcionista) {
  if (formData.turno) payload.turno = formData.turno;
  if (formData.horario_entrada)
    payload.horario_entrada = formData.horario_entrada;
  if (formData.horario_saida) payload.horario_saida = formData.horario_saida;
}
```

#### **5. Seções Dinâmicas no Formulário**

```tsx
{
  /* Seção Professor/Instrutor */
}
{
  isProfessor && (
    <div className="border-t pt-6">
      <h3>Dados Específicos de Professor/Instrutor</h3>
      {/* Campos: data_nascimento, genero, faixa_ministrante */}
    </div>
  );
}

{
  /* Seção Recepcionista */
}
{
  isRecepcionista && (
    <div className="border-t pt-6">
      <h3>Dados Específicos de Recepcionista</h3>
      {/* Campos: turno, horario_entrada, horario_saida */}
    </div>
  );
}
```

---

## 🔧 Backend - Alterações

### **1. DTO Atualizado**

**Arquivo**: `backend/src/usuarios/dto/create-usuario.dto.ts`

```typescript
export enum GeneroEnum {
  MASCULINO = "MASCULINO",
  FEMININO = "FEMININO",
  OUTRO = "OUTRO",
}

export enum TurnoEnum {
  MANHA = "MANHA",
  TARDE = "TARDE",
  NOITE = "NOITE",
  INTEGRAL = "INTEGRAL",
}

export enum FaixaMinistrante {
  AZUL = "AZUL",
  ROXA = "ROXA",
  MARROM = "MARROM",
  PRETA = "PRETA",
  CORAL = "CORAL",
  VERMELHA = "VERMELHA",
}

export class CreateUsuarioDto {
  // ... campos básicos ...

  @IsOptional()
  @IsUUID()
  unidade_id?: string;

  // Professor/Instrutor
  @IsOptional()
  @IsDateString()
  data_nascimento?: string;

  @IsOptional()
  @IsEnum(GeneroEnum)
  genero?: GeneroEnum;

  @IsOptional()
  @IsEnum(FaixaMinistrante)
  faixa_ministrante?: FaixaMinistrante;

  // Recepcionista
  @IsOptional()
  @IsEnum(TurnoEnum)
  turno?: TurnoEnum;

  @IsOptional()
  @IsString()
  horario_entrada?: string;

  @IsOptional()
  @IsString()
  horario_saida?: string;
}
```

### **2. Service Atualizado**

**Arquivo**: `backend/src/usuarios/services/usuarios.service.ts`

#### **Dependências Adicionadas**

```typescript
import { DataSource } from 'typeorm';

constructor(
  @InjectRepository(Usuario)
  private usuarioRepository: Repository<Usuario>,
  @InjectRepository(Perfil)
  private perfilRepository: Repository<Perfil>,
  private dataSource: DataSource,  // ✅ NOVO
) {}
```

#### **Lógica Pós-Criação**

```typescript
async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
  // ... criação básica do usuário ...

  const usuarioSalvo = await this.usuarioRepository.save(usuario);

  // ===== PROCESSAMENTO POR PERFIL =====
  if (perfis && perfis.length > 0) {
    const perfilNome = perfis[0].nome.toUpperCase();

    try {
      // GERENTE_UNIDADE
      if (perfilNome === 'GERENTE_UNIDADE' && createUsuarioDto.unidade_id) {
        await this.dataSource.query(
          `UPDATE teamcruz.unidades SET responsavel_cpf = $1 WHERE id = $2`,
          [usuarioSalvo.cpf, createUsuarioDto.unidade_id],
        );
      }

      // PROFESSOR / INSTRUTOR
      if ((perfilNome === 'PROFESSOR' || perfilNome === 'INSTRUTOR') &&
          createUsuarioDto.unidade_id) {
        // Validar campos obrigatórios
        if (!createUsuarioDto.data_nascimento ||
            !createUsuarioDto.genero ||
            !createUsuarioDto.faixa_ministrante) {
          throw new BadRequestException('Campos obrigatórios faltando');
        }

        // Criar na tabela professores
        const professorResult = await this.dataSource.query(`
          INSERT INTO teamcruz.professores
          (tipo_cadastro, nome_completo, cpf, data_nascimento, genero,
           telefone_whatsapp, email, unidade_id, usuario_id,
           faixa_ministrante, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `, [...]);

        // Criar vínculo em professor_unidades
        await this.dataSource.query(`
          INSERT INTO teamcruz.professor_unidades
          (professor_id, unidade_id, is_principal, ativo)
          VALUES ($1, $2, true, true)
        `, [professorId, createUsuarioDto.unidade_id]);
      }

      // RECEPCIONISTA
      if (perfilNome === 'RECEPCIONISTA' && createUsuarioDto.unidade_id) {
        await this.dataSource.query(`
          INSERT INTO teamcruz.recepcionista_unidades
          (usuario_id, unidade_id, turno, horario_entrada, horario_saida, ativo)
          VALUES ($1, $2, $3, $4, $5, true)
        `, [usuarioSalvo.id, createUsuarioDto.unidade_id,
            createUsuarioDto.turno || null,
            createUsuarioDto.horario_entrada || null,
            createUsuarioDto.horario_saida || null]);
      }
    } catch (error) {
      // Rollback: remover usuário se falhar vinculação
      await this.usuarioRepository.remove(usuarioSalvo);
      throw new BadRequestException(`Erro ao vincular: ${error.message}`);
    }
  }

  return usuarioSalvo;
}
```

---

## 📊 Tabelas Afetadas

### **1. `teamcruz.usuarios`**

- Registro principal criado sempre
- Campo `ativo` definido pelo checkbox

### **2. `teamcruz.unidades`** (GERENTE)

- Atualiza: `responsavel_cpf = gerente.cpf`

### **3. `teamcruz.professores`** (PROFESSOR/INSTRUTOR)

- Cria registro com:
  - `tipo_cadastro = 'PROFESSOR'`
  - `nome_completo, cpf, data_nascimento, genero`
  - `faixa_ministrante, usuario_id, unidade_id`
  - `status = 'ATIVO'` ou `'INATIVO'` baseado no checkbox

### **4. `teamcruz.professor_unidades`** (PROFESSOR/INSTRUTOR)

- Cria vínculo:
  - `professor_id` (FK para professores)
  - `unidade_id` (FK para unidades)
  - `is_principal = true`
  - `ativo = true`

### **5. `teamcruz.recepcionista_unidades`** (RECEPCIONISTA)

- Cria registro:
  - `usuario_id` (FK para usuarios)
  - `unidade_id` (FK para unidades)
  - `turno, horario_entrada, horario_saida` (opcionais)
  - `ativo = true`

---

## 🧪 Como Testar

### **1. Testar GERENTE_UNIDADE**

```
1. Login como franqueado
2. Ir para /admin/cadastrar-usuario
3. Preencher:
   - Nome: "João Gerente"
   - Email: "joao.gerente@teste.com"
   - CPF: "123.456.789-00"
   - Telefone: "(11) 99999-9999"
   - Perfil: GERENTE_UNIDADE
   - Unidade: [Selecionar unidade]
   - Senha: "123456"
   - [X] Deixar ativo (marcar)
4. Submit
5. Verificar:
   - Usuário aparece em /admin/usuarios (ativo)
   - Na tabela unidades: responsavel_cpf = "12345678900"
```

### **2. Testar RECEPCIONISTA**

```
1. Login como franqueado
2. Ir para /admin/cadastrar-usuario
3. Preencher campos básicos
4. Perfil: RECEPCIONISTA
5. Campos adicionais aparecem:
   - Turno: "MANHA"
   - Horário Entrada: "08:00"
   - Horário Saída: "17:00"
6. [ ] Deixar ativo (desmarcar)
7. Submit
8. Verificar:
   - Usuário aparece em /admin/usuarios-pendentes (inativo)
   - Registro em recepcionista_unidades com turno/horários
```

### **3. Testar PROFESSOR/INSTRUTOR**

```
1. Login como franqueado
2. Ir para /admin/cadastrar-usuario
3. Preencher campos básicos
4. Perfil: PROFESSOR
5. Campos obrigatórios aparecem:
   - Data Nascimento: "1990-05-15"
   - Gênero: "MASCULINO"
   - Faixa Ministrante: "PRETA"
6. [X] Deixar ativo (marcar)
7. Submit
8. Verificar:
   - Usuário em /admin/usuarios (ativo)
   - Registro em professores com todos os dados
   - Vínculo em professor_unidades com is_principal=true
```

---

## 🚨 Validações Implementadas

### **Frontend**

- ✅ Senhas devem coincidir
- ✅ Senha mínimo 6 caracteres
- ✅ Perfil obrigatório
- ✅ Unidade obrigatória
- ✅ **PROFESSOR/INSTRUTOR**: data_nascimento, genero, faixa_ministrante obrigatórios
- ✅ CPF e telefone salvos sem formatação

### **Backend**

- ✅ Username único
- ✅ Email único
- ✅ Validação de enums (Genero, Turno, FaixaMinistrante)
- ✅ **PROFESSOR/INSTRUTOR**: validação de campos obrigatórios antes de criar registros
- ✅ Rollback automático se falhar vinculação (remove usuário criado)

---

## 📝 Notas Importantes

1. **Checkbox "Deixar Ativo"**:

   - Só aparece para franqueados (baseado em `franqueado?.id`)
   - Se marcado: `ativo = true` → sem aprovação necessária
   - Se desmarcado: `ativo = false` → requer aprovação

2. **Campos Dinâmicos**:

   - Aparecem/desaparecem baseado no perfil selecionado
   - Validações diferentes por perfil

3. **Transação e Rollback**:

   - Se falhar criação em professores/professor_unidades/recepcionista_unidades
   - O usuário criado é removido automaticamente
   - Garante consistência dos dados

4. **Tabela professores**:

   - Usa a entidade `Person` com `tipo_cadastro = 'PROFESSOR'`
   - Suporta múltiplas unidades via `professor_unidades`

5. **Redirecionamento Inteligente**:
   - Ativo: `/admin/usuarios`
   - Inativo: `/admin/usuarios-pendentes`

---

## ✅ Status Final

- [x] Frontend: Campos dinâmicos implementados
- [x] Frontend: Checkbox "Deixar ativo" funcional
- [x] Backend: DTO com novos campos e validações
- [x] Backend: Service processa perfis e cria registros
- [x] Backend: Vinculação automática por perfil
- [x] Backend: Rollback em caso de erro
- [ ] Testes completos por perfil (próximo passo)

---

## 🎯 Próximos Passos

1. **Testar localmente** cada perfil conforme roteiros acima
2. **Validar no banco** se registros estão sendo criados corretamente
3. **Testar fluxo de aprovação** para usuários inativos
4. **Deploy para produção** após testes completos

---

**Data**: 2025-10-19
**Desenvolvedor**: GitHub Copilot
**Status**: ✅ Implementação Completa - Aguardando Testes
