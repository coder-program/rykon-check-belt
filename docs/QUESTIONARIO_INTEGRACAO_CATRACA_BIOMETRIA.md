# 📋 QUESTIONÁRIO - Integração Catraca e Biometria Facial

## 🎯 Objetivo
Coletar informações técnicas sobre o sistema de catraca e reconhecimento facial existente na unidade para definir a melhor estratégia de integração com o sistema web rykon-check-belt.

---

## 📍 INFORMAÇÕES DA UNIDADE

**Nome da Unidade:** _________________________________

**Responsável Técnico:** _________________________________

**Telefone/WhatsApp:** _________________________________

**Email:** _________________________________

---

## 🤖 SISTEMA DE RECONHECIMENTO FACIAL

### 1. Marca e Modelo

**Qual a marca do sistema de reconhecimento facial?**
- [ ] ControlID (iDFace, iDBox)
- [ ] Intelbras (SS 3530 MFA, VIP 1070 D)
- [ ] Hikvision (DS-K1T)
- [ ] ZKTeco (SpeedFace, UltraFace)
- [ ] Henry (Face Access)
- [ ] Outro: ____________________________

**Modelo específico (se souber):** _________________________________

---

### 2. Localização e Acesso

**Onde o sistema da catraca está instalado?**
- [ ] PC na recepção (Windows)
- [ ] PC na sala administrativa (Windows)
- [ ] Servidor local (Linux/Windows Server)
- [ ] Equipamento standalone (terminal com tela)
- [ ] Cloud/Internet
- [ ] Não sei

**Você tem acesso ao computador onde o software está instalado?**
- [ ] Sim, tenho acesso total (usuário e senha)
- [ ] Sim, mas acesso limitado
- [ ] Não, apenas o fornecedor tem acesso
- [ ] Não é necessário, é um equipamento standalone

---

### 3. Software de Gestão

**Qual software é usado para gerenciar o sistema facial?**
- [ ] Software que veio com o equipamento (nome: ____________)
- [ ] Tem interface web (acesso via navegador)
- [ ] Programa instalado no Windows
- [ ] Aplicativo mobile
- [ ] Não usa software, configura direto no aparelho
- [ ] Não sei

**Você consegue ver relatórios de entrada/saída dos alunos nesse software?**
- [ ] Sim, consigo ver em tempo real
- [ ] Sim, mas só no final do dia
- [ ] Não, apenas o fornecedor vê
- [ ] Não sei

---

### 4. Capacidades do Sistema

**O sistema facial RECONHECE automaticamente os alunos cadastrados?**
- [ ] Sim, reconhece sozinho pela face
- [ ] Não, precisa digitar matrícula antes
- [ ] Não, precisa passar cartão/tag antes
- [ ] Não sei como funciona

**Depois que reconhece, o que acontece?**
- [ ] Libera a catraca automaticamente
- [ ] Mostra na tela e operador libera manualmente
- [ ] Registra entrada mas não controla catraca
- [ ] Não sei

---

### 5. Conectividade e Rede

**O equipamento/PC está conectado à internet?**
- [ ] Sim, WiFi
- [ ] Sim, cabo de rede (Ethernet)
- [ ] Não, funciona offline
- [ ] Não sei

**Está na mesma rede WiFi/local que os tablets/computadores da unidade?**
- [ ] Sim, mesma rede
- [ ] Não, rede separada
- [ ] Não sei

**O fornecedor fez alguma integração com outro sistema?** (ex: ponto eletrônico, ERP)
- [ ] Sim (qual sistema?: ________________)
- [ ] Não, funciona isolado
- [ ] Não sei

---

## 🚪 CATRACA FÍSICA

### 6. Tipo e Modelo

**Qual tipo de catraca?**
- [ ] Catraca giratória (pedestal)
- [ ] Torniquete tripé
- [ ] Porta com trava eletrônica
- [ ] Cancela/portão automático
- [ ] Não tem catraca física (só reconhecimento)

**Marca da catraca:**
- [ ] Automatiza
- [ ] Henry
- [ ] Linear
- [ ] Nice
- [ ] Outro: ____________________________

---

### 7. Controle da Catraca

**O que controla a catraca?**
- [ ] Sistema facial (reconhece e libera automaticamente)
- [ ] Controladora separada (caixa com placa eletrônica)
- [ ] Operador aperta botão manual
- [ ] Não sei

**A catraca está conectada ao sistema facial?**
- [ ] Sim, libera automaticamente após reconhecimento
- [ ] Não, precisa operador liberar
- [ ] Não sei

---

## 💾 BANCO DE DADOS E DADOS

### 8. Armazenamento de Dados

