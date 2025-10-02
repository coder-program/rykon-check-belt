# 📋 Formulário de Franqueados - Documentação

## 🎯 Visão Geral

Sistema completo para gerenciamento de franquias com todos os campos solicitados, incluindo:
- ✅ Identificação completa
- ✅ Contatos e redes sociais
- ✅ Endereço (preparado para integração)
- ✅ Responsável Legal
- ✅ Informações da franquia
- ✅ **Relacionamento hierárquico** (Matriz/Filial)
- ✅ Status e situação

## 📁 Estrutura de Arquivos

### **Backend:**
```
backend/src/
├── migrations/
│   └── 1756930000000-FranqueadosNovoscampos.ts  ← Migration com todos os campos
├── people/
│   ├── entities/
│   │   └── franqueado.entity.ts                  ← Entity atualizada
│   ├── dto/
│   │   └── franqueados.dto.ts                    ← DTOs com validações
│   ├── services/
│   │   └── franqueados.service.ts                ← Service com lógica
│   └── controllers/
│       └── franqueados.controller.ts             ← Controller com endpoints
```

### **Frontend:**
```
frontend/
├── app/
│   └── franqueados/
│       └── page.tsx                              ← Página principal (lista)
└── components/
    └── franqueados/
        ├── FranqueadoForm.tsx                    ← Componente do formulário
        └── README.md                             ← Esta documentação
```

## 🔧 Como Funciona

### **1. Página Principal** (`page.tsx`)
- **Lista** os franqueados existentes
- Gerencia **estado** do formulário
- Chama **mutations** (create/update)
- Abre o **modal** com o componente FranqueadoForm

### **2. Componente do Formulário** (`FranqueadoForm.tsx`)
- **6 abas organizadas:**
  1. 📝 **Identificação** - Nome, CNPJ, Razão Social, etc.
  2. 📞 **Contato** - Emails, telefones, website, redes sociais
  3. 📍 **Endereço** - Integração preparada
  4. 👤 **Responsável** - Dados do responsável legal
  5. ℹ️ **Informações** - Ano fundação, missão, visão, valores, histórico, logotipo
  6. ✅ **Status** - Situação (ATIVA/INATIVA/EM_HOMOLOGACAO)

- **Validações inline:**
  - Formatação automática de CNPJ
  - Formatação automática de CPF
  - Formatação automática de telefones
  - Validação de URLs

- **Navegação entre abas:**
  - Botões "Anterior" e "Próximo"
  - Salva em qualquer aba

## 🆕 Campos Novos Implementados

### **Identificação:**
- ✅ `razao_social` (obrigatório)
- ✅ `nome_fantasia` (opcional)
- ✅ `inscricao_estadual` (opcional)
- ✅ `inscricao_municipal` (opcional)

### **Contato:**
- ✅ `telefone_fixo` (opcional)
- ✅ `telefone_celular` (obrigatório)
- ✅ `website` (opcional)
- ✅ `redes_sociais` (JSONB com instagram, facebook, youtube, linkedin)

### **Responsável Legal:**
- ✅ `responsavel_nome` (obrigatório)
- ✅ `responsavel_cpf` (obrigatório, único por franquia)
- ✅ `responsavel_cargo` (opcional)
- ✅ `responsavel_email` (opcional)
- ✅ `responsavel_telefone` (opcional)

### **Informações:**
- ✅ `ano_fundacao` (opcional)
- ✅ `missao` (opcional, TEXT)
- ✅ `visao` (opcional, TEXT)
- ✅ `valores` (opcional, TEXT)
- ✅ `historico` (opcional, TEXT)
- ✅ `logotipo_url` (opcional, preparado para upload)

### **Hierarquia:**
- ✅ `id_matriz` (FK auto-referência)
  - `NULL` = Franquia **Matriz**
  - Preenchido = Franquia **Filial** (vinculada à matriz)

### **Status:**
- ✅ `situacao` (enum: ATIVA, INATIVA, EM_HOMOLOGACAO)
- ✅ `data_cadastro` (automático - created_at)

