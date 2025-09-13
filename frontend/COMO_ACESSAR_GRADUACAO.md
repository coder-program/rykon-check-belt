# 📍 Como Acessar o Sistema de Graduação

## 🚀 Acesso Rápido

### Opção 1: Via Dashboard Principal

1. Acesse o sistema: `http://localhost:3000`
2. Faça login com suas credenciais
3. No Dashboard, procure pelo card **"TeamCruz Jiu-Jitsu"** (card vermelho/laranja)
4. Clique no card para acessar o sistema completo

### Opção 2: Acesso Direto

- URL direta: `http://localhost:3000/teamcruz`

## 📊 Funcionalidades Disponíveis

Uma vez na página TeamCruz, você terá acesso às seguintes abas:

### 1. **Visão Geral** (Aba inicial)

- **Cards de estatísticas**: Total de alunos, aulas hoje, próximos graduáveis, presenças
- **Próximos a Receber Grau**: Lista com dados REAIS do backend mostrando:
  - Nome do aluno
  - Faixa atual com visual de graus
  - Quantidade de aulas faltantes
  - Barra de progresso
  - Filtros por categoria (Kids/Adulto)
  - Busca por nome
  - Ordenação por aulas faltantes

### 2. **Check-in**

- Sistema de presença para as aulas

### 3. **Alunos**

- Lista completa de alunos

### 4. **Professores**

- Gestão de professores

### 5. **Graduações**

- Sistema dedicado de graduações
- Próximos a graduar
- Histórico de graduações

### 6. **Outras funcionalidades**

- Unidades
- Aulas
- Comunidade
- Campanhas
- Loja Virtual

## 🔧 Verificando a Integração

Para verificar se os dados reais estão sendo carregados:

1. Abra o console do navegador (F12)
2. Vá para a aba "Rede" (Network)
3. Acesse a página TeamCruz
4. Procure por requisições para `/api/graduacao/proximos-graduar`
5. Se houver erro, verifique:
   - Se o backend está rodando
   - Se as migrações foram executadas
   - Se há dados na tabela de graduações

## ⚠️ Troubleshooting

### Se não aparecer nenhum dado:

1. Verifique se o backend está rodando: `npm run dev` (na pasta backend)
2. Verifique se o frontend está rodando: `npm run dev` (na pasta frontend)
3. Verifique os logs do console para erros

### Se aparecerem apenas dados mockados:

- O sistema tem fallback para dados de exemplo se a API falhar
- Verifique a conexão com o backend
- Confirme que as tabelas do banco foram populadas

## 📱 Recursos Visuais

O sistema inclui:

- **Faixas coloridas**: Visual realista das faixas de Jiu-Jitsu
- **Graus**: Representação visual dos graus em cada faixa
- **Kids e Adulto**: Diferenciação visual entre categorias
- **Virtualização**: Performance otimizada para grandes listas
- **Auto-atualização**: Dados atualizados a cada 30 segundos

## 🎯 Fluxo de Navegação

```
Login → Dashboard → Card "TeamCruz Jiu-Jitsu" → Sistema Completo
                                                 ├── Visão Geral (com graduações)
                                                 ├── Check-in
                                                 ├── Alunos
                                                 ├── Graduações
                                                 └── Outras abas...
```

## 💡 Dica

Para desenvolvimento e testes, você pode acessar diretamente:

- `http://localhost:3000/teamcruz` - Sistema completo com graduações integradas
