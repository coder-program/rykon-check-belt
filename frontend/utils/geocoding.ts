/**
 * Serviço de Geocodificação
 * Converte endereços em coordenadas GPS (latitude/longitude)
 */

// Controle de rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 segundo entre requisições

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  accuracy?: string;
  source?: "nominatim" | "google" | "manual";
  boundingBox?: number[]; // [minLat, maxLat, minLon, maxLon]
  importance?: number; // Relevância do resultado (0-1)
}

interface MultipleResults {
  results: GeocodingResult[];
  query: string;
}

interface AddressComponents {
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
}

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

/**
 * Geocodifica um endereço usando a API Nominatim do OpenStreetMap (gratuita)
 * @param address Componentes do endereço
 * @returns Coordenadas e informações do local
 */
export async function geocodeAddress(
  address: AddressComponents
): Promise<GeocodingResult> {
  // Monta o endereço completo
  const addressParts: string[] = [];

  if (address.logradouro) addressParts.push(address.logradouro);
  if (address.numero) addressParts.push(address.numero);
  if (address.bairro) addressParts.push(address.bairro);
  if (address.cidade) addressParts.push(address.cidade);
  if (address.estado) addressParts.push(address.estado);
  if (address.pais) addressParts.push(address.pais);

  const fullAddress = addressParts.join(", ");

  if (!fullAddress || fullAddress.trim().length < 5) {
    throw new Error(
      "Endereço incompleto. Preencha pelo menos cidade e estado."
    );
  }

  try {
    // Aguardar para evitar rate limit
    await waitForRateLimit();

    // Tentativa 1: Endereço completo
    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      fullAddress
    )}&limit=3&countrycodes=br`;

    let response = await fetch(url, {
      headers: {
        "User-Agent": "RykonCheckBelt/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API de geocodificação: ${response.status}`);
    }

    let data = await response.json();

    // Se não encontrou, tenta apenas cidade e estado
    if (!data || data.length === 0) {
      const simplifiedAddress = `${address.cidade}, ${address.estado}, Brasil`;

      // Aguardar novamente para a segunda tentativa
      await waitForRateLimit();

      url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        simplifiedAddress
      )}&limit=3&countrycodes=br`;

      response = await fetch(url, {
        headers: {
          "User-Agent": "RykonCheckBelt/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Erro na API de geocodificação: ${response.status}`);
      }

      data = await response.json();
    }

    if (!data || data.length === 0) {
      throw new Error(
        "Endereço não encontrado. Verifique se os dados estão corretos."
      );
    }

    const result = data[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
      accuracy: result.type || "unknown",
      source: "nominatim",
      boundingBox: result.boundingbox?.map((b: string) => parseFloat(b)),
      importance: result.importance,
    };
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Erro desconhecido ao buscar coordenadas do endereço");
  }
}

/**
 * Geocodifica e retorna MÚLTIPLOS resultados para o usuário escolher
 * Útil quando há ambiguidade no endereço
 * @param address Componentes do endereço
 * @param maxResults Número máximo de resultados (padrão: 5)
 * @returns Lista de resultados possíveis
 */
