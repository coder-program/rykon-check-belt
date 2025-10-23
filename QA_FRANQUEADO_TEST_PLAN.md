# 🧪 Plano de Testes QA – Perfil Franqueado

Este plano descreve testes executáveis para operações do Franqueado (criar franquia, criar unidade, cadastrar usuários de unidade) e inclui histórias para Jira prontas para colar.

---

## Escopo e Pré-condições

- Escopo: operações do Franqueado para iniciar a operação (franquia → unidade → usuários).
- Pré-condições:
  - Usuário com perfil FRANQUEADO ativo e com acesso ao sistema.
  - Backend e Frontend em execução no ambiente de QA ou local.
  - Ao menos 1 unidade criada pelo próprio franqueado (será criada no caso 3).

## Critérios de Aceite Gerais

- O franqueado só visualiza e opera dados da sua própria franquia e unidades.
- Criação da franquia via “minha franquia” entra com situação EM_HOMOLOGACAO.
- Criação/edição de unidade e usuários respeita validações de DTO (máscaras, enums, obrigatórios).
- O checkbox “Deixar ativo” no cadastro de usuário controla se irá para “Usuários” (ativo) ou “Usuários Pendentes” (inativo).

---

## Casos de Teste Prioritários (passos + resultados esperados)

1. Franqueado cria sua franquia

- Passos:
  1. Logar como FRANQUEADO.
  2. Acessar “Minha Franquia” e preencher dados mínimos (nome, CNPJ, contato e endereço quando aplicável).
  3. Salvar.
- Esperado:
  - Franquia criada vinculada ao usuário logado (usuario_id).
  - Campo situacao = EM_HOMOLOGACAO.
  - GET “/franqueados/me” retorna total_unidades = 0.

2. Franqueado atualiza sua própria franquia

- Passos: Editar um campo permitido (ex.: nome_fantasia) e salvar.
- Esperado: Atualização persistida; não é possível editar franquias de outros usuários.

3. Criar unidade vinculada à franquia

- Passos:
  1. Acessar “Unidades” > “Criar”.
  2. Franqueado_id deve ser da própria franquia (UI deve preencher/restringir automaticamente).
  3. Preencher identificação (nome, CNPJ, razão social), contato (telefones/emails), responsável (nome, CPF, papel, contato) e salvar.
- Esperado:
  - Unidade criada com status HOMOLOGACAO (padrão).
  - GET “/unidades” lista a unidade.
  - GET “/franqueados/me” retorna total_unidades incrementado (ex.: 1).

4. Listar unidades filtradas por franquia (escopo)

- Passos: Acessar listagem de unidades logado como franqueado.
- Esperado: Somente unidades da franquia do usuário devem aparecer.

5. Restrição de acesso a recursos de outras franqui as

- Passos: Tentar abrir/editar uma unidade que não pertence à franquia via URL direta.
- Esperado: Acesso negado (403) ou redirecionamento/erro conforme política do sistema.

6. Cadastro de usuário – Gerente de Unidade (ativo)

- Passos:
  1. Acessar “Admin > Cadastrar Usuário”.
  2. Selecionar perfil GERENTE_UNIDADE.
  3. Preencher dados básicos, selecionar a unidade e marcar “Deixar ativo”.
  4. Salvar.
- Esperado:
  - Usuário aparece em “/admin/usuarios”.
  - Na tabela “unidades”, campo “responsavel_cpf” = CPF do gerente (sem máscara).

7. Cadastro de usuário – Recepcionista (inativo)

- Passos:
  1. Selecionar perfil RECEPCIONISTA.
  2. Preencher dados básicos + (opcionais) turno/horários.
  3. Não marcar “Deixar ativo”.
  4. Salvar.
- Esperado:
  - Usuário aparece em “/admin/usuarios-pendentes”.
  - Registro em “recepcionista_unidades” com turno/horários preenchidos quando informados.

8. Cadastro de usuário – Professor/Instrutor (ativo)

- Passos:
  1. Selecionar perfil PROFESSOR (ou INSTRUTOR).
  2. Preencher obrigatórios: data_nascimento, gênero, faixa_ministrante, unidade.
  3. Marcar “Deixar ativo” e salvar.
- Esperado:
  - Usuário em “/admin/usuarios”.
  - Registro em “professores” com dados obrigatórios.
  - Registro em “professor_unidades” com is_principal = true.

9. Fluxo de aprovação – usuário inativo

- Passos: Cadastrar qualquer perfil com “Deixar ativo” desmarcado; aprovar conforme fluxo.
- Esperado: Usuário migra de pendentes para ativos após aprovação.

---

## Checklist de Smoke (rápido)

- [ ] Login FRANQUEADO exibe “Minha Franquia”.
- [ ] Criar franquia → EM_HOMOLOGACAO.
- [ ] Criar unidade → visível e HOMOLOGACAO.
- [ ] Escopo: ver apenas unidades da própria franquia.
- [ ] GERENTE ativo atualiza responsavel_cpf.
- [ ] RECEPCIONISTA inativo vai para pendentes e cria vínculo.
- [ ] PROFESSOR/INSTRUTOR ativo cria professores + professor_unidades.

---

## Dados de Teste Sugeridos

- CNPJ (franquia/unidade): 12.345.678/0001-90
- CPF (responsável/usuários): 123.456.789-00
- Telefone: (11) 98765-4321
- E-mail: qa+franqueado@teste.com / qa+unidade@teste.com

---

## Histórias para Jira (copiar e colar)

EPIC: Operações do Franqueado

1. Story: Como Franqueado, cadastrar minha franquia

- Critérios de aceite:
  - Dado que estou autenticado como FRANQUEADO
  - Quando preencho os dados mínimos e salvo
  - Então a franquia é criada com situacao = EM_HOMOLOGACAO e vinculada ao meu usuário

2. Story: Atualizar minha franquia

- Critérios de aceite:
  - Não posso editar franquias de outros usuários
  - Edição persiste campos permitidos

3. Story: Criar unidade da minha franquia

- Critérios de aceite:
  - Unidade nasce com status HOMOLOGACAO
  - Listas só mostram unidades da minha franquia

4. Story: Restringir acesso a unidades de outras franquias

- Critérios de aceite:
  - Acesso direto por URL retorna 403/erro conforme política

5. Story: Cadastrar usuário – Gerente de Unidade (ativo)

- Critérios de aceite:
  - “Deixar ativo” marca usuário como ATIVO
  - Campo “responsavel_cpf” da unidade é atualizado com CPF do gerente

6. Story: Cadastrar usuário – Recepcionista (pendente)

- Critérios de aceite:
  - Sem “Deixar ativo”, usuário vai para pendentes
  - Vínculo em “recepcionista_unidades” é criado (com turno/horários quando informados)

7. Story: Cadastrar usuário – Professor/Instrutor (ativo)

- Critérios de aceite:
  - Campos obrigatórios (data_nascimento, gênero, faixa_ministrante) são validados
  - Cria “professores” e vínculo “professor_unidades (is_principal = true)”

8. Story: Aprovar usuário pendente

- Critérios de aceite:
  - Ao aprovar, usuário migra para lista de ativos e recebe os acessos previstos

---

Observação: Este plano complementa o documento `CADASTRO_USUARIO_FRANQUEADO_COMPLETO.md`, que detalha campos, validações e efeitos de banco de dados. A execução dos casos acima deve refletir os comportamentos descritos lá.
