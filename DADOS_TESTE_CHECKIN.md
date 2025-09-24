# 🧪 Dados Fictícios para Teste do Sistema de Check-in

## 📋 Alunos Criados para Teste

### 1. **João Silva Santos** (TC00001)
- **ID**: `4b770747-02e7-4712-9b3f-83ce306d8719`
- **CPF**: `12345678901`
- **Telefone**: `11987654321`
- **Email**: `joao.silva@email.com`
- **Faixa**: Branca (2º grau)
- **Aulas desde último grau**: 15

### 2. **Maria Oliveira Costa** (TC00002)
- **ID**: `0abede3a-f265-47ee-8bdb-ce8427e0b6a7`
- **CPF**: `98765432109`
- **Telefone**: `11876543210`
- **Email**: `maria.oliveira@email.com`
- **Faixa**: Cinza (1º grau)
- **Aulas desde último grau**: 8

### 3. **Pedro Rodrigues Lima** (TC00003)
- **ID**: `5ebd4b46-e14a-47ec-b3cf-a142de7bd57a`
- **CPF**: `45678912345`
- **Telefone**: `11765432109`
- **Email**: `pedro.lima@email.com`
- **Faixa**: Branca (3º grau)
- **Aulas desde último grau**: 22 (elegível para promoção!)

### 4. **Ana Paula Ferreira** (TC00004)
- **ID**: `aea68283-3c95-476d-8076-4c04a45691df`
- **CPF**: `78912345678`
- **Telefone**: `11654321098`
- **Email**: `ana.ferreira@email.com`
- **Faixa**: Amarela (0º grau)
- **Aulas desde último grau**: 5

### 5. **Carlos Eduardo Souza** (TC00005)
- **ID**: `781fcafc-c063-4ff0-b96c-9339510ad449`
- **CPF**: `32165498765`
- **Telefone**: `11543210987`
- **Email**: `carlos.souza@email.com`
- **Faixa**: Branca (4º grau)
- **Aulas desde último grau**: 35 (elegível para próxima faixa!)

## 🏢 Informações da Unidade

### TeamCruz Matriz
- **ID**: `d005d686-e975-4c68-a205-188103e48113`
- **Nome**: TeamCruz Matriz

## 🧪 Como Testar o Check-in

### 1. **Teste via Tablet/App** (Busca por CPF/Telefone)
```
1. Acesse a aba "Tablet/App"
2. Digite um CPF ou telefone dos alunos acima
3. Clique em "Buscar"
4. Insira o ID da unidade: d005d686-e975-4c68-a205-188103e48113
5. Clique em "Registrar Presença"

Exemplos para testar:
- CPF: 12345678901 (João)
- Telefone: 11876543210 (Maria)
- CPF: 45678912345 (Pedro)
```

### 2. **Teste via QR Code** (ID direto)
```
1. Acesse a aba "QR Code"
2. Digite um ID de aluno dos listados acima OU use a câmera
3. Insira o ID da unidade: d005d686-e975-4c68-a205-188103e48113
4. Clique em "Registrar Presença"

Exemplos para testar:
- ID do João: 4b770747-02e7-4712-9b3f-83ce306d8719
- ID da Maria: 0abede3a-f265-47ee-8bdb-ce8427e0b6a7
- ID do Pedro: 5ebd4b46-e14a-47ec-b3cf-a142de7bd57a
```

### 3. **QR Code Estruturado** (JSON)
Para testar com QR Code contendo tanto aluno quanto unidade:
```json
{
  "alunoId": "4b770747-02e7-4712-9b3f-83ce306d8719",
  "unidadeId": "d005d686-e975-4c68-a205-188103e48113"
}
```

## 📊 Resultados Esperados

### Progresso Calculado:
- **João**: 15/20 aulas = 75% para próximo grau
- **Maria**: 8/20 aulas = 40% para próximo grau  
- **Pedro**: 22/20 aulas = 100%+ (elegível para 4º grau!)
- **Ana**: 5/20 aulas = 25% para próximo grau
- **Carlos**: 35/20 aulas = 100%+ (elegível para Cinza!)

### Próximas Graduações:
- **João**: Branca 3º grau
- **Maria**: Cinza 2º grau
- **Pedro**: Branca 4º grau  
- **Ana**: Amarela 1º grau
- **Carlos**: Cinza 0º grau

## 🚀 Como Executar Testes

1. **Inicie o backend**: `npm run start:dev` (na pasta backend)
2. **Inicie o frontend**: `npm run dev` (na pasta frontend)
3. **Acesse**: `http://localhost:3000/checkin`
4. **Teste** com os dados acima
5. **Verifique** os resultados de progresso

## 🔄 Reset dos Dados
Para limpar os dados de teste:
```sql
DELETE FROM teamcruz.presencas WHERE aluno_id IN (
  SELECT id FROM teamcruz.alunos WHERE numero_matricula LIKE 'TC%'
);
DELETE FROM teamcruz.alunos WHERE numero_matricula LIKE 'TC%';
```