**Onde ficam salvos os registros de entrada (logs)?**
- [ ] No próprio equipamento facial
- [ ] No computador com o software
- [ ] Em banco de dados (MySQL, SQL Server, etc)
- [ ] Na nuvem/internet
- [ ] Não sei

**Você tem acesso ao banco de dados?** (usuário e senha)
- [ ] Sim, tenho usuário e senha
- [ ] Não, apenas fornecedor tem
- [ ] Não usa banco de dados
- [ ] Não sei

---

### 9. Cadastro de Alunos

**Como os alunos são cadastrados no sistema facial?**
- [ ] Direto no equipamento (tira foto na hora)
- [ ] No software do PC (importa foto)
- [ ] Fornecedor faz remotamente
- [ ] Outro: ____________________________

**Os alunos têm um código/ID no sistema facial?**
- [ ] Sim, matrícula numérica
- [ ] Sim, código único
- [ ] Sim, CPF
- [ ] Não tem código, só nome
- [ ] Não sei

**Esse código/ID é o mesmo usado no sistema web atual?**
- [ ] Sim, mesmo código
- [ ] Não, código diferente
- [ ] Ainda não usam sistema web
- [ ] Não sei

---

## 🔌 INTEGRAÇÃO E API

### 10. Recursos de Integração

**O sistema facial tem alguma dessas opções?**
- [ ] API REST (endpoints HTTP)
- [ ] Webhook (pode chamar URL externa quando algo acontece)
- [ ] Exporta relatórios (Excel, CSV, TXT)
- [ ] SDK/biblioteca de integração
- [ ] Documentação técnica de integração
- [ ] Nenhuma opção de integração
- [ ] Não sei

**O fornecedor oferece suporte para integração?**
- [ ] Sim, já fez integrações antes
- [ ] Sim, mas cobra à parte
- [ ] Não oferece
- [ ] Não sei

---

## 📞 SUPORTE E FORNECEDOR

### 11. Contrato de Manutenção

**Tem contrato de manutenção ativo com o fornecedor?**
- [ ] Sim, mensal
- [ ] Sim, anual
- [ ] Não, só suporte quando chama
- [ ] Não sei

**Nome do fornecedor/empresa:** _________________________________

**Telefone do suporte:** _________________________________

**Email do suporte:** _________________________________

---

### 12. Documentação Disponível

**Você tem algum desses documentos?** (marcar todos que tem)
- [ ] Manual do equipamento
- [ ] Manual do software
- [ ] Documentação técnica (API, integração)
- [ ] Contrato de compra/instalação
- [ ] Login e senha do sistema
- [ ] Nenhum documento
- [ ] Não sei onde está

---

## 🎯 OBJETIVO DA INTEGRAÇÃO

### 13. O que você precisa?

**O que você quer que aconteça quando o aluno passar na catraca?**
- [ ] Registrar presença automática no sistema web
- [ ] Aparecer na tela de check-ins pendentes para aprovar
- [ ] Enviar notificação para responsáveis
- [ ] Gerar relatório de frequência
- [ ] Outro: ____________________________

**Prioridade:**
- [ ] Urgente (preciso já)
- [ ] Alta (próximas 2 semanas)
- [ ] Média (próximo mês)
- [ ] Baixa (quando der)

---

## 📸 ANEXOS ÚTEIS

**Se possível, tire fotos e envie:**
- [ ] Equipamento de reconhecimento facial (frente e etiqueta com modelo)
- [ ] Catraca completa
- [ ] Tela do software de gestão
- [ ] Controladora da catraca (se tiver)
- [ ] Etiqueta com informações técnicas (modelo, número de série)

**Se possível, faça prints de tela:**
- [ ] Interface do software de gestão
- [ ] Configurações de rede do equipamento
- [ ] Relatório de eventos/entradas
- [ ] Tela de cadastro de usuários

---

## ✅ OBSERVAÇÕES ADICIONAIS

**Alguma informação extra que possa ajudar?**

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

---

## 📋 CHECKLIST FINAL

Antes de enviar, confira se você:
- [ ] Identificou marca e modelo do sistema facial
- [ ] Sabe se tem acesso ao computador/software
- [ ] Sabe se está conectado à internet/rede local
- [ ] Tirou fotos do equipamento
- [ ] Pegou contato do fornecedor
- [ ] Anotou qual o resultado esperado da integração

---

**Data de Preenchimento:** ___/___/______

**Preenchido por:** _________________________________

**Cargo:** _________________________________

---

## 📞 PRÓXIMOS PASSOS

Após preencher este questionário:
1. Enviar para equipe técnica
2. Anexar fotos/prints de tela
3. Aguardar análise técnica (1-2 dias)
4. Receber proposta de integração personalizada

**Dúvidas durante o preenchimento?**
WhatsApp: ___________________
Email: ___________________
