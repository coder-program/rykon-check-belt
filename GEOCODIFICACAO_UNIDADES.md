# Sistema de Geocodificação para Unidades

## 📍 Problema Resolvido

Anteriormente, o sistema de localização GPS das unidades tinha um problema: **capturava as coordenadas de quem estava cadastrando** (usando "Obter Minha Localização Atual"), e não as coordenadas reais da unidade baseada no endereço informado.

Isso causava inconsistências porque:

- ❌ O administrador poderia estar em casa cadastrando a unidade
- ❌ As coordenadas não correspondiam ao endereço físico da academia
- ❌ Validações de check-in falhavam ou eram imprecisas

## ✅ Solução Implementada

Agora o sistema usa **Geocodificação Automática** que converte o endereço digitado em coordenadas GPS precisas.

### Como Funciona

1. **Preenchimento do Endereço**: O usuário preenche os dados da unidade (CEP, logradouro, número, bairro, cidade, estado)

2. **Geocodificação Automática**: Ao clicar em "🔍 Buscar Coordenadas pelo Endereço", o sistema:

   - Tenta primeiro buscar via **CEP** (mais preciso)
   - Se não encontrar, busca pelo **endereço completo**
   - Valida se as coordenadas estão no Brasil
   - Mostra o resultado completo com link para verificação no Google Maps

3. **Verificação Visual**: O usuário pode clicar em "Ver no Google Maps" para confirmar se a localização está correta

### Tecnologias Utilizadas

- **Nominatim API** (OpenStreetMap): API gratuita de geocodificação, sem necessidade de API key
- **ViaCEP**: Para enriquecer dados do endereço quando disponível CEP

## 🎯 Funcionalidades

### Botão Principal: Buscar Coordenadas pelo Endereço

```typescript
// Geocodifica baseado no endereço preenchido
// Prioridade: CEP > Endereço completo
handleGeocodeAddress();
```

**Requisitos mínimos:**

- Cidade
- Estado

**Recomendado para precisão:**

- CEP
- Logradouro
- Número
- Bairro

### Botão Alternativo: Usar Minha Localização Atual

```typescript
// Mantido como alternativa para casos específicos
// Útil quando o administrador está fisicamente na unidade
navigator.geolocation.getCurrentPosition();
```

### Validações Implementadas

1. ✅ Verifica se cidade e estado foram preenchidos
2. ✅ Valida se coordenadas estão dentro do território brasileiro
3. ✅ Mostra mensagens de erro claras e contextualizadas
4. ✅ Permite verificação visual via Google Maps

## 📦 Arquivos Criados/Modificados

### Novo Arquivo

- `frontend/utils/geocoding.ts` - Serviço de geocodificação

### Modificados

- `frontend/components/unidades/UnidadeForm.tsx` - UI e integração

## 🔧 Funções Disponíveis

### `geocodeAddress(address: AddressComponents): Promise<GeocodingResult>`

Converte componentes de endereço em coordenadas GPS

### `geocodeByCEP(cep: string): Promise<GeocodingResult & { address?: ViaCEPResponse }>`

Busca coordenadas usando CEP (mais preciso)

### `isValidBrazilCoordinates(latitude: number, longitude: number): boolean`

Valida se as coordenadas estão no Brasil

### `calculateDistance(lat1, lon1, lat2, lon2): number`

Calcula distância em metros entre duas coordenadas (Haversine)

## 🎨 Interface do Usuário

### Antes

```
[📍 Obter Minha Localização Atual]  <-- Pegava localização de quem cadastrava
```

### Depois

```
[🔍 Buscar Coordenadas pelo Endereço]  <-- PRINCIPAL: Usa o endereço digitado
[📍 Usar Minha Localização Atual]      <-- Alternativo
[🗑️ Remover Localização]              <-- Limpar

⚠️ Preencha pelo menos a Cidade e o Estado para buscar as coordenadas

✅ Localização configurada
📍 Coordenadas: -23.550520, -46.633308
[🗺️ Ver no Google Maps] [📱 Abrir no Maps]
💡 Verifique se a localização está correta antes de salvar
```

## 🚀 Como Usar

1. **Cadastrar/Editar Unidade**

   - Acesse "Unidades" no menu
   - Clique em "Nova Unidade" ou edite uma existente

2. **Preencher Endereço**

   - Aba "Localização e Endereço"
   - Preencha CEP, Logradouro, Número, Bairro, Cidade, Estado

3. **Obter Coordenadas**

   - Clique em "🔍 Buscar Coordenadas pelo Endereço"
   - Aguarde a busca (1-2 segundos)

4. **Verificar Localização**

   - Clique em "Ver no Google Maps"
   - Confirme se o ponto está correto

5. **Salvar**
   - Se tudo estiver correto, salve a unidade

## ⚠️ Notas Importantes

- **Precisão**: Quanto mais completo o endereço, mais precisa a localização
- **CEP**: Sempre que possível, informe o CEP para maior precisão
- **Validação Manual**: Sempre verifique no Google Maps se a localização está correta
- **Raio de Check-in**: O sistema valida check-in em até 100 metros da coordenada cadastrada

## 🌍 APIs Gratuitas

### Nominatim (OpenStreetMap)

- ✅ Gratuita
- ✅ Sem necessidade de API key
- ✅ Boa cobertura no Brasil
- ⚠️ Rate limit: 1 request/segundo (mais que suficiente para cadastro)

### ViaCEP

- ✅ Gratuita
- ✅ Específica para Brasil
- ✅ Dados oficiais dos Correios

## 🔒 Segurança e Privacidade

- Não armazena dados de geolocalização do usuário que cadastra
- Apenas coordenadas do endereço são salvas no banco
- APIs externas são chamadas apenas quando solicitado explicitamente
- CORS configurado adequadamente

## 📊 Exemplo de Resultado

```json
{
  "latitude": -23.55052,
  "longitude": -46.633308,
  "displayName": "Avenida Paulista, 1000, Bela Vista, São Paulo, SP, Brasil",
  "accuracy": "building"
}
```

## 🐛 Troubleshooting

### "Endereço não encontrado"

- Verifique se cidade e estado estão corretos
- Tente sem acentos
- Verifique se o CEP está correto (8 dígitos)

### "Coordenadas fora do Brasil"

- O endereço pode estar incorreto
- Verifique a grafia de cidade/estado
- Use abreviações padrão (SP, RJ, MG, etc.)

### API não responde

- Verifique conexão com internet
- Aguarde alguns segundos e tente novamente
- Use a opção "Usar Minha Localização Atual" como fallback (se estiver na unidade)

## 🎯 Benefícios

✅ Coordenadas precisas e confiáveis
✅ Validação de check-in mais efetiva
✅ Melhor experiência do usuário
✅ Redução de erros de cadastro
✅ Verificação visual antes de salvar
✅ Sem custos com APIs pagas
✅ Funciona offline (campo manual ainda disponível)
