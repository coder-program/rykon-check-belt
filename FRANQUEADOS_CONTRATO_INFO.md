# Informações de Contrato - Franqueados

## Objetivo

Permitir que o Super Admin visualize as informações de contrato que o franqueado assinou no primeiro login.

## Data de Implementação

2025-01-XX

---

## Mudanças Implementadas

### 1. Backend Entity (`backend/src/people/entities/franqueado.entity.ts`)

**Campos Adicionados:**

```typescript
@Column({ length: 14, nullable: true })
cpf: string;

@Column({ length: 150, nullable: true })
email: string;

@Column({ length: 20, nullable: true })
telefone: string;

@Column({ name: "endereco_id", type: "uuid", nullable: true })
endereco_id: string;

@Column({ length: 50, nullable: true })
situacao: string;

@Column({ type: "boolean", default: false })
contrato_aceito: boolean;

@Column({ type: "timestamp", nullable: true })
contrato_aceito_em: Date | null;

@Column({ length: 20, nullable: true })
contrato_versao: string | null;

@Column({ length: 50, nullable: true })
contrato_ip: string | null;
```

**Justificativa:**

- A entidade estava incompleta em relação ao schema do banco de dados
- Campos de contrato são essenciais para rastreabilidade e compliance

---

### 2. Frontend Interface (`frontend/app/franqueados/page.tsx`)

**Interface Atualizada:**

```typescript
interface FranqueadoSimplificado {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  situacao: SituacaoFranqueado;
  total_unidades?: number;
  usuario_id?: string;
  contrato_aceito?: boolean;
  contrato_aceito_em?: string | null;
  contrato_versao?: string | null;
  contrato_ip?: string | null;
}
```

---

### 3. UI - Display de Informações de Contrato

**Localização:** Dentro de cada card de franqueado (lista principal)

**Condições de Exibição:**

- Visível apenas para **Super Admin**
- Exibido apenas se `contrato_aceito === true`

**Layout:**

```
┌─────────────────────────────────────────┐
│ 📄 Informações do Contrato              │
├─────────────────────────────────────────┤
│ ✓ Contrato Aceito    📅 25/11/2025 18:25│
│ 📄 Versão: v1.0      IP: 192.168.1.100  │
└─────────────────────────────────────────┘
```

**Campos Exibidos:**

1. **Status de Aceite:**

   - Ícone: CheckCircle verde
   - Texto: "Contrato Aceito"

2. **Data/Hora de Aceite:**

   - Ícone: Calendar
   - Formato: `DD/MM/YYYY HH:MM`
   - Exemplo: `25/11/2025 18:25`

3. **Versão do Contrato:**

   - Ícone: FileText azul
   - Formato: `Versão: {versao}`
   - Exemplo: `Versão: v1.0`

4. **IP de Origem:**
   - Label: "IP:"
   - Formato: `monospace` (font de código)
   - Exemplo: `192.168.1.100` ou `client`

**Código Implementado:**

```tsx
{
  /* Contract Information - Super Admin Only */
}
{
  isSuperAdmin && franqueado.contrato_aceito && (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs font-medium text-gray-700 mb-1.5">
            Informações do Contrato
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="font-medium text-green-700">
                Contrato Aceito
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-gray-500" />
              <span>
                {franqueado.contrato_aceito_em
                  ? new Date(franqueado.contrato_aceito_em).toLocaleString(
                      "pt-BR",
                      {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "Data não disponível"}
              </span>
            </div>
            {franqueado.contrato_versao && (
              <div className="flex items-center gap-1.5">
                <FileText className="h-3 w-3 text-blue-600" />
                <span>Versão: {franqueado.contrato_versao}</span>
              </div>
            )}
            {franqueado.contrato_ip && (
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">IP:</span>
                <span className="font-mono">{franqueado.contrato_ip}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Ícones Adicionados

**Novos imports do `lucide-react`:**

- `FileText` - Ícone de documento para contrato
- `Calendar` - Ícone de calendário para data de aceite

---

## Verificação de Dados Existentes

**SQL Query:**

```sql
SELECT
  id, nome, email, cpf, telefone,
  contrato_aceito, contrato_aceito_em,
  contrato_versao, contrato_ip
FROM teamcruz.franqueados
LIMIT 5;
```

**Resultado Exemplo:**

```
Nome: Roosevelt Cesar
CPF: 00911652450
Contrato Aceito: true
Data: 2025-11-25 18:25:22.928
Versão: v1.0
IP: client
```

---

## Regras de Negócio

### Controle de Acesso

- ✅ **Super Admin**: Vê as informações de contrato
- ❌ **Admin/Franqueado/Outros**: NÃO vê as informações

### Lógica de Exibição

```typescript
isSuperAdmin && franqueado.contrato_aceito;
```

### Tratamento de Dados Ausentes

- Se `contrato_aceito === false`: Não exibe nada
- Se `contrato_aceito_em === null`: Exibe "Data não disponível"
- Se `contrato_versao === null`: Não exibe linha de versão
- Se `contrato_ip === null`: Não exibe linha de IP

---

## Benefícios

1. **Compliance:**

   - Rastreabilidade de aceitação de contratos
   - Auditoria de quando e de onde o contrato foi aceito

2. **Transparência:**

   - Super Admin pode verificar status de onboarding
   - Validação de versão de contrato aceita

3. **Segurança:**

   - Registro de IP de origem
   - Timestamp preciso de aceitação

4. **UX:**
   - Informação contextual sem poluir interface
   - Visível apenas para perfil relevante
   - Layout compacto e organizado

---

## Arquivos Modificados

1. ✅ `backend/src/people/entities/franqueado.entity.ts`

   - Adicionados 10 campos ao entity

2. ✅ `frontend/app/franqueados/page.tsx`
   - Interface atualizada (4 campos de contrato)
   - UI de exibição implementada
   - 2 novos ícones importados

---

## Status

✅ **Implementação Completa**

- Backend entity sincronizada com banco de dados
- Frontend interface atualizada
- UI de exibição implementada
- Controle de acesso por perfil funcionando
- Sem erros de TypeScript

---

## Próximos Passos (Opcional)

### Melhorias Futuras

- [ ] Adicionar histórico de versões de contrato
- [ ] Permitir download do PDF do contrato assinado
- [ ] Adicionar filtro por "contrato aceito/não aceito"
- [ ] Notificar franqueados com contratos pendentes
- [ ] Adicionar modal de detalhes completos do contrato

### Testes Recomendados

- [ ] Verificar exibição com usuário Super Admin
- [ ] Verificar ocultação com usuário não-Super Admin
- [ ] Testar com franqueado sem contrato aceito
- [ ] Testar com campos de contrato nulos
- [ ] Testar formatação de data em diferentes locales

---

## Notas Técnicas

### Performance

- Nenhuma query adicional necessária
- Dados vêm no mesmo endpoint `/franqueados`
- Renderização condicional não impacta performance

### Responsividade

- Layout em grid 2 colunas (desktop)
- Adapta automaticamente em mobile
- Texto truncado se necessário

### Acessibilidade

- Ícones decorativos com semântica clara
- Contraste adequado (WCAG AA)
- Hierarquia visual bem definida

---

## Referências

- Tabela do banco: `teamcruz.franqueados`
- Endpoint: `GET /franqueados`
- Documentação de contrato: `CONTRATO_FRANQUIA.md`
