# Sistema TeamCruz — Controle de Presença e Grau (Faixas)

MVP para **controle de presença** e **progressão de grau** (listras) com a regra: **1 grau a cada 20 aulas** (configurável).

---

## 1) Objetivo do Sistema

- Registrar presenças dos alunos de forma simples (QR, lista, totem).
- Acompanhar automaticamente a evolução de **graus** por faixa conforme **aulas acumuladas**.
- Fornecer visibilidade para professores, alunos e administração.

## 2) Personas & Perfis de Acesso

- **Administrador**: gerencia unidades, turmas, professores, regras de grau, relatórios e integrações.
- **Professor/Instrutor**: abre/encerra aula, faz chamada, lança correções, aprova/ajusta graus.
- **Recepção**: confere matrícula/estado do aluno, ajuda no check-in.
- **Aluno/Responsável**: consulta presenças, progresso para próximo grau, notificações.

## 3) Escopo Funcional

### 3.1 Cadastro

- **Alunos**: nome, CPF (opcional), data nasc., contato, **faixa atual**, **graus atuais (0–4)**, **aulas acumuladas p/ próximo grau**, status (ativo/inativo), atestado médico (opcional), LGPD consent.
- **Faixas**: ordem (branca → azul → roxa → marrom → preta), **limite de graus por faixa** (padrão 4), cores, exigências.
- **Regras de Progresso**: **aulas_por_grau = 20 (padrão)**, configurável por faixa/turma; **máx_graus_por_faixa = 4**; política de arredondamento; carência mínima entre graus (opcional).
- **Turmas**: nome, professor, local, horários, capacidade, tipo (kids/adulto/competição), unidade.

### 3.2 Presença

- **Abertura de Aula** (professor): define turma, data/hora, duração.
- **Check-in** do aluno:
  - Via **QR Code** (carteirinha/app).
  - Via **totem/recepção**.
  - Via **lista do professor** (manual, inclusive offline).
- **Validações**: aluno ativo, turma correta, prevenção de duplicidade no mesmo horário.
- **Correções**: permitir editar/excluir presença com auditoria (quem/quando/porquê).

### 3.3 Progressão de Grau (Automática + Manual)

- **Regra base**: a cada **20 presenças válidas** desde o último grau, **+1 grau** (stripe).
- **Limite**: ao atingir **4 graus**, aluno fica **elegível** à **próxima faixa** (promoção **manual/administrativa** com opção de “evento de graduação”).
- **Configuração**:
  - Aulas necessárias por grau podem variar por faixa/turma.
  - Permitir **peso** diferente para tipos de treino (ex.: competição = 1.5 aula? opcional).
  - **Carência** mínima entre graus (dias/semanas) opcional.
- **Ajustes manuais**: instrutor pode conceder/remover grau com justificativa e registro em auditoria.

### 3.4 Relatórios & Indicadores

- **Aluno**: total de presenças, presenças no mês, aulas restantes para próximo grau, histórico de graus/faixas.
- **Professor/Turma**: presença por aula/turma, rankings de assiduidade, alunos próximos do grau, taxa de faltas.
- **Admin**: evolução geral, distribuição por faixas, próximos graduáveis, taxa de retenção, heatmap de horários.

### 3.5 Notificações

- **Push/E-mail/WhatsApp** (fases):
  - Check-in confirmado.
  - “Faltam X aulas para seu próximo grau.”
  - “Parabéns, você ganhou 1 grau!”
  - “Elegível para graduação de faixa.”
- **Lembretes**: alunos com ausência longa (ex.: 14 dias).

### 3.6 Auditoria & LGPD

- **Registro de alterações** (presenças, graus, faixas) com quem/quando/motivo.
- **Consentimento LGPD**, política de privacidade, direito de exclusão/anonimização.
- **Exportação** de dados (CSV/Excel/PDF) para o titular.

---

## 4) Regras de Negócio (principais)

1. **A cada 20 presenças** válidas desde o último grau: **conceder 1 grau**.
2. **Máximo 4 graus por faixa**; ao alcançar 4, aluno fica **elegível** à promoção de faixa (ação manual do instrutor/admin).
3. **Presença válida** é única por aluno/aula e vinculada a uma aula aberta oficialmente.
4. **Regras configuráveis** por unidade/turma/faixa:
   - `aulas_por_grau` (default 20)
   - `max_graus_por_faixa` (default 4)
   - `peso_por_tipo_de_aula` (default 1.0)
   - `carencia_dias_entre_graus` (default 0)
5. **Correções** apenas por professor/admin; toda alteração gera **auditoria**.
6. **Promoção de faixa** zera os graus e reinicia o contador para a nova faixa (mantendo excedente, se configurado).

---

## 5) Fluxos Principais

### 5.1 Check-in (QR)

1. Professor abre aula (turma, horário).
2. Aluno apresenta QR/totem → valida matrícula/ativo → grava presença.
3. Sistema atualiza **contador desde o último grau**.
4. Se `contador >= aulas_por_grau`:
   - Concede **+1 grau**, subtrai `aulas_por_grau` do contador (mantém excedente).
   - Notifica aluno/professor.

### 5.2 Correção de Presença

1. Professor seleciona aula → edita/insere/exclui presença.
2. Sistema recalcula progresso do(s) aluno(s).
3. Auditoria com justificativa.

### 5.3 Promoção de Faixa

1. Aluno com **4 graus** fica **elegível**.
2. Instrutor aprova promoção (data/evento) → **faixa++**, **graus=0**, contador pode manter excedente.
3. Gera certificado/registro e notifica.

---

## 6) Modelo de Dados (proposta simplificada)

