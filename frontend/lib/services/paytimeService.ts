interface PaytimeAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PaytimeEstablishment {
  id: number;
  type: 'INDIVIDUAL' | 'BUSINESS';
  status: 'PENDING' | 'VALIDATION' | 'RISK_ANALYSIS' | 'APPROVED' | 'DISAPPROVED' | 'DISCREDITED' | 'BACKGROUND_CHECK';
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  access_type: 'ACQUIRER';
  document: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone_number: string;
  cnae?: string;
  format?: string;
  birthdate?: string;
  revenue?: number;
  gmv?: number;
  notes?: string;
  visited: boolean;
  address: {
    zip_code: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    number: string;
    complement?: string;
  };
  responsible?: {
    email: string;
    document: string;
    first_name: string;
    phone: string;
    birthdate: string;
  };
  representative?: {
    id: number;
    marketplace_id: number;
    active: boolean;
    first_name: string;
    last_name: string;
    document: string;
  };
  plans?: Array<{
    id: number;
    allow_anticipation: boolean;
    days_anticipation: number;
    name: string;
    modality: string;
  }>;
  gateways?: Array<{
    id: number;
    name: string;
    type: string;
    status: 'ACTIVE' | 'INACTIVE';
  }>;
  created_at: string;
  updated_at: string;
}

interface PaytimeListResponse {
  data: PaytimeEstablishment[];
  __meta__: {
    current_page: number;
    total_pages: number;
    total: number;
    per_page: number;
  };
}

interface PaytimeFilters {
  status?: PaytimeEstablishment['status'];
  type?: PaytimeEstablishment['type'];
  risk?: PaytimeEstablishment['risk'];
}

interface PaytimeSorter {
  column: 'id' | 'document' | 'first_name' | 'email' | 'status' | 'type' | 'risk' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
}

class PaytimeService {
  private baseUrl = 'https://api.paytime.com.br'; // Você deve ajustar a URL base
  private token: string | null = null;
  private tokenExpires: number = 0;

  /**
   * Autentica com a API do Paytime
   */
  async authenticate(): Promise<string> {
    // Verifica se já temos um token válido
    if (this.token && Date.now() < this.tokenExpires) {
      return this.token;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: '!Rykon@pay' // Senha fixa conforme documentação
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na autenticação Paytime: ${response.status}`);
      }

      const data: PaytimeAuthResponse = await response.json();
      
      this.token = data.access_token;
      this.tokenExpires = Date.now() + (data.expires_in * 1000) - 60000; // Remove 1 minuto para segurança
      
      return this.token;
    } catch (error) {
      console.error('Erro ao autenticar com Paytime:', error);
      throw new Error('Falha na autenticação com Paytime');
    }
  }

  /**
   * Lista estabelecimentos com filtros e paginação
   */
  async listEstablishments(params?: {
    filters?: PaytimeFilters;
    search?: string;
    page?: number;
    perPage?: number;
    sorters?: PaytimeSorter[];
  }): Promise<PaytimeListResponse> {
    const token = await this.authenticate();
    
    const queryParams = new URLSearchParams();
    
    if (params?.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }
    
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    
    if (params?.perPage) {
      queryParams.append('perPage', params.perPage.toString());
    }
    
    if (params?.sorters) {
      queryParams.append('sorters', JSON.stringify(params.sorters));
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/establishments?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirou, limpar e tentar novamente
          this.token = null;
          throw new Error('Token expirado, tente novamente');
        }
        throw new Error(`Erro ao buscar estabelecimentos: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao listar estabelecimentos:', error);
      throw error;
    }
  }

  /**
   * Busca estabelecimentos apenas com status APPROVED
   */
  async getApprovedEstablishments(params?: {
    search?: string;
    page?: number;
    perPage?: number;
  }): Promise<PaytimeListResponse> {
    return this.listEstablishments({
      ...params,
      filters: { status: 'APPROVED' },
      sorters: [{ column: 'created_at', direction: 'desc' }]
    });
  }

  /**
   * Converte dados do Paytime para o formato interno
   */
  convertToInternalFormat(paytimeData: PaytimeEstablishment[]) {
    return paytimeData.map(item => ({
      id: item.id.toString(),
      nome: item.first_name + (item.last_name ? ` ${item.last_name}` : ''),
      cnpj: item.document,
      email: item.email,
      telefone: item.phone_number,
      cidade: item.address.city,
      estado: item.address.state,
      ativo: item.status === 'APPROVED',
      status: item.status,
      tipo: item.type,
      risco: item.risk,
      endereco_completo: `${item.address.street}, ${item.address.number}${item.address.complement ? ` - ${item.address.complement}` : ''}, ${item.address.neighborhood}, ${item.address.city}/${item.address.state}`,
      cep: item.address.zip_code,
      created_at: item.created_at,
      updated_at: item.updated_at,
      paytime_data: item // Dados completos do Paytime para detalhes
    }));
  }
}

export const paytimeService = new PaytimeService();
export type { PaytimeEstablishment, PaytimeListResponse, PaytimeFilters, PaytimeSorter };