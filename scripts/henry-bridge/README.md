# Henry Bridge - Guia de Instalação

## O que é isso?

A catraca Henry Primme SF não envia HTTP - ela usa protocolo TCP proprietário.
Este script roda em um computador local na Team Cruz, conecta na catraca via TCP
e repassa os eventos para o backend da Rykon na nuvem.

```
[Catraca Henry]  ---TCP/192.168.100.163:3000--->  [Este script no PC Local]
                                                          |
                                                   HTTPS via internet
                                                          |
                                                  [Backend Railway/Nuvem]
```

---

## Requisitos

- Um computador **Windows** ligado na mesma rede que a catraca
- [Node.js LTS](https://nodejs.org) instalado
- Internet para acessar o backend Railway

---

## Instalação (5 minutos)

### 1. Instalar Node.js (se não tiver)
Baixe em: https://nodejs.org  
Escolha a versão **LTS** e instale normalmente.

### 2. Copiar os arquivos

Copie esta pasta `henry-bridge` para o computador local.  
Exemplo: `C:\Rykon\henry-bridge\`

### 3. Configurar a URL do backend

Abra o arquivo `henry-bridge.js` no Bloco de Notas.  
Encontre a linha:
```
url: 'https://SEU-APP.railway.app',
```
Substitua pela URL real do backend, ex:
```
url: 'https://rykon-teamcruz.up.railway.app',
```

### 4. Executar

Dê duplo clique em `iniciar.bat`.

Uma janela preta vai abrir e mostrar:
```
[19/02/2026 10:00:00] Conectando na catraca 192.168.100.163:3000 ...
[19/02/2026 10:00:01] ✅ Conectado na catraca Henry!
```

---

## Quando um aluno passar pela catraca

O log vai mostrar:
```
[10:30:00] 📥 Evento recebido: { matricula: '000001', direcao: 'ENTRADA', ... }
[10:30:00] 🔍 Buscando aluno com matrícula: 000001
[10:30:00] ✅ LIBERAR - Aluno: Robson Adriano | BEM-VINDO ROBSON
```

Ou se aluno não encontrado:
```
[10:30:00] 🚫 BLOQUEAR - Aluno não encontrado
```

---

## Configuração da catraca Henry (interface web)

1. Acesse `http://192.168.100.163` no navegador
2. Vá em **Avançado > Biometria**
   - Marque **"Biometria online"** → **Habilitada**
   - Clique Salvar

3. Vá em **Configurações > Controle**
   - **Tipo de validação** → **Online**
   - Clique Salvar

> A catraca já está em **TCP Modo Servidor** (configuração atual), o que é correto.
> O script conecta nela como cliente.

---

## Iniciar automaticamente com Windows

Para iniciar automático quando o computador ligar:

1. Pressione `Win + R`, digita `shell:startup`
2. Crie um atalho para `iniciar.bat` nessa pasta

---

## Problemas comuns

**"Não conecta na catraca"**
- Verifique se o computador está na mesma rede (192.168.100.x)
- Teste: `ping 192.168.100.163` no CMD
- A porta 3000 deve estar acessível

**"Erro ao chamar backend"**
- Verifique se a URL do Railway está correta no `henry-bridge.js`
- Verifique se o backend está online: abra a URL no navegador

**"Matrícula não encontrada"**
- Cadastre a matrícula no sistema Rykon (SQL: `UPDATE alunos SET numero_matricula = 'XXXXXX'`)
- A matrícula enviada pela catraca deve ser igual à cadastrada no banco