### **Calculado:**
- ✅ `total_unidades` (quantidade de academias - calculado automaticamente)

## 🚀 Como Usar

### **1. Rodar a Migration:**
```bash
cd backend
npm run migration:run
```

### **2. Testar o Formulário:**
```bash
# Frontend
cd frontend
npm run dev
```

### **3. Acessar:**
Navegue para: `http://localhost:3000/franqueados`

### **4. Criar Novo Franqueado:**
1. Clique em "**Novo Franqueado**"
2. Preencha os **campos obrigatórios**:
   - Nome da Franquia
   - CNPJ
   - Razão Social
   - Email institucional
   - Telefone celular
   - Nome do responsável legal
   - CPF do responsável

3. Preencha campos **opcionais** conforme necessário
4. Escolha a **Situação** (padrão: Em Homologação)
5. Clique em "**Criar Franqueado**"

### **5. Editar Franqueado:**
1. Clique no ícone de **edição** (lápis) na lista
2. Modifique os campos desejados
3. Clique em "**Atualizar Franqueado**"

## 📊 Validações Implementadas

### **Backend (DTOs):**
- ✅ CNPJ formato: `XX.XXX.XXX/XXXX-XX`
- ✅ CPF formato: `XXX.XXX.XXX-XX`
- ✅ Email válido
- ✅ URLs válidas
- ✅ Telefones com formato
- ✅ Ano fundação entre 1900 e ano atual
- ✅ Situação: enum válido

### **Frontend:**
- ✅ Formatação automática de CNPJ ao digitar
- ✅ Formatação automática de CPF ao digitar
- ✅ Formatação automática de telefones ao digitar
- ✅ Validação de campos obrigatórios antes de enviar
- ✅ Feedback visual de erros

## 🔄 Relacionamento Hierárquico (Matriz/Filial)

### **Como funciona:**
- Toda franquia tem o campo `id_matriz`
- Se `id_matriz = NULL` → É uma **franquia MATRIZ**
- Se `id_matriz = <UUID>` → É uma **franquia FILIAL** vinculada à matriz

### **Exemplo de uso:**
```sql
-- Criar uma MATRIZ
INSERT INTO franqueados (nome, cnpj, razao_social, id_matriz, ...)
VALUES ('TeamCruz SP', '12.345.678/0001-90', 'TeamCruz SP Ltda', NULL, ...);

-- Criar uma FILIAL vinculada
INSERT INTO franqueados (nome, cnpj, razao_social, id_matriz, ...)
VALUES ('TeamCruz SP - Pinheiros', '98.765.432/0001-21', 'TC Pinheiros Ltda', 
        '<UUID_DA_MATRIZ>', ...);
```

### **Frontend:**
O campo "Tipo de Franquia" na aba **Informações** permite selecionar:
- ☑️ Franquia Matriz (padrão)
- ☐ Franquia Filial (em breve - será possível selecionar a matriz)

## 📝 Próximas Melhorias Sugeridas

1. **Upload de Logotipo:**
   - Integrar com serviço de storage (S3, Cloudinary, etc.)
   - Componente de upload com preview

2. **Endereço:**
   - Integrar com tabela de endereços existente
   - Busca de CEP automática (API ViaCEP)

3. **Seleção de Matriz:**
   - Dropdown para selecionar franquia matriz ao criar filial
   - Visualização da hierarquia

4. **Dashboard:**
   - Estatísticas por franquia
   - Gráficos de evolução

## 🐛 Troubleshooting

### **Erro ao rodar migration:**
Se houver erro em migrations anteriores, rode apenas os comandos SQL da migration de franqueados:
```bash
psql -U usuario -d banco -f backend/src/migrations/1756930000000-FranqueadosNovoscampos.ts
```

### **Componente não encontrado:**
Certifique-se que o componente está em:
```
frontend/components/franqueados/FranqueadoForm.tsx
```

### **Formulário não abre:**
Verifique no console do navegador se há erros de importação.

---

✨ **Implementação completa e funcional!** ✨
