Você é um especialista em Node.js e reconhecimento facial.  
Preciso que você adicione ao meu sistema de check-in (já em Node.js com front em React/HTML) a funcionalidade de **reconhecimento facial**.

📌 Contexto atual:
- O sistema já permite check-in via CPF/telefone, QR Code e ID da unidade.  
- Backend em Node.js, banco PostgreSQL.  
- Frontend com página de check-in (HTML/React).  
- Quero integrar **captura de foto da webcam** no navegador e reconhecimento facial no servidor.  

📌 Requisitos:
1. **Cadastro de aluno/professor**
   - Ao cadastrar, deve salvar a foto enviada pelo usuário.  
   - A foto deve gerar um **embedding facial** (descritor) usando `face-api.js` ou biblioteca equivalente compatível com Node.js.  
   - Armazenar o embedding no banco junto ao aluno/professor.  

2. **Check-in por reconhecimento facial**
   - Na tela de check-in, incluir opção "Check-in por Face".  
   - Ao clicar, abrir a câmera do dispositivo (WebRTC).  
   - Capturar a imagem do rosto, enviar para o backend (`POST /checkin/face`).  
   - O backend compara o embedding da foto tirada com os embeddings salvos no banco.  
   - Se encontrar correspondência confiável (similaridade > 0.6), registra presença do aluno.  

3. **Validação por geolocalização**
   - Junto com a foto, enviar latitude/longitude do navegador (via `navigator.geolocation`).  
   - O backend valida se o usuário está dentro de um raio de 50 metros da academia.  
   - Só registrar presença se **face + localização** forem válidos.  

4. **Retorno esperado**
   - Se check-in OK → mostrar nome e confirmação na tela.  
   - Se falhar → mensagem de erro “Rosto não reconhecido ou fora da área da academia”.  

📌 Tecnologias sugeridas:
- `face-api.js` com `@tensorflow/tfjs-node` para embeddings faciais no backend.  
- `multer` para upload de fotos.  
- `geolib` para validação de localização.  
- PostgreSQL para armazenar embeddings.  

⚡ Entregue:
- Código das rotas `/cadastro` e `/checkin/face`.  
- Código exemplo do frontend para capturar a foto e enviar via fetch.  
- Função que compara embeddings e retorna se o rosto foi reconhecido.  