export async function geocodeAddressMultiple(
  address: AddressComponents,
  maxResults: number = 5
): Promise<MultipleResults> {
  const addressParts: string[] = [];

  // Estratégia 1: Endereço completo e detalhado
  if (address.logradouro) addressParts.push(address.logradouro);
  if (address.numero) addressParts.push(address.numero);
  if (address.bairro) addressParts.push(address.bairro);
  if (address.cidade) addressParts.push(address.cidade);
  if (address.estado) addressParts.push(address.estado);
  if (address.pais) addressParts.push(address.pais);

  const fullAddress = addressParts.join(", ");

  if (!fullAddress || fullAddress.trim().length < 5) {
    throw new Error(
      "Endereço incompleto. Preencha pelo menos cidade e estado."
    );
  }

  try {
    await waitForRateLimit();

    // Buscar múltiplos resultados (até maxResults)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      fullAddress
    )}&limit=${maxResults}&countrycodes=br&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "RykonCheckBelt/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API de geocodificação: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      // Tentar busca simplificada
      const simplifiedAddress = `${address.logradouro || ""} ${
        address.cidade
      }, ${address.estado}, Brasil`.trim();

      await waitForRateLimit();

      const simplifiedUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        simplifiedAddress
      )}&limit=${maxResults}&countrycodes=br&addressdetails=1`;
      const simplifiedResponse = await fetch(simplifiedUrl, {
        headers: {
          "User-Agent": "RykonCheckBelt/1.0",
        },
      });

      if (simplifiedResponse.ok) {
        const simplifiedData = await simplifiedResponse.json();
        if (simplifiedData && simplifiedData.length > 0) {
          return formatMultipleResults(simplifiedData, simplifiedAddress);
        }
      }

      throw new Error(
        "Nenhum resultado encontrado. Verifique se os dados estão corretos."
      );
    }

    return formatMultipleResults(data, fullAddress);
  } catch (error) {
    console.error("Erro ao geocodificar endereço:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Erro desconhecido ao buscar coordenadas do endereço");
  }
}

/**
 * Formata os resultados da API Nominatim em um formato padronizado
 */
function formatMultipleResults(
  data: Array<{
    lat: string;
    lon: string;
    display_name: string;
    type?: string;
    boundingbox?: string[];
    importance?: number;
  }>,
  query: string
): MultipleResults {
  const results: GeocodingResult[] = data.map((item) => ({
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    displayName: item.display_name,
    accuracy: item.type || "unknown",
    source: "nominatim",
    boundingBox: item.boundingbox?.map((b: string) => parseFloat(b)),
    importance: item.importance || 0,
  }));

  // Ordenar por importância (mais relevante primeiro)
  results.sort((a, b) => (b.importance || 0) - (a.importance || 0));

  return {
    results,
    query,
  };
}

/**
 * Geocodifica usando ViaCEP + Nominatim para maior precisão
 * Primeiro busca dados completos do CEP, depois geocodifica
 * @param cep CEP do endereço
 * @returns Coordenadas e dados do endereço
 */
export async function geocodeByCEP(
  cep: string
): Promise<GeocodingResult & { address?: ViaCEPResponse }> {
  const cleanCEP = cep.replace(/\D/g, "");

  if (cleanCEP.length !== 8) {
    throw new Error("CEP inválido. Deve conter 8 dígitos.");
  }

  try {
    // 1. Buscar dados do endereço via ViaCEP
    const viaCepResponse = await fetch(
      `https://viacep.com.br/ws/${cleanCEP}/json/`
    );

    if (!viaCepResponse.ok) {
      throw new Error("Erro ao buscar dados do CEP");
    }

    const addressData = await viaCepResponse.json();

    if (addressData.erro) {
      throw new Error("CEP não encontrado");
    }

    // 2. Geocodificar com os dados completos
    const geocodingResult = await geocodeAddress({
      logradouro: addressData.logradouro || undefined,
      bairro: addressData.bairro || undefined,
      cidade: addressData.localidade,
      estado: addressData.uf,
      pais: "Brasil",
    });

    return {
      ...geocodingResult,
      address: addressData,
    };
  } catch (error) {
    console.error("Erro ao geocodificar por CEP:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Erro desconhecido ao buscar coordenadas pelo CEP");
  }
}

/**
 * Valida se as coordenadas estão dentro do Brasil
 * @param latitude
 * @param longitude
 * @returns true se as coordenadas são válidas para o Brasil
 */
export function isValidBrazilCoordinates(
  latitude: number,
  longitude: number
): boolean {
  // Brasil: latitude entre -33.75 e 5.27, longitude entre -73.99 e -34.79
  const isLatValid = latitude >= -33.75 && latitude <= 5.27;
  const isLonValid = longitude >= -73.99 && longitude <= -34.79;

  return isLatValid && isLonValid;
}

/**
 * Calcula a distância entre duas coordenadas (fórmula de Haversine)
 * @param lat1
 * @param lon1
 * @param lat2
 * @param lon2
 * @returns Distância em metros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
