Requisitos Funcionais – Cadastro de Unidade
📌 Identificação da Unidade

Cadastrar uma unidade vinculada a uma franquia.

Campos obrigatórios:

Nome da Unidade (ex: “Gracie Barra – Moema”)

CNPJ (único por unidade)

Razão Social

Nome Fantasia (opcional)

Inscrição Estadual (opcional)

Inscrição Municipal (opcional)

Código interno da unidade (gerado automaticamente ou definido pela franquia)

📌 Contato

Telefone fixo (opcional)

Telefone celular / WhatsApp (obrigatório)

E-mail da unidade (obrigatório, único)

Website (opcional)

Redes sociais (Instagram, Facebook, YouTube, etc. – opcionais)

📌 Endereço

Logradouro (Rua/Avenida)

Número

Complemento (opcional)

Bairro

Cidade

Estado

CEP

📌 Responsável Técnico (Instrutor Principal)

Nome completo

CPF (único)

Faixa e graduação (ex: faixa-preta 2º grau)

Registro na federação/confederação (CBJJ, IBJJF, etc.)

Telefone / WhatsApp

E-mail

📌 Estrutura da Unidade

Capacidade máxima de alunos (número)

Área do tatame (m²)

Quantidade de instrutores (número)

Modalidades oferecidas (checkbox múltiplo: Infantil, Adulto, Feminino, Competição, Defesa Pessoal, etc.)

Horário de funcionamento (texto ou tabela de horários)

📌 Administração

Data de cadastro da unidade (automático)

Situação (Ativa, Inativa, Em homologação)

Vinculação: cada unidade deve estar ligada a uma franquia (matriz).

✅ Regras de Negócio

Cada unidade deve estar vinculada a uma franquia.

CNPJ da unidade é único (não pode repetir).

E-mail da unidade também deve ser único.

Cada unidade deve ter ao menos 1 instrutor faixa-preta cadastrado como responsável técnico.

Se a franquia for inativada, todas as unidades vinculadas também devem ser marcadas como inativas.

✅ Requisitos Não Funcionais

Validação automática de CNPJ, CPF, e-mail e CEP.

Segurança: dados pessoais (CPF, contato do responsável) devem ser protegidos.

Usabilidade: cadastro em passos (wizard) para facilitar preenchimento.

Escalabilidade: permitir muitas unidades por franquia sem perda de performance.

👉 Assim, o sistema terá:

Cadastro de franquias (matriz)

Cadastro de unidades (academias franqueadas, vinculadas à matriz)