- **aluno**: id, nome, documento, dt_nasc, contato, **faixa_atual**, **graus_atual (0–4)**, **aulas_desde_ultimo_grau**, status, consent_lgpd, created_at, updated_at
- **faixa**: id, nome (branca, azul, …), ordem, cor, **max_graus (default 4)**, ativo
- **turma**: id, nome, tipo (kids/adulto/comp), professor_id, unidade_id, capacidade, horarios, ativo
- **aula**: id, turma_id, data_hora_inicio, data_hora_fim, status (aberta/fechada), created_by
- **presenca**: id, aula_id, aluno_id, status (presente/cancelada), modo_registro (qr, totem, manual), created_at, created_by
- **regra_progresso**: id, escopo (global/unidade/turma/faixa), **aulas_por_grau**, **max_graus**, **carencia_dias**, **peso_tipo_aula_json**
- **historico_grau**: id, aluno_id, faixa_id, grau_num (1..4), data_concessao, origem (auto/manual), justificativa, created_by
- **historico_faixa**: id, aluno_id, faixa_origem_id, faixa_destino_id, data_promocao, evento, created_by
- **auditoria**: id, entidade, entidade_id, acao, before_json, after_json, actor_id, timestamp

> **Diagrama ER** em PNG incluso neste pacote: `teamcruz_erd.png`

---

## 7) APIs (REST — exemplos)

- **POST /aulas** (abrir aula)
- **POST /aulas/{id}/presencas** (check-in: `{aluno_id, modo}`)
- **DELETE /aulas/{id}/presencas/{presenca_id}** (corrigir)
- **GET /alunos/{id}/progresso** → `{faixa, graus, faltam_aulas, elegivel_promocao}`
- **POST /alunos/{id}/graus/ajuste** `{delta, motivo}` (admin)
- **POST /alunos/{id}/promover-faixa** `{faixa_destino, evento?}`
- **GET /relatorios/turma/{id}/presencas?mes=YYYY-MM**
- **GET /rankings/assiduidade?periodo=…**
- **GET /config/regras** / **PUT /config/regras**

> **Eventos (futuro)**: `grau.concedido`, `faixa.promovida`, `aluno.elegivel`.

---

## 8) Requisitos Não Funcionais

- **Disponibilidade**: 99,5% (MVP).
- **Performance**: check-in < 2s; relatórios < 5s (até 10k presenças/mês).
- **Segurança**: JWT/OAuth2, RBAC por perfil, criptografia em repouso (PII), HTTPS.
- **LGPD**: consentimento, minimização de dados, export/erase on demand.
- **Auditoria** total de mudanças sensíveis.
- **Escalabilidade**: stateless API + cache (Redis), filas para notificações.
- **Observabilidade**: logs estruturados, métricas e tracing.

---

## 9) Interface (MVP)

- **Totem/Recepção**: ler QR, busca por nome, status do aluno (cores).
- **App/Portal do Aluno**: barra de progresso para próximo grau, histórico, QR pessoal.
- **Painel do Professor**: abrir/fechar aula, chamada rápida, “próximos a ganhar grau”.
- **Admin**: dashboards, configs, exportações, auditoria.

---

## 10) Regras de Cálculo — Detalhes

- **Excedente**: ao ganhar grau, **subtrair 20** do contador e **manter excedente** (ex.: 23 → +1 grau e fica com 3).
- **Carência (opcional)**: se não passaram `carencia_dias` desde o último grau, **não concede**, apenas acumula.
- **Pesos por tipo de aula (opcional)**: presença soma `peso` (ex.: 1.5) ao contador.

---

## 11) Casos Limite & Governança

- Presença duplicada no mesmo horário → rejeitar.
- Retroatividade (lançar presença atrasada) → permitido com auditoria e recálculo.
- Troca de faixa manual indevida → bloquear se não elegível (ou permitir override com justificativa).
- Aluno inativo não pode marcar presença.
- Merge de cadastro duplicado (futuro).

---

## 12) Testes & Aceite (MVP)

- **Unitários**: cálculo de grau (simples, excedente, carência, pesos).
- **Integração**: check-in → grau automático; correção → recálculo.
- **E2E**: 20 presenças → 1 grau; 80 presenças → 4 graus e elegibilidade de faixa.
- **Carga**: 200 check-ins/min.

**Critérios de Aceite (exemplos)**

- Dado aluno com 19 aulas desde o último grau, ao registrar 1 presença, então `grau++` e `faltam_aulas` reinicia conforme regra.
- Dado aluno com 4 graus, sistema mostra **“Elegível a promoção de faixa”** e bloqueia novo grau até promoção.

---

## 13) Roadmap Sugerido

1. **M1**: cadastro básico, abrir aula, check-in, cálculo de grau, painéis professor/aluno.
2. **M2**: correções com auditoria, relatórios, notificações.
3. **M3**: pesos por tipo de aula, carência, multiunidade, eventos de graduação.
4. **M4**: integrações (pagamentos, CRM), app mobile.

---

## 14) Tecnologias (sugestão)

- **Frontend (PWA)**: Next.js/React **com Service Worker** (ex.: `next-pwa` ou Workbox), `manifest.json`, suporte a **instalação em tela inicial** e **modo tela cheia**; **Tailwind + shadcn/ui** para layout moderno; **função offline básica** (cache da tela de login e assets críticos); acesso à **câmera** via `MediaDevices.getUserMedia()` para leitura de QR.
- **Backend**: NestJS/Node ou Spring Boot; **DB**: PostgreSQL; **Cache**: Redis.
- **Auth**: Keycloak ou Cognito (RBAC).
- **Infra**: Docker, CI/CD, Prometheus/Grafana, **HTTPS obrigatório**.
- **QR**: UUID por aluno + token rotativo (opcional).
