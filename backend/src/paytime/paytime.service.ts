import { Injectable, Logger, BadRequestException, NotFoundException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Unidade } from '../people/entities/unidade.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { Transacao, StatusTransacao } from '../financeiro/entities/transacao.entity';
import { Fatura, StatusFatura } from '../financeiro/entities/fatura.entity';

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

@Injectable()
export class PaytimeService {
  private readonly logger = new Logger(PaytimeService.name);
  private readonly baseUrl: string;
  private readonly paytimeUsername: string;
  private readonly paytimePassword: string;
  
  private token: string | null = null;
  private tokenExpires: number = 0;
  private authenticationPromise: Promise<string> | null = null; // Lock para evitar múltiplas autenticações simultâneas

  constructor(
    private configService: ConfigService,
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
    @InjectRepository(Transacao)
    private transacaoRepository: Repository<Transacao>,
    @InjectRepository(Fatura)
    private faturaRepository: Repository<Fatura>,
  ) {
    this.baseUrl = this.configService.get('RYKON_PAY_BASE_URL') || 'https://rykon-pay-production.up.railway.app';
    this.paytimeUsername = this.configService.get('RYKON_PAY_USERNAME') || 'admin';
    this.paytimePassword = this.configService.get('RYKON_PAY_PASSWORD') || '!Rykon@pay';
    this.logger.log(`🔧 RykonPay configurado para: ${this.baseUrl}`);
  }

  /**
   * Autentica com a API do Paytime (com proteção contra múltiplas chamadas simultâneas)
   */
  async authenticate(): Promise<string> {
    // Verifica se já temos um token válido
    if (this.token && Date.now() < this.tokenExpires) {
      return this.token;
    }

    // Se já existe uma autenticação em andamento, aguarda ela terminar
    if (this.authenticationPromise) {
      this.logger.debug('Aguardando autenticação em andamento...');
      return this.authenticationPromise;
    }

    // Inicia nova autenticação
    this.authenticationPromise = this.performAuthentication();

    try {
      const token = await this.authenticationPromise;
      return token;
    } finally {
      // Limpa o lock após conclusão (sucesso ou erro)
      this.authenticationPromise = null;
    }
  }

  /**
   * Executa a autenticação real (método privado)
   */
  private async performAuthentication(): Promise<string> {
    try {
      this.logger.debug('Autenticando com Paytime...');
      
      const response = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.paytimeUsername,
          password: this.paytimePassword
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Erro na autenticação Paytime: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Erro na autenticação Paytime: ${response.status}`);
      }

      const data: PaytimeAuthResponse = await response.json();
      
      this.token = data.access_token;
      this.tokenExpires = Date.now() + (data.expires_in * 1000) - 60000; // Remove 1 minuto para segurança
      
      this.logger.debug('Autenticação com Paytime realizada com sucesso');
      return this.token;
    } catch (error) {
      this.logger.error('Erro ao autenticar com Paytime:', error);
      throw new BadRequestException('Falha na autenticação com Paytime');
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
  }, retry = true): Promise<PaytimeListResponse> {
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
      this.logger.debug(`Buscando estabelecimentos: ${queryParams.toString()}`);
      
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
        if (response.status === 401 && retry) {
          // Token expirou, limpar e tentar novamente UMA VEZ
          this.token = null;
          this.tokenExpires = 0;
          this.logger.warn('Token Paytime expirado, renovando automaticamente...');
          return this.listEstablishments(params, false); // Retry com nova autenticação
        }
        
        const errorText = await response.text();
        this.logger.error(`Erro ao buscar estabelecimentos: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Erro ao buscar estabelecimentos: ${response.status}`);
      }

      const result = await response.json();
      this.logger.debug(`Encontrados ${result.__meta__?.total || 0} estabelecimentos`);
      
      return result;
    } catch (error) {
      this.logger.error('Erro ao listar estabelecimentos:', error);
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

  /**
   * Cria um novo estabelecimento no Paytime
   */
  async createEstablishment(data: any, retry = true): Promise<any> {
    const token = await this.authenticate();

    try {
      this.logger.debug('Criando estabelecimento no Paytime...');
      this.logger.debug('📤 Payload enviado:', JSON.stringify(data, null, 2));
      this.logger.debug(`🔍 Telefone responsável: "${data.responsible?.phone}" (tipo: ${typeof data.responsible?.phone}, length: ${data.responsible?.phone?.length})`);
      
      const response = await fetch(
        `${this.baseUrl}/api/establishments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        if (response.status === 401 && retry) {
          // Token expirou, renovar e tentar novamente
          this.token = null;
          this.tokenExpires = 0;
          this.logger.warn('Token Paytime expirado, renovando automaticamente...');
          return this.createEstablishment(data, false);
        }
        
        const errorText = await response.text();
        this.logger.error(`❌ Erro HTTP ${response.status}: ${errorText}`);
        
        // Tentar parsear erro JSON
        try {
          const errorJson = JSON.parse(errorText);
          this.logger.error('📋 Detalhes do erro:', JSON.stringify(errorJson, null, 2));
          throw new BadRequestException(errorJson.message || `Erro ao criar estabelecimento: ${response.status}`);
        } catch {
          throw new BadRequestException(`Erro ao criar estabelecimento: ${response.status}`);
        }
      }

      const result = await response.json();
      this.logger.debug(`✅ Estabelecimento criado com ID: ${result.id}`);
      
      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao criar estabelecimento:', error);
      throw error;
    }
  }

  /**
   * Busca um estabelecimento por ID
   */
  async getEstablishmentById(id: number, retry = true): Promise<any> {
    const token = await this.authenticate();

    try {
      this.logger.debug(`Buscando estabelecimento ID: ${id}...`);
      
      const response = await fetch(
        `${this.baseUrl}/api/establishments/${id}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 && retry) {
          this.token = null;
          this.tokenExpires = 0;
          this.logger.warn('Token Paytime expirado, renovando automaticamente...');
          return this.getEstablishmentById(id, false);
        }

        if (response.status === 404) {
          throw new NotFoundException(`Estabelecimento ${id} não encontrado`);
        }
        
        const errorText = await response.text();
        this.logger.error(`❌ Erro HTTP ${response.status}: ${errorText}`);
        throw new BadRequestException(`Erro ao buscar estabelecimento: ${response.status}`);
      }

      const result = await response.json();
      this.logger.debug(`✅ Estabelecimento encontrado: ${result.first_name}`);
      
      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar estabelecimento:', error);
      throw error;
    }
  }

  /**
   * Atualiza um estabelecimento existente
   */
  async updateEstablishment(id: number, data: any, retry = true): Promise<any> {
    const token = await this.authenticate();

    try {
      this.logger.debug(`Atualizando estabelecimento ID: ${id}...`);
      
      // Converter campos numéricos de string para number
      const sanitizedData = {
        ...data,
        revenue: data.revenue ? parseFloat(data.revenue) : undefined,
        gmv: data.gmv !== undefined ? parseFloat(data.gmv) || 0 : undefined,
      };
      
      // Remover campos undefined
      Object.keys(sanitizedData).forEach(key => {
        if (sanitizedData[key] === undefined) {
          delete sanitizedData[key];
        }
      });
      
      this.logger.debug('📤 Payload enviado:', JSON.stringify(sanitizedData, null, 2));
      
      const response = await fetch(
        `${this.baseUrl}/api/establishments/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sanitizedData),
        }
      );

      if (!response.ok) {
        if (response.status === 401 && retry) {
          this.token = null;
          this.tokenExpires = 0;
          this.logger.warn('Token Paytime expirado, renovando automaticamente...');
          return this.updateEstablishment(id, data, false);
        }

        if (response.status === 404) {
          throw new NotFoundException(`Estabelecimento ${id} não encontrado`);
        }
        
        const errorText = await response.text();
        this.logger.error(`❌ Erro HTTP ${response.status}: ${errorText}`);
        
        try {
          const errorJson = JSON.parse(errorText);
          this.logger.error('📋 Detalhes do erro:', JSON.stringify(errorJson, null, 2));
          throw new BadRequestException(errorJson.message || `Erro ao atualizar estabelecimento: ${response.status}`);
        } catch {
          throw new BadRequestException(`Erro ao atualizar estabelecimento: ${response.status}`);
        }
      }

      const result = await response.json();
      this.logger.debug(`✅ Estabelecimento atualizado: ${result.first_name}`);
      
      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao atualizar estabelecimento:', error);
      throw error;
    }
  }

  // Métodos para vincular estabelecimentos com unidades
  async getVinculatedUnidades(establishmentId: string) {
    this.logger.debug(`🔍 Buscando unidades vinculadas ao estabelecimento ${establishmentId}`);
    
    try {
      // Buscar todas as unidades para debug
      const todasUnidades = await this.unidadeRepository.count();
      this.logger.debug(`📊 Total de unidades no banco: ${todasUnidades}`);
      
      const unidades = await this.unidadeRepository.find({
        where: { paytime_establishment_id: establishmentId },
        select: ['id', 'nome', 'cnpj', 'paytime_establishment_id'],
      });

      this.logger.debug(`✅ Encontradas ${unidades.length} unidades vinculadas ao estabelecimento ${establishmentId}`);
      
      // Se não encontrou, vamos verificar se há alguma unidade com esse ID
      if (unidades.length === 0) {
        const unidadesComEstabelecimento = await this.unidadeRepository.find({
          where: {},
          select: ['id', 'nome', 'paytime_establishment_id'],
          take: 5,
        });
        this.logger.debug(`🔍 Exemplo de unidades no banco: ${JSON.stringify(unidadesComEstabelecimento)}`);
      }
      
      return unidades;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar unidades vinculadas:`, error);
      throw error;
    }
  }

  async vincularUnidade(establishmentId: string, unidadeId: string) {
    this.logger.debug(`🔗 Vinculando unidade ${unidadeId} ao estabelecimento ${establishmentId}`);
    
    // Verificar se a unidade existe
    const unidade = await this.unidadeRepository.findOne({ where: { id: unidadeId } });
    if (!unidade) {
      throw new NotFoundException(`Unidade com ID ${unidadeId} não encontrada`);
    }

    // Verificar se o estabelecimento existe (convertendo string para number)
    try {
      await this.getEstablishmentById(parseInt(establishmentId));
    } catch (error) {
      throw new NotFoundException(`Estabelecimento com ID ${establishmentId} não encontrado`);
    }

    // Atualizar o campo paytime_establishment_id
    await this.unidadeRepository.update(
      { id: unidadeId },
      { paytime_establishment_id: establishmentId }
    );

    this.logger.debug(`✅ Unidade ${unidadeId} vinculada ao estabelecimento ${establishmentId}`);
    
    return this.unidadeRepository.findOne({ 
      where: { id: unidadeId },
    });
  }

  async desvincularUnidade(establishmentId: string, unidadeId: string) {
    this.logger.debug(`🔓 Desvinculando unidade ${unidadeId} do estabelecimento ${establishmentId}`);
    
    // Verificar se a unidade existe e está vinculada a este estabelecimento
    const unidade = await this.unidadeRepository.findOne({ 
      where: { 
        id: unidadeId,
        paytime_establishment_id: establishmentId 
      } 
    });

    if (!unidade) {
      throw new NotFoundException(
        `Unidade com ID ${unidadeId} não encontrada ou não está vinculada ao estabelecimento ${establishmentId}`
      );
    }

    // Remover o vínculo
    await this.unidadeRepository.update(
      { id: unidadeId },
      { paytime_establishment_id: null }
    );

    this.logger.debug(`✅ Unidade ${unidadeId} desvinculada do estabelecimento ${establishmentId}`);
    
    return { message: 'Unidade desvinculada com sucesso' };
  }

  // ==========================================
  // GATEWAYS
  // ==========================================

  /**
   * Listar gateways disponíveis na plataforma Paytime
   */
  async listGateways(
    filters?: Record<string, any>,
    search?: string,
    page: number = 1,
    perPage: number = 20,
    sorters?: Array<{ column: string; direction: 'ASC' | 'DESC' }>,
  ) {
    this.logger.debug('🎯 [GATEWAYS] Parâmetros recebidos:', { filters, search, page, perPage, sorters });
    
    const token = await this.authenticate();

    const queryParams = new URLSearchParams();
    
    if (filters) {
      const filtersJson = JSON.stringify(filters);
      this.logger.debug(`🎯 [GATEWAYS] Aplicando filtros: ${filtersJson}`);
      queryParams.append('filters', filtersJson);
    } else {
      this.logger.debug('🎯 [GATEWAYS] Sem filtros');
    }
    
    if (search) {
      this.logger.debug(`🔍 [GATEWAYS] Aplicando busca: ${search}`);
      queryParams.append('search', search);
    } else {
      this.logger.debug('🔍 [GATEWAYS] Sem busca');
    }
    
    queryParams.append('page', page.toString());
    queryParams.append('perPage', Math.min(perPage, 100).toString());
    
    if (sorters && sorters.length > 0) {
      queryParams.append('sorters', JSON.stringify(sorters));
    }

    const url = `${this.baseUrl}/api/gateways?${queryParams.toString()}`;
    
    this.logger.debug(`📡 [GATEWAYS] URL completa: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao listar gateways: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao listar gateways: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.logger.debug(`✅ [GATEWAYS] Resposta da API Paytime: ${JSON.stringify(data)}`);
    this.logger.debug(`📊 [GATEWAYS] Total retornado: ${data.total}`);
    this.logger.debug(`📄 [GATEWAYS] Gateways: ${data.data?.length || 0} items`);
    
    // FILTRAR LOCALMENTE pois a API Paytime ignora os filtros
    if ((filters || search) && data.data) {
      let filtered = data.data;
      
      // Filtrar por tipo
      if (filters?.type) {
        this.logger.debug(`🎯 [GATEWAYS] Filtrando por tipo: ${filters.type}`);
        filtered = filtered.filter((g: any) => g.type === filters.type);
      }
      
      // Filtrar por busca
      if (search) {
        this.logger.debug(`🔍 [GATEWAYS] Filtrando por busca: ${search}`);
        const searchLower = search.toLowerCase();
        filtered = filtered.filter((g: any) => 
          g.name?.toLowerCase().includes(searchLower) ||
          g.type?.toLowerCase().includes(searchLower)
        );
      }
      
      this.logger.debug(`✅ [GATEWAYS] Após filtro local: ${filtered.length} items`);
      
      return {
        ...data,
        total: filtered.length,
        data: filtered,
        lastPage: Math.ceil(filtered.length / perPage),
      };
    }
    
    return data;
  }

  /**
   * Buscar gateway específico por ID
   */
  async getGateway(gatewayId: number) {
    const token = await this.authenticate();

    const url = `${this.baseUrl}/api/gateways/${gatewayId}`;
    
    this.logger.debug(`🔍 Buscando gateway ${gatewayId}: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundException(`Gateway com ID ${gatewayId} não encontrado`);
      }
      
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao buscar gateway: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao buscar gateway: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.logger.debug(`✅ Gateway ${gatewayId} encontrado: ${data.name} (${data.type})`);
    
    return data;
  }

  /**
   * Listar planos comerciais disponíveis
   */
  async listPlans(
    page: number = 1,
    perPage: number = 20,
    filters?: any,
    search?: string,
    sorters?: any[],
  ) {
    const token = await this.authenticate();

    // Construir query params
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('perPage', perPage.toString());

    this.logger.debug(`🎯 [PLANS] Parâmetros recebidos - page: ${page}, perPage: ${perPage}`);

    if (filters) {
      params.append('filters', JSON.stringify(filters));
      this.logger.debug(`🎯 [PLANS] Aplicando filtros: ${JSON.stringify(filters)}`);
    }

    if (search) {
      params.append('search', search);
      this.logger.debug(`🔍 [PLANS] Aplicando busca: ${search}`);
    }

    if (sorters && sorters.length > 0) {
      params.append('sorters', JSON.stringify(sorters));
    } else {
      // Ordenar por nome por padrão
      params.append('sorters', JSON.stringify([{ column: 'name', direction: 'ASC' }]));
    }

    const url = `${this.baseUrl}/api/plans?${params.toString()}`;
    
    this.logger.debug(`📡 [PLANS] URL completa: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ [PLANS] Erro na API Paytime: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao listar planos comerciais: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    
    this.logger.debug(`✅ [PLANS] Resposta da API Paytime: ${JSON.stringify({ 
      total: data.total, 
      page: data.page, 
      perPage: data.perPage,
      plansCount: data.data?.length 
    })}`);

    // Aplicar filtros e busca client-side caso a API Paytime ignore os parâmetros
    if ((filters || search) && data.data) {
      let filtered = data.data;
      
      // Filtrar por gateway_id
      if (filters?.gateway_id) {
        filtered = filtered.filter((p: any) => p.gateway_id === parseInt(filters.gateway_id));
        this.logger.debug(`🔍 [PLANS] Após filtro gateway_id: ${filtered.length} planos`);
      }
      
      // Filtrar por type
      if (filters?.type) {
        filtered = filtered.filter((p: any) => p.type === filters.type);
        this.logger.debug(`🔍 [PLANS] Após filtro type: ${filtered.length} planos`);
      }
      
      // Filtrar por modality
      if (filters?.modality) {
        filtered = filtered.filter((p: any) => p.modality === filters.modality);
        this.logger.debug(`🔍 [PLANS] Após filtro modality: ${filtered.length} planos`);
      }
      
      // Filtrar por active
      if (filters?.active !== undefined) {
        const activeValue = filters.active === 'true' || filters.active === true;
        filtered = filtered.filter((p: any) => p.active === activeValue);
        this.logger.debug(`🔍 [PLANS] Após filtro active: ${filtered.length} planos`);
      }
      
      // Busca por texto
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter((p: any) => 
          p.name?.toLowerCase().includes(searchLower) ||
          p.type?.toLowerCase().includes(searchLower) ||
          p.modality?.toLowerCase().includes(searchLower)
        );
        this.logger.debug(`🔍 [PLANS] Após busca: ${filtered.length} planos`);
      }
      
      // Se filtrou alguma coisa, recalcular paginação
      if (filtered.length !== data.data.length) {
        this.logger.debug(`📊 [PLANS] Aplicando filtros client-side: ${data.data.length} → ${filtered.length} planos`);
        
        const enrichedData = {
          ...data,
          total: filtered.length,
          data: filtered,
          lastPage: Math.ceil(filtered.length / perPage),
        };
        
        return enrichedData;
      }
    }
    
    return data;
  }

  /**
   * Buscar plano comercial específico por ID
   */
  async getPlan(planId: number) {
    const token = await this.authenticate();

    const url = `${this.baseUrl}/api/plans/${planId}`;
    
    this.logger.debug(`🔍 Buscando plano ${planId}: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundException(`Plano com ID ${planId} não encontrado`);
      }
      
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao buscar plano: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao buscar plano: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.logger.debug(`✅ Plano ${planId} encontrado: ${data.name} (Gateway: ${data.gateway_id})`);
    
    return data;
  }

  /**
   * Ativar gateway em um estabelecimento
   */
  async activateGateway(establishmentId: number, gatewayData: any) {
    const token = await this.authenticate();

    const url = `${this.baseUrl}/api/establishments/${establishmentId}/gateways`;
    
    this.logger.debug(`🔌 Ativando gateway para estabelecimento ${establishmentId}: ${url}`);
    this.logger.debug(`📋 Dados do gateway: ${JSON.stringify(gatewayData)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gatewayData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao ativar gateway: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao ativar gateway: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.logger.debug(`✅ Gateway ${data.gateway?.id} ativado com sucesso para estabelecimento ${establishmentId}`);
    
    return data;
  }

  /**
   * Listar gateways ativos de um estabelecimento
   */
  async listEstablishmentGateways(
    establishmentId: number,
    page: number = 1,
    perPage: number = 20,
  ) {
    const token = await this.authenticate();

    const params = new URLSearchParams({
      page: page.toString(),
      perPage: perPage.toString(),
    });

    const url = `${this.baseUrl}/api/establishments/${establishmentId}/gateways?${params.toString()}`;
    
    this.logger.debug(`📋 Listando gateways do estabelecimento ${establishmentId}: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao listar gateways: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao listar gateways do estabelecimento: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.logger.debug(`✅ Gateways do estabelecimento ${establishmentId}: ${data.data?.length || 0} encontrado(s)`);
    
    return data;
  }

  /**
   * Buscar gateway específico de um estabelecimento (inclui URL do KYC se for Banking)
   */
  async getEstablishmentGateway(establishmentId: number, gatewayConfigId: number) {
    const token = await this.authenticate();

    const url = `${this.baseUrl}/api/establishments/${establishmentId}/gateways/${gatewayConfigId}`;
    
    this.logger.debug(`🔍 Buscando gateway ${gatewayConfigId} do estabelecimento ${establishmentId}: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundException(`Gateway config ${gatewayConfigId} não encontrado para estabelecimento ${establishmentId}`);
      }
      
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao buscar gateway config: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao buscar gateway config: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.logger.debug(`✅ Gateway config ${gatewayConfigId} encontrado: ${data.gateway?.name}`);
    
    // Se for Banking (gateway_id 6) e tiver URL do KYC, logar
    if (data.gateway?.id === 6 && data.metadata?.url_documents_copy) {
      this.logger.debug(`📄 URL do KYC disponível: ${data.metadata.url_documents_copy}`);
    }
    
    return data;
  }

  /**
   * Criar transação PIX
   */
  async createPixTransaction(establishmentId: number, pixData: any) {
    const token = await this.authenticate();

    const url = `${this.baseUrl}/api/transactions/pix`;
    
    this.logger.debug(`💳 Criando transação PIX para estabelecimento ${establishmentId}`);
    this.logger.debug(`📋 Request URL: ${url}`);
    this.logger.debug(`📋 Request Headers: ${JSON.stringify({
      Authorization: `Bearer ${token.substring(0, 20)}...`,
      'Content-Type': 'application/json',
      'establishment_id': establishmentId.toString(),
    })}`);
    this.logger.debug(`📋 Request Body: ${JSON.stringify(pixData, null, 2)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
      body: JSON.stringify(pixData),
    });

    const responseText = await response.text();
    this.logger.debug(`📥 Response Status: ${response.status}`);
    this.logger.debug(`📥 Response StatusText: ${response.statusText}`);
    this.logger.debug(`📥 Response OK: ${response.ok}`);
    this.logger.debug(`📥 Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    this.logger.debug(`📥 Response Body: ${responseText}`);

    if (!response.ok) {
      this.logger.error(`❌ Erro Paytime API - Status: ${response.status}`);
      this.logger.error(`❌ Response completo: ${responseText}`);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = { raw: responseText };
      }
      
      // Usar HttpException para preservar o status code exato da API Paytime
      throw new HttpException({
        message: errorDetails.message || 'Erro ao criar transação PIX',
        statusCode: response.status,
        error: errorDetails.error || 'Paytime API Error',
        paytimeError: errorDetails,
        timestamp: errorDetails.timestamp || new Date().toISOString(),
        path: errorDetails.path || '/api/transactions/pix',
        request: {
          url,
          method: 'POST',
          establishment_id: establishmentId,
          payload: pixData,
        },
      }, response.status);
    }

    const data = JSON.parse(responseText);
    this.logger.debug(`✅ Transação PIX criada: ${data.id} - Status: ${data.status}`);
    
    return data;
  }

  /**
   * Criar transação com Cartão (Crédito ou Débito)
   */
  async createCardTransaction(establishmentId: number, cardData: any) {
    const token = await this.authenticate();

    const url = `${this.baseUrl}/api/transactions/card`;
    
    // Log seguro (mascarar dados sensíveis)
    const logData = {
      ...cardData,
      card: cardData.card ? {
        holder_name: cardData.card.holder_name,
        holder_document: cardData.card.holder_document,
        card_number: '****' + (cardData.card.card_number?.slice(-4) || ''),
        expiration_month: cardData.card.expiration_month,
        expiration_year: cardData.card.expiration_year,
        security_code: '***',
      } : undefined
    };
    
    this.logger.log(`💳 [CARD] Criando transação para estabelecimento ${establishmentId}`);
    this.logger.log(`📋 [CARD] Request URL: ${url}`);
    this.logger.log(`🔑 [CARD] antifraud_type no cardData: ${cardData.antifraud_type ?? 'NÃO PRESENTE ⚠️'}`);
    this.logger.log(`🔑 [CARD] session_id no cardData: ${cardData.session_id ? cardData.session_id.substring(0, 20) + '...' : 'NÃO PRESENTE'}`);
    this.logger.log(`📦 [CARD] Body enviado para rykon-pay (sem dados sensíveis):\n${JSON.stringify(logData, null, 2)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
      body: JSON.stringify(cardData),
    });

    const responseText = await response.text();
    this.logger.debug(`📥 Response Status: ${response.status}`);
    this.logger.debug(`📥 Response Body: ${responseText}`);

    if (!response.ok) {
      this.logger.error(`❌ Erro Paytime API - Status: ${response.status}`);
      this.logger.error(`❌ Response completo: ${responseText}`);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = { raw: responseText };
      }
      
      throw new HttpException({
        message: errorDetails.message || 'Erro ao criar transação com Cartão',
        statusCode: response.status,
        error: errorDetails.error || 'Paytime API Error',
        paytimeError: errorDetails,
        timestamp: errorDetails.timestamp || new Date().toISOString(),
        path: errorDetails.path || '/api/transactions/card',
        request: {
          url,
          method: 'POST',
          establishment_id: establishmentId,
          payload: logData,
        },
      }, response.status);
    }

    const data = JSON.parse(responseText);
    this.logger.log(`✅ [CARD] Transação criada: ${data._id || data.id} - Status: ${data.status}`);
    this.logger.log(`🔍 [CARD] antifraud no response: ${JSON.stringify(data.antifraud ?? 'NÃO PRESENTE ⚠️')}`);
    this.logger.log(`🔍 [CARD] analyse_required: ${data.antifraud?.[0]?.analyse_required ?? 'NÃO PRESENTE'}`);
    
    return data;
  }

  /**
   * Criar transação com Boleto
   */
  async createBilletTransaction(establishmentId: number, billetData: any) {
    const token = await this.authenticate();

    const url = `${this.baseUrl}/api/billets`;
    
    this.logger.debug(`💳 Criando boleto para estabelecimento ${establishmentId}`);
    this.logger.debug(`📋 Request URL: ${url}`);
    this.logger.debug(`📋 Request Body: ${JSON.stringify(billetData, null, 2)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
      body: JSON.stringify(billetData),
    });

    const responseText = await response.text();
    this.logger.debug(`📥 Response Status: ${response.status}`);
    this.logger.debug(`📥 Response Body: ${responseText}`);

    if (!response.ok) {
      this.logger.error(`❌ Erro Paytime API - Status: ${response.status}`);
      this.logger.error(`❌ Response completo: ${responseText}`);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(responseText);
      } catch (e) {
        errorDetails = { raw: responseText };
      }
      
      throw new HttpException({
        message: errorDetails.message || 'Erro ao criar boleto',
        statusCode: response.status,
        error: errorDetails.error || 'Paytime API Error',
        paytimeError: errorDetails,
        timestamp: errorDetails.timestamp || new Date().toISOString(),
        path: errorDetails.path || '/api/billets',
        request: {
          url,
          method: 'POST',
          establishment_id: establishmentId,
          payload: billetData,
        },
      }, response.status);
    }

    const data = JSON.parse(responseText);
    this.logger.debug(`✅ Boleto criado com SUCESSO na Paytime!`);
    this.logger.debug(`   🆔 Transaction ID: ${data._id || data.id}`);
    this.logger.debug(`   📊 Status: ${data.status}`);
    this.logger.debug(`   💰 Valor: ${data.amount}`);
    this.logger.debug(`   📅 Vencimento: ${data.expiration_at || data.due_date}`);
    this.logger.debug(`   🔢 Barcode: ${data.barcode ? 'SIM' : 'NÃO'}`);
    this.logger.debug(`   📄 PDF URL: ${data.url ? 'SIM' : 'NÃO'}`);
    
    return data;
  }

  /**
   * Buscar boleto específico por ID
   */
  async getBillet(establishmentId: number, billetId: string) {
    const token = await this.authenticate();

    const url = `${this.baseUrl}/api/billets/${billetId}`;
    
    this.logger.debug(`🔍 Buscando boleto ${billetId} do estabelecimento ${establishmentId}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundException(`Boleto ${billetId} não encontrado`);
      }
      
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao buscar boleto: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao buscar boleto: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.logger.debug(`✅ Boleto ${billetId} encontrado - Status: ${data.status}`);
    
    return data;
  }

  /**
   * Listar transações
   */
  async listTransactions(
    establishmentId: number,
    page: number = 1,
    perPage: number = 20,
    filters?: any,
    search?: string,
  ) {
    const token = await this.authenticate();

    // Aumentar limite para pegar mais transações
    const requestPerPage = Math.max(perPage, 100);

    const params = new URLSearchParams({
      page: page.toString(),
      perPage: requestPerPage.toString(),
    });

    if (filters) {
      params.append('filters', JSON.stringify(filters));
    }

    if (search) {
      params.append('search', search);
    }

    const url = `${this.baseUrl}/api/transactions?${params.toString()}`;
    
    this.logger.debug(`📋 Listando transações do estabelecimento ${establishmentId}`);
    this.logger.debug(`🔗 URL da requisição: ${url}`);
    this.logger.debug(`📤 Headers: establishment_id=${establishmentId}, page=${page}, perPage=${requestPerPage}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao listar transações: ${response.status} - ${errorText}`);
      throw new BadRequestException(
        `Erro ao listar transações: ${response.status} - ${errorText}`,
      );
    }

    const data = await response.json();
    this.logger.debug(`✅ Transações listadas: ${data.data?.length || 0} encontrada(s)`);
    this.logger.debug(`📊 Total de transações: ${data.total || 0}, Página: ${data.page || 1}, Páginas: ${data.lastPage || 1}`);
    
    // Log dos tipos de transação retornados
    if (data.data && data.data.length > 0) {
      const tipos = [...new Set(data.data.map(t => t.type))];
      this.logger.debug(`📋 Tipos de transação retornados: ${tipos.join(', ')}`);
      
      const tipoCount = {};
      data.data.forEach(t => {
        tipoCount[t.type] = (tipoCount[t.type] || 0) + 1;
      });
      this.logger.debug(`📊 Contagem por tipo: ${JSON.stringify(tipoCount)}`);
      
      // VERIFICAR se API Paytime está respeitando o establishment_id
      const establishments = [...new Set(data.data.map(t => t.establishment?.id).filter(Boolean))];
      this.logger.debug(`🏢 Establishments nas transações retornadas: [${establishments.join(', ')}]`);
      
      if (establishments.length > 1 || (establishments.length === 1 && establishments[0] !== establishmentId)) {
        this.logger.warn(`⚠️ BUG CONFIRMADO: Solicitado establishment ${establishmentId}, mas API retornou transações de: [${establishments.join(', ')}]`);
        this.logger.warn(`⚠️ Aplicando filtro FORÇADO no backend para corrigir...`);
        
        // WORKAROUND: Filtrar manualmente as transações pelo establishment correto
        const transacoesAntes = data.data.length;
        data.data = data.data.filter(t => t.establishment?.id === establishmentId);
        this.logger.warn(`⚠️ Transações filtradas: ${transacoesAntes} → ${data.data.length} (removidas ${transacoesAntes - data.data.length} transações de outros establishments)`);
        data.total = data.data.length;
      }
    }
    
    // Log dos IDs e datas das transações retornadas
    if (data.data && data.data.length > 0) {
      this.logger.debug(`📋 IDs das transações retornadas:`);
      data.data.forEach((t, index) => {
        this.logger.debug(`  ${index + 1}. ID: ${t._id} | Tipo: ${t.type} | Status: ${t.status} | Data: ${t.created_at} | Valor: ${t.amount}`);
      });
    }
    
    // Buscar detalhes completos de cada transação para obter dados do cliente
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      this.logger.debug(`🔍 Buscando detalhes completos de ${data.data.length} transação(ões) da API Paytime...`);
      
      const transactionsWithDetails = await Promise.all(
        data.data.map(async (transaction) => {
          try {
            // Buscar detalhes completos da transação individual
            const detailsUrl = `${this.baseUrl}/api/transactions/${transaction._id}`;
            const detailsResponse = await fetch(detailsUrl, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'establishment_id': establishmentId.toString(),
              },
            });

            if (detailsResponse.ok) {
              const details = await detailsResponse.json();
              
              // Se client for null, tentar extrair de info_additional
              let clientData = details.client;
              if (!clientData && details.info_additional && Array.isArray(details.info_additional)) {
                const infoMap = new Map(details.info_additional.map(item => [item.key, item.value]));
                if (infoMap.has('aluno_cpf')) {
                  const alunoNome = String(infoMap.get('aluno_nome') || '');
                  clientData = {
                    document: String(infoMap.get('aluno_cpf') || ''),
                    first_name: alunoNome.split(' ')[0] || '',
                    last_name: alunoNome.split(' ').slice(1).join(' ') || '',
                    email: String(infoMap.get('aluno_email') || ''),
                    phone: String(infoMap.get('aluno_telefone') || ''),
                  };
                  this.logger.debug(`✅ Dados do cliente recuperados de info_additional para transação ${transaction._id}`);
                }
              }
              
              this.logger.debug(`📄 Transação ${transaction._id} - client:`, JSON.stringify(clientData || 'NÃO TEM'));
              
              return {
                ...transaction,
                client: clientData,
                info_additional: details.info_additional || [],
              };
            } else {
              this.logger.warn(`⚠️ Erro ao buscar detalhes da transação ${transaction._id}`);
              return transaction;
            }
          } catch (error) {
            this.logger.error(`❌ Erro ao buscar detalhes da transação ${transaction._id}:`, error.message);
            return transaction;
          }
        })
      );

      data.data = transactionsWithDetails;

      // Agora enriquecer com dados do aluno do nosso banco
      const cpfs = [...new Set(
        data.data
          .map(t => t.client?.document)
          .filter(cpf => cpf && cpf.length > 0)
      )];

      if (cpfs.length > 0) {
        this.logger.debug(`🔍 Buscando ${cpfs.length} aluno(s) por CPF para enriquecer...`);
        
        const alunos = await this.alunoRepository.find({
          where: { cpf: In(cpfs) },
          select: ['id', 'cpf', 'nome_completo', 'email', 'telefone', 'unidade_id', 'numero_matricula', 'status'],
        });

        const alunoMap = new Map(alunos.map(a => [a.cpf, a]));

        data.data = data.data.map(transaction => {
          const aluno = transaction.client?.document 
            ? alunoMap.get(transaction.client.document)
            : null;

          return {
            ...transaction,
            aluno: aluno ? {
              id: aluno.id,
              nome: aluno.nome_completo,
              email: aluno.email,
              telefone: aluno.telefone,
              unidade_id: aluno.unidade_id,
              numero_matricula: aluno.numero_matricula,
              status: aluno.status,
            } : null,
          };
        });

        this.logger.debug(`✅ ${alunos.length} aluno(s) vinculado(s) às transações`);
      }
    }
    
    // ADICIONAR BOLETOS DO BANCO LOCAL (Paytime API não retorna boletos na listagem - BUG conhecido)
    this.logger.debug(`🔍 Verificando se precisa buscar boletos do banco local...`);
    
    const temBillets = data.data?.some(t => t.type === 'BILLET');
    this.logger.debug(`💳 API Paytime retornou boletos? ${temBillets ? 'SIM' : 'NÃO'}`);
    
    if (!temBillets) {
      this.logger.debug(`🔍 Buscando boletos do banco local para estabelecimento ${establishmentId}...`);
      try {
        const unidades = await this.unidadeRepository.find({
          where: { paytime_establishment_id: establishmentId.toString() },
          select: ['id', 'nome', 'paytime_establishment_id'],
        });
        
        this.logger.debug(`📍 Query: SELECT id, nome, paytime_establishment_id FROM unidades WHERE paytime_establishment_id = '${establishmentId}'`);
        this.logger.debug(`📍 Resultado: ${unidades.length} unidade(s) encontrada(s)`);
        
        if (unidades.length > 0) {
          const unidadeIds = unidades.map(u => u.id);
          
          // Log detalhado das unidades
          unidades.forEach(u => {
            this.logger.debug(`   - Unidade: ${u.nome} (ID: ${u.id}, Establishment: ${u.paytime_establishment_id})`);
          });
          
          this.logger.debug(`🔍 Buscando boletos das unidades: [${unidadeIds.join(', ')}]`);
          
          const boletos = await this.transacaoRepository
            .createQueryBuilder('t')
            .leftJoinAndSelect('t.aluno', 'aluno')
            .where('t.unidade_id IN (:...unidadeIds)', { unidadeIds })
            .andWhere('t.paytime_payment_type = :type', { type: 'BILLET' })
            .andWhere('t.paytime_transaction_id IS NOT NULL')
            .orderBy('t.created_at', 'DESC')
            .limit(50)
            .getMany();
          
          this.logger.debug(`💳 Encontrados ${boletos.length} boleto(s) no banco local para estabelecimento ${establishmentId}`);
          
          if (boletos.length > 0) {
            boletos.slice(0, 3).forEach((b, i) => {
              this.logger.debug(`   ${i + 1}. Boleto: ${b.paytime_transaction_id} | Unidade: ${b.unidade_id} | Valor: ${b.valor} | Data: ${b.created_at}`);
            });
          }
          
          // Converter boletos para formato Paytime
          const boletosFormatted = boletos.map(boleto => ({
            _id: boleto.paytime_transaction_id,
            status: boleto.status === 'PENDENTE' ? 'PENDING' : 
                    boleto.status === 'CONFIRMADA' ? 'PAID' : 
                    boleto.status === 'CANCELADA' ? 'CANCELED' : 'PENDING',
            type: 'BILLET',
            amount: Math.round(boleto.valor * 100), // Converter para centavos
            created_at: boleto.created_at,
            establishment: {
              id: establishmentId,
              type: 'BUSINESS',
            },
            client: boleto.aluno ? {
              document: boleto.aluno.cpf,
              first_name: boleto.aluno.nome_completo?.split(' ')[0] || '',
              last_name: boleto.aluno.nome_completo?.split(' ').slice(1).join(' ') || '',
              email: boleto.aluno.email,
              phone: boleto.aluno.telefone,
            } : null,
            aluno: boleto.aluno ? {
              id: boleto.aluno.id,
              nome: boleto.aluno.nome_completo,
              email: boleto.aluno.email,
              telefone: boleto.aluno.telefone,
              unidade_id: boleto.unidade_id,
              numero_matricula: boleto.aluno.numero_matricula,
              status: boleto.aluno.status,
            } : null,
            paytime_metadata: boleto.paytime_metadata,
            billet_barcode: boleto.paytime_metadata?.barcode,
            billet_digitable_line: boleto.paytime_metadata?.digitable_line,
            billet_url: boleto.paytime_metadata?.pdf_url,
            billet_due_date: boleto.paytime_metadata?.due_date,
          }));
          
          if (boletosFormatted.length > 0) {
            // Combinar boletos com transações da Paytime (boletos primeiro, mais recentes)
            data.data = [...boletosFormatted, ...(data.data || [])];
            data.total = (data.total || 0) + boletos.length;
            
            this.logger.debug(`✅ Total de transações após adicionar boletos: ${data.data.length}`);
          }
        }
      } catch (error) {
        this.logger.error(`❌ Erro ao buscar boletos do banco local: ${error.message}`);
        // Não falhar a requisição, apenas logar o erro
      }
    } else {
      this.logger.debug(`✅ API Paytime já retornou boletos, não precisa buscar do banco local`);
    }

    // COMPLEMENTAR COM TRANSAÇÕES DE CARTÃO DO BANCO LOCAL
    // Motivo: a API Paytime às vezes não retorna transações CREDIT na listagem geral
    // (filtro de establishment pode remover, paginação pode deixar de fora, ou falhou antes de chegar)
    // Estratégia:
    //   - Se tem paytime_transaction_id → busca diretamente na API Paytime pelo ID (dado real)
    //   - Se não tem paytime_transaction_id → nunca chegou no Paytime, usa dado local
    this.logger.debug(`🔍 Verificando transações de cartão do banco local para estabelecimento ${establishmentId}...`);
    try {
      const unidadesCard = await this.unidadeRepository.find({
        where: { paytime_establishment_id: establishmentId.toString() },
        select: ['id'],
      });

      if (unidadesCard.length > 0) {
        const unidadeIdsCard = unidadesCard.map(u => u.id);

        const transacoesCartaoLocais = await this.transacaoRepository
          .createQueryBuilder('t')
          .leftJoinAndSelect('t.aluno', 'aluno')
          .where('t.unidade_id IN (:...unidadeIds)', { unidadeIds: unidadeIdsCard })
          .andWhere('t.metodo_pagamento = :metodo', { metodo: 'CARTAO' })
          .orderBy('t.created_at', 'DESC')
          .limit(50)
          .getMany();

        this.logger.debug(`💳 ${transacoesCartaoLocais.length} transação(ões) de cartão no banco local`);

        // IDs já presentes na listagem da Paytime para deduplicar
        const idsExistentes = new Set((data.data || []).map((t: any) => t._id || t.id));

        // Separar em: tem ID Paytime (busca na API) vs não tem (usa local)
        const comIdPaytime = transacoesCartaoLocais.filter(
          t => t.paytime_transaction_id && !idsExistentes.has(t.paytime_transaction_id),
        );
        const semIdPaytime = transacoesCartaoLocais.filter(
          t => !t.paytime_transaction_id,
        );

        this.logger.debug(`💳 Com paytime_transaction_id (buscar na API): ${comIdPaytime.length}, Sem (usar local): ${semIdPaytime.length}`);

        // Buscar dados reais da Paytime para transações com ID
        const fetchedFromPaytime = await Promise.all(
          comIdPaytime.map(async t => {
            try {
              const paytimeData = await this.getTransaction(establishmentId, t.paytime_transaction_id);
              this.logger.debug(`✅ Transação ${t.paytime_transaction_id} recuperada da Paytime — Status: ${paytimeData.status}`);
              // Enriquecer com dados do aluno local
              return {
                ...paytimeData,
                aluno: t.aluno ? {
                  id: t.aluno.id,
                  nome: t.aluno.nome_completo,
                  email: t.aluno.email,
                  telefone: t.aluno.telefone,
                  unidade_id: t.unidade_id,
                  numero_matricula: t.aluno.numero_matricula,
                  status: t.aluno.status,
                } : paytimeData.aluno || null,
                _source: 'PAYTIME_INDIVIDUAL',
              };
            } catch (err) {
              this.logger.warn(`⚠️ Falha ao buscar ${t.paytime_transaction_id} na Paytime: ${err.message} — usando dado local`);
              // Fallback para dado local
              return {
                _id: t.paytime_transaction_id,
                id: t.id,
                status: t.status === 'PENDENTE' ? 'PENDING'
                  : t.status === 'CONFIRMADA' ? 'PAID'
                  : 'FAILED',
                type: t.paytime_payment_type || 'CREDIT',
                amount: Math.round(t.valor * 100),
                created_at: t.created_at,
                _source: 'LOCAL_FALLBACK',
                establishment: { id: establishmentId },
                card: t.paytime_metadata ? {
                  brand_name: t.paytime_metadata.brand_name,
                  first4_digits: t.paytime_metadata.first4_digits,
                  last4_digits: t.paytime_metadata.last4_digits,
                  holder_name: t.paytime_metadata.holder_name,
                } : null,
                client: t.aluno ? {
                  document: t.aluno.cpf,
                  first_name: t.aluno.nome_completo?.split(' ')[0] || '',
                  last_name: t.aluno.nome_completo?.split(' ').slice(1).join(' ') || '',
                  email: t.aluno.email,
                } : null,
                aluno: t.aluno ? {
                  id: t.aluno.id,
                  nome: t.aluno.nome_completo,
                  email: t.aluno.email,
                  telefone: t.aluno.telefone,
                  unidade_id: t.unidade_id,
                  numero_matricula: t.aluno.numero_matricula,
                  status: t.aluno.status,
                } : null,
                observacoes: t.observacoes,
              };
            }
          }),
        );

        // Formatar transações sem ID (nunca chegaram no Paytime)
        const localOnly = semIdPaytime.map(t => ({
          _id: `local-${t.id}`,
          id: t.id,
          status: t.status === 'PENDENTE' ? 'PENDING'
            : t.status === 'CONFIRMADA' ? 'PAID'
            : 'FAILED',
          type: t.paytime_payment_type || 'CREDIT',
          amount: Math.round(t.valor * 100),
          created_at: t.created_at,
          _source: 'LOCAL_DB',
          establishment: { id: establishmentId },
          card: null,
          client: t.aluno ? {
            document: t.aluno.cpf,
            first_name: t.aluno.nome_completo?.split(' ')[0] || '',
            last_name: t.aluno.nome_completo?.split(' ').slice(1).join(' ') || '',
            email: t.aluno.email,
          } : null,
          aluno: t.aluno ? {
            id: t.aluno.id,
            nome: t.aluno.nome_completo,
            email: t.aluno.email,
            telefone: t.aluno.telefone,
            unidade_id: t.unidade_id,
            numero_matricula: t.aluno.numero_matricula,
            status: t.aluno.status,
          } : null,
          observacoes: t.observacoes,
        }));

        const toAdd = [...fetchedFromPaytime, ...localOnly];

        if (toAdd.length > 0) {
          this.logger.debug(`➕ Adicionando ${toAdd.length} transação(ões) de cartão à listagem`);
          data.data = [...(data.data || []), ...toAdd];
          data.data.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          );
          data.total = (data.total || 0) + toAdd.length;
        }
      }
    } catch (error) {
      this.logger.error(`❌ Erro ao complementar transações de cartão: ${error.message}`);
    }

    return data;
  }

  /**
   * Buscar transação específica por ID
   */
  async getTransaction(establishmentId: number, transactionId: string) {
    const token = await this.authenticate();

    // ATENÇÃO: GET /api/transactions/{id} NÃO usa establishment_id no header (per swagger).
    // Enviar establishment_id causa 404 para transações de outros establishments (ex: marketplace).
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const url = `${this.baseUrl}/api/transactions/${transactionId}`;
    this.logger.debug(`🔍 Buscando transação ${transactionId} em: ${url}`);

    const response = await fetch(url, { method: 'GET', headers });

    if (response.ok) {
      const data = await response.json();
      this.logger.debug(`✅ Transação ${transactionId} encontrada — Status: ${data.status}, Establishment: ${data.establishment?.id}`);
      return data;
    }

    if (response.status !== 404) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao buscar transação ${transactionId}: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao buscar transação: ${response.status} - ${errorText}`);
    }

    throw new NotFoundException(`Transação ${transactionId} não encontrada`);
  }

  /**
   * Buscar planos comerciais Paytime selecionados da unidade
   */
  async getUnidadePaytimePlans(unidadeId: string): Promise<Array<{id: number; active: boolean; name: string}>> {
    const unidade = await this.unidadeRepository.findOne({
      where: { id: unidadeId },
      select: ['id', 'nome', 'paytime_establishment_id', 'paytime_plans'],
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    if (!unidade.paytime_establishment_id) {
      throw new BadRequestException('Unidade não possui estabelecimento Paytime configurado');
    }

    return unidade.paytime_plans || [];
  }

  /**
   * Atualizar planos comerciais Paytime selecionados da unidade
   */
  async updateUnidadePaytimePlans(
    unidadeId: string, 
    plans: Array<{id: number; active: boolean; name: string}>
  ): Promise<void> {
    const unidade = await this.unidadeRepository.findOne({
      where: { id: unidadeId },
    });

    if (!unidade) {
      throw new NotFoundException('Unidade não encontrada');
    }

    if (!unidade.paytime_establishment_id) {
      throw new BadRequestException('Unidade não possui estabelecimento Paytime configurado');
    }

    // Validar se os planos existem na API Paytime (opcional - pode comentar se quiser performance)
    // const allPlans = await this.listPlans();
    // const validPlanIds = allPlans.data.map(p => p.id);
    // const invalidPlans = plans.filter(p => !validPlanIds.includes(p.id));
    // if (invalidPlans.length > 0) {
    //   throw new BadRequestException(`Planos inválidos: ${invalidPlans.map(p => p.id).join(', ')}`);
    // }

    unidade.paytime_plans = plans;
    await this.unidadeRepository.save(unidade);

    this.logger.log(`✅ Planos Paytime atualizados para unidade ${unidade.nome}: ${plans.length} planos`);
  }

  /**
   * 📊 Consultar saldo bancário de um estabelecimento
   */
  async getBankingBalance(establishmentId: number) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/banking/balance`;

    this.logger.debug(`💰 Consultando saldo bancário do estabelecimento ${establishmentId}...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao consultar saldo: ${response.status} - ${errorText}`);
      
      // Trata especificamente erro de conta bancária não encontrada
      if (response.status === 403 || response.status === 404) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson?.code === 'BNK000142' || errorJson?.message?.includes('Conta bancária não encontrada')) {
            throw new BadRequestException('Conta bancária não encontrada. O estabelecimento precisa configurar dados bancários no PayTime.');
          }
        } catch (e) {
          if (e instanceof BadRequestException) throw e;
          // Se não conseguir parsear, continua com erro genérico
        }
      }
      
      throw new BadRequestException(`Erro ao consultar saldo: ${response.status}`);
    }

    const data = await response.json();
    this.logger.log(`🔍 [SALDO] Dados recebidos da API rykon-pay:`);
    this.logger.log(JSON.stringify(data, null, 2));
    this.logger.log(`✅ Saldo consultado com sucesso`);
    return data;
  }

  /**
   * 📋 Consultar extrato bancário de um estabelecimento
   */
  async getBankingExtract(
    establishmentId: number,
    startDate: string,
    endDate: string,
  ) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/banking/extract`;

    this.logger.debug(
      `📋 Consultando extrato bancário do estabelecimento ${establishmentId} de ${startDate} a ${endDate}...`,
    );

    // A API do rykon-pay NÃO aceita start_date/end_date como query params
    // Envia apenas establishment_id no header
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'establishment_id': establishmentId.toString(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao consultar extrato: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao consultar extrato: ${response.status}`);
    }

    const data = await response.json();
    
    this.logger.log(`🔍 [EXTRATO] Dados brutos recebidos da API rykon-pay:`);
    this.logger.log(`🔍 [EXTRATO] Total de lançamentos retornados pela API: ${data.data?.length || 0}`);
    
    if (data.data && data.data.length > 0) {
      this.logger.log(`🔍 [EXTRATO] Primeiro lançamento (exemplo):`);
      this.logger.log(JSON.stringify(data.data[0], null, 2));
      this.logger.log(`🔍 [EXTRATO] Último lançamento (exemplo):`);
      this.logger.log(JSON.stringify(data.data[data.data.length - 1], null, 2));
    }
    
    // Filtrar os dados localmente por data se necessário
    let lancamentos = data.data || [];
    const totalOriginal = lancamentos.length;
    
    if (startDate || endDate) {
      const inicio = startDate ? new Date(startDate) : new Date('1900-01-01');
      const fim = endDate ? new Date(endDate) : new Date('2100-12-31');
      inicio.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
      
      this.logger.log(`🔍 [EXTRATO] Filtro de datas:`);
      this.logger.log(`  - Data início: ${inicio.toISOString()} (${startDate})`);
      this.logger.log(`  - Data fim: ${fim.toISOString()} (${endDate})`);
      
      lancamentos = lancamentos.filter((item: any, index: number) => {
        const dataItem = new Date(item.created_at || item.date || item.created);
        const dentroRange = dataItem >= inicio && dataItem <= fim;
        
        if (index < 3 || !dentroRange) {
          this.logger.log(`🔍 [EXTRATO] Item ${index}: ${item.created_at || item.date || item.created} - ${dentroRange ? '✅ INCLUÍDO' : '❌ FILTRADO'}`);
        }
        
        return dentroRange;
      });
      
      this.logger.log(`🔍 [EXTRATO] Resultado do filtro: ${lancamentos.length} de ${totalOriginal} lançamentos mantidos`);
    }
    
    this.logger.log(`✅ Extrato consultado com sucesso - ${lancamentos.length} lançamentos`);
    return { ...data, data: lancamentos };
  }

  async listLiquidations(
    filters?: any,
    search?: string,
    page?: number,
    perPage?: number,
    sorters?: any,
    establishmentId?: number,
  ) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/liquidations`;

    this.logger.debug(
      `💰 Consultando liquidações - page: ${page || 1}, perPage: ${perPage || 10}`,
    );

    const queryParams = new URLSearchParams();
    
    if (filters) {
      queryParams.append('filters', JSON.stringify(filters));
    }
    if (search) {
      queryParams.append('search', search);
    }
    if (page) {
      queryParams.append('page', page.toString());
    }
    if (perPage) {
      queryParams.append('per_page', perPage.toString());
    }
    if (sorters) {
      queryParams.append('sorters', JSON.stringify(sorters));
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    if (establishmentId) {
      headers['establishment_id'] = establishmentId.toString();
    }

    const response = await fetch(`${url}?${queryParams}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao consultar liquidações: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao consultar liquidações: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug(`✅ Liquidações consultadas com sucesso - ${data.data?.length || 0} registros`);
    return data;
  }

  async listLiquidationsExtract(
    filters?: any,
    search?: string,
    page?: number,
    perPage?: number,
    sorters?: any,
    establishmentId?: number,
  ) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/liquidations/extract`;

    this.logger.debug(
      `📊 Consultando extrato de liquidações - page: ${page || 1}, perPage: ${perPage || 10}`,
    );

    const queryParams = new URLSearchParams();
    
    if (filters) {
      queryParams.append('filters', JSON.stringify(filters));
    }
    if (search) {
      queryParams.append('search', search);
    }
    if (page) {
      queryParams.append('page', page.toString());
    }
    if (perPage) {
      queryParams.append('per_page', perPage.toString());
    }
    if (sorters) {
      queryParams.append('sorters', JSON.stringify(sorters));
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    if (establishmentId) {
      headers['establishment_id'] = establishmentId.toString();
    }

    const response = await fetch(`${url}?${queryParams}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao consultar extrato de liquidações: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao consultar extrato de liquidações: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug(`✅ Extrato de liquidações consultado com sucesso - ${data.data?.length || 0} registros`);
    return data;
  }

  /**
   * Lista representantes comerciais do Marketplace Paytime
   * GET /api/representatives
   */
  async listRepresentatives(
    filters?: any,
    search?: string,
    page?: number,
    perPage?: number,
    sorters?: any[],
  ) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/representatives`;

    // Usar valores padrão se não fornecidos
    const pageValue = page || 1;
    const perPageValue = perPage || 20;

    this.logger.debug(
      `👥 Listando representantes comerciais - page: ${pageValue}, perPage: ${perPageValue}`,
    );

    const queryParams = new URLSearchParams();
    
    if (filters) {
      queryParams.append('filters', JSON.stringify(filters));
      this.logger.debug(`🎯 Aplicando filtros: ${JSON.stringify(filters)}`);
    }
    
    if (search) {
      queryParams.append('search', search);
      this.logger.debug(`🔍 Aplicando busca: ${search}`);
    }
    
    // Sempre enviar page e perPage como números
    queryParams.append('page', pageValue.toString());
    queryParams.append('perPage', perPageValue.toString());
    
    if (sorters && sorters.length > 0) {
      queryParams.append('sorters', JSON.stringify(sorters));
    }

    const response = await fetch(`${url}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao listar representantes: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao listar representantes: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug(`✅ Representantes listados com sucesso - Total: ${data.total || 0}, Página: ${data.page || 1}`);
    return data;
  }

  /**
   * Busca detalhes de um representante específico
   * GET /api/representatives/:id
   */
  async getRepresentativeById(id: number) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/representatives/${id}`;

    this.logger.debug(`🔍 Buscando detalhes do representante ID: ${id}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        this.logger.warn(`⚠️ Representante ID ${id} não encontrado`);
        throw new NotFoundException(`Representante ID ${id} não encontrado`);
      }
      
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao buscar representante: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao buscar representante: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug(`✅ Representante ID ${id} encontrado: ${data.establishment?.first_name || 'N/A'}`);
    return data;
  }

  // ==================== MÉTODOS DE ANTIFRAUDE ====================

  /**
   * Obter configuração do SDK IDPAY (Unico)
   * GET /api/antifraud/idpay/sdk-config
   */
  async getIdpaySdkConfig() {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/antifraud/idpay/sdk-config`;

    this.logger.debug('🔐 Obtendo configuração SDK IDPAY...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao obter SDK config IDPAY: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao obter SDK config IDPAY: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug('✅ SDK config IDPAY obtido com sucesso');
    return data;
  }

  /**
   * Autenticar transação com IDPAY (Unico)
   * POST /api/antifraud/idpay/:id/authenticate
   */
  async authenticateIdpay(transactionId: string, authData: {
    id: string;
    concluded: boolean;
    capture_concluded: boolean;
  }) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/antifraud/idpay/${transactionId}/authenticate`;

    this.logger.debug(`🔐 Autenticando transação IDPAY - ID: ${transactionId}`);

    // Buscar establishment_id via paytime_transaction_id → unidade
    let establishmentId: string | null = null;
    try {
      const transacao = await this.transacaoRepository.findOne({
        where: { paytime_transaction_id: transactionId },
        select: ['id', 'unidade_id'],
      });
      if (transacao?.unidade_id) {
        const unidade = await this.unidadeRepository.findOne({
          where: { id: transacao.unidade_id },
          select: ['id', 'paytime_establishment_id'],
        });
        if (unidade?.paytime_establishment_id) {
          establishmentId = unidade.paytime_establishment_id.toString();
        }
      }
    } catch (e) {
      this.logger.warn(`⚠️ Não foi possível obter establishment_id para ${transactionId}: ${e.message}`);
    }

    if (!establishmentId) {
      this.logger.warn(`⚠️ establishment_id não encontrado para transação ${transactionId} — chamando sem o header`);
    } else {
      this.logger.debug(`📍 establishment_id encontrado: ${establishmentId}`);
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    if (establishmentId) {
      headers['establishment_id'] = establishmentId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(authData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao autenticar IDPAY: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao autenticar IDPAY: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug(`✅ Autenticação IDPAY concluída - resposta: ${JSON.stringify(data)}`);

    // ⚡ CRÍTICO: Paytime gera NOVO ID após autenticação IDPAY — salvar no banco imediatamente
    const finalTransactionId = data.new_transaction_id || data.transaction_id || transactionId;
    if (data.new_transaction_id && data.new_transaction_id !== transactionId) {
      this.logger.log(`🔄 [IDPAY] new_transaction_id recebido → atualizando banco: ${transactionId} → ${data.new_transaction_id}`);
      try {
        const transacaoParaAtualizar = await this.transacaoRepository.findOne({
          where: { paytime_transaction_id: transactionId },
        });
        if (transacaoParaAtualizar) {
          transacaoParaAtualizar.paytime_transaction_id = data.new_transaction_id;
          await this.transacaoRepository.save(transacaoParaAtualizar);
          this.logger.log(`✅ [IDPAY] paytime_transaction_id atualizado no banco para transação ${transacaoParaAtualizar.id}`);
        } else {
          this.logger.warn(`⚠️ [IDPAY] Transação com ID antigo ${transactionId} não encontrada no banco para atualizar`);
        }
      } catch (e) {
        this.logger.error(`❌ [IDPAY] Erro ao atualizar new_transaction_id no banco: ${e.message}`);
      }
    }

    let analyse_status: string | undefined;
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 1. Verificar se a resposta do POST já tem o status definitivo
    this.logger.log(`📋 [IDPAY] Resposta POST authenticate: ${JSON.stringify(data)}`);
    const immediateStatus = data.antifraud?.[0]?.analyse_status;
    // WAITING_AUTH e PROCESSING são estados intermediários — precisam de GET retry
    const isIntermediateStatus = !immediateStatus || immediateStatus === 'WAITING_AUTH' || immediateStatus === 'PROCESSING';
    if (!isIntermediateStatus) {
      analyse_status = immediateStatus;
      this.logger.log(`📍 [IDPAY] analyse_status direto do POST authenticate: ${analyse_status}`);
    } else {
      this.logger.log(`⏳ [IDPAY] Status intermediário no POST (${immediateStatus || 'ausente'}) — aguardando resultado via GET...`);
    }

    // 2. Se ainda intermediário ou ausente, tenta GET com retries
    if (!analyse_status && establishmentId) {
      try {
        const delays = [2000, 3000, 4000, 5000];
        for (let i = 0; i < delays.length; i++) {
          await sleep(delays[i]);
          this.logger.debug(`🔄 [IDPAY] Tentativa ${i + 1} de buscar analyse_status via GET (aguardou ${delays[i]}ms)...`);
          try {
            const txUrl = `${this.baseUrl}/api/transactions/${finalTransactionId}`;
            const freshToken = await this.authenticate();
            const txResponse = await fetch(txUrl, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${freshToken}`,
                'Content-Type': 'application/json',
                'establishment_id': establishmentId,
              },
            });
            if (txResponse.ok) {
              const txData = await txResponse.json();
              const status = txData?.antifraud?.[0]?.analyse_status;
              this.logger.debug(`📍 [IDPAY] analyse_status via GET (tentativa ${i + 1}): ${status}`);
              if (status && status !== 'WAITING_AUTH') {
                analyse_status = status;
                break;
              }
            } else {
              this.logger.warn(`⚠️ [IDPAY] GET retornou ${txResponse.status} na tentativa ${i + 1}`);
            }
          } catch (innerErr) {
            this.logger.warn(`⚠️ [IDPAY] Erro na tentativa ${i + 1}: ${innerErr.message}`);
          }
        }
        if (!analyse_status) {
          this.logger.warn(`⚠️ [IDPAY] analyse_status não obtido após todas as tentativas — mantendo como WAITING_AUTH`);
          analyse_status = 'WAITING_AUTH';
        }
      } catch (e) {
        this.logger.warn(`⚠️ Não foi possível buscar analyse_status via GET: ${e.message}`);
      }
    }

    // Atualizar status da transacao e fatura com base no analyse_status
    if (analyse_status) {
      try {
        const transacao = await this.transacaoRepository.findOne({
          where: { paytime_transaction_id: finalTransactionId },
        });
        if (transacao) {
          // Atualizar metadata com o novo analyse_status
          transacao.paytime_metadata = {
            ...(transacao.paytime_metadata as any || {}),
            antifraud: {
              ...((transacao.paytime_metadata as any)?.antifraud || {}),
              analyse_status,
            },
          };
          if (analyse_status === 'APPROVED' && transacao.status !== StatusTransacao.CONFIRMADA) {
            transacao.status = StatusTransacao.CONFIRMADA;
            await this.transacaoRepository.save(transacao);
            this.logger.log(`✅ [IDPAY] Transação ${transacao.id} marcada como CONFIRMADA`);
            // Cancelar outras transações PENDENTE da mesma fatura
            if (transacao.fatura_id) {
              const outrasPendentes = await this.transacaoRepository.find({
                where: {
                  fatura_id: transacao.fatura_id,
                  status: StatusTransacao.PENDENTE,
                  id: Not(transacao.id),
                },
              });
              if (outrasPendentes.length > 0) {
                for (const outra of outrasPendentes) {
                  outra.status = StatusTransacao.CANCELADA;
                  outra.observacoes = 'Cancelada — outra transação da mesma fatura foi aprovada via IDPAY';
                }
                await this.transacaoRepository.save(outrasPendentes);
                this.logger.log(`🗑️ [IDPAY] ${outrasPendentes.length} transação(ões) PENDENTE cancelada(s) para fatura ${transacao.fatura_id}`);
              }
              // Baixar fatura
              const fatura = await this.faturaRepository.findOne({ where: { id: transacao.fatura_id } });
              if (fatura && fatura.status !== StatusFatura.PAGA) {
                fatura.status = StatusFatura.PAGA;
                fatura.data_pagamento = new Date();
                fatura.valor_pago = transacao.valor;
                await this.faturaRepository.save(fatura);
                this.logger.log(`✅ [IDPAY] Fatura ${fatura.id} baixada com sucesso`);
              }
            }
          } else if (['FAILED', 'INCONCLUSIVE', 'WAITING_AUTH'].includes(analyse_status) && transacao.status === StatusTransacao.PENDENTE) {
            // FAILED/INCONCLUSIVE/WAITING_AUTH: cancelar transação para limpar o badge "Pagamento em Processamento"
            transacao.status = StatusTransacao.CANCELADA;
            transacao.observacoes = `IDPAY: ${analyse_status}`;
            await this.transacaoRepository.save(transacao);
            this.logger.log(`🗑️ [IDPAY] Transação ${transacao.id} cancelada (analyse_status=${analyse_status})`);
          } else {
            await this.transacaoRepository.save(transacao);
            this.logger.log(`ℹ️ [IDPAY] Transação ${transacao.id} metadata atualizada (${analyse_status})`);
          }
        }
      } catch (e) {
        this.logger.warn(`⚠️ [IDPAY] Erro ao atualizar transação/fatura: ${e.message}`);
      }
    }

    return { ...data, analyse_status };
  }

  /**
   * Obter configuração do SDK 3DS (PagBank)
   * GET /api/antifraud/threeds/sdk-config
   */
  async getThreeDsSdkConfig() {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/antifraud/threeds/sdk-config`;

    this.logger.debug('🔐 Obtendo configuração SDK 3DS...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao obter SDK config 3DS: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao obter SDK config 3DS: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug('✅ SDK config 3DS obtido com sucesso');
    return data;
  }

  /**
   * Obter cartões de teste do 3DS
   * GET /api/antifraud/threeds/test-cards
   */
  async getThreeDsTestCards() {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/antifraud/threeds/test-cards`;

    this.logger.debug('🔐 Obtendo cartões de teste 3DS...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao obter cartões teste 3DS: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao obter cartões teste 3DS: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug('✅ Cartões teste 3DS obtidos com sucesso');
    return data;
  }

  /**
   * Autenticar transação com 3DS (PagBank)
   * POST /api/antifraud/threeds/:id/authenticate
   */
  async authenticateThreeDs(transactionId: string, authData: {
    authentication_token: string;
    redirect_url?: string;
  }) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/antifraud/threeds/${transactionId}/authenticate`;

    this.logger.debug(`🔐 Autenticando transação 3DS - ID: ${transactionId}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao autenticar 3DS: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao autenticar 3DS: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug(`✅ Autenticação 3DS concluída - Status: ${data.status}`);
    return data;
  }

  /**
   * Gerar Session ID para ClearSale
   * POST /api/antifraud/session
   */
  async generateSessionId(sessionData: {
    user_id: string;
    ip_address?: string;
    user_agent?: string;
  }) {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/antifraud/session`;

    this.logger.debug('🔐 Gerando Session ID ClearSale...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao gerar Session ID: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao gerar Session ID: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug(`✅ Session ID gerado: ${data.session_id}`);
    return data;
  }

  /**
   * Obter configuração do script ClearSale
   * GET /api/antifraud/script-config
   */
  async getClearSaleScriptConfig() {
    const token = await this.authenticate();
    const url = `${this.baseUrl}/api/antifraud/script-config`;

    this.logger.debug('🔐 Obtendo configuração ClearSale...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`❌ Erro ao obter config ClearSale: ${response.status} - ${errorText}`);
      throw new BadRequestException(`Erro ao obter config ClearSale: ${response.status}`);
    }

    const data = await response.json();
    this.logger.debug('✅ Config ClearSale obtido com sucesso');
    return data;
  }

  /**
   * Lista splits pré-configurados do estabelecimento
   */
  async listSplitPre(establishmentId: number, retry = true): Promise<any> {
    const token = await this.authenticate();

    try {
      this.logger.debug(`Listando splits pré-configurados do estabelecimento ${establishmentId}...`);
      
      const filters = JSON.stringify({ 'establishment.id': establishmentId });
      const url = `${this.baseUrl}/api/transactions/split/pre?filters=${encodeURIComponent(filters)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 && retry) {
          this.token = null;
          this.tokenExpires = 0;
          return this.listSplitPre(establishmentId, false);
        }
        
        const errorText = await response.text();
        this.logger.error(`❌ Erro ao listar splits: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Erro ao listar splits: ${response.status}`);
      }

      const data = await response.json();
      this.logger.debug(`✅ ${data.data?.length || 0} splits encontrados`);
      return data;
    } catch (error) {
      this.logger.error('❌ Erro ao listar splits:', error);
      throw error;
    }
  }

  /**
   * Busca detalhes de um split pré-configurado
   */
  async getSplitPre(splitId: string, retry = true): Promise<any> {
    const token = await this.authenticate();

    try {
      this.logger.debug(`Buscando split pré-configurado ${splitId}...`);
      
      const response = await fetch(
        `${this.baseUrl}/api/transactions/split/pre/${splitId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 && retry) {
          this.token = null;
          this.tokenExpires = 0;
          return this.getSplitPre(splitId, false);
        }

        if (response.status === 404) {
          throw new NotFoundException(`Split ${splitId} não encontrado`);
        }
        
        const errorText = await response.text();
        this.logger.error(`❌ Erro ao buscar split: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Erro ao buscar split: ${response.status}`);
      }

      const result = await response.json();
      this.logger.debug('✅ Split encontrado');
      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar split:', error);
      throw error;
    }
  }

  /**
   * Cria um novo split pré-configurado
   */
  async createSplitPre(establishmentId: number, data: any, retry = true): Promise<any> {
    const token = await this.authenticate();

    try {
      this.logger.debug(`Criando split pré-configurado para estabelecimento ${establishmentId}...`);
      
      const response = await fetch(
        `${this.baseUrl}/api/transactions/split/pre`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'establishment_id': establishmentId.toString(),
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        if (response.status === 401 && retry) {
          this.token = null;
          this.tokenExpires = 0;
          return this.createSplitPre(establishmentId, data, false);
        }
        
        const errorText = await response.text();
        this.logger.error(`❌ Erro ao criar split: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Erro ao criar split: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      this.logger.debug('✅ Split criado com sucesso');
      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao criar split:', error);
      throw error;
    }
  }

  /**
   * Atualiza um split pré-configurado existente
   */
  async updateSplitPre(splitId: string, data: any, retry = true): Promise<any> {
    const token = await this.authenticate();

    try {
      this.logger.debug(`Atualizando split ${splitId}...`);
      
      const response = await fetch(
        `${this.baseUrl}/api/transactions/split/pre/${splitId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        if (response.status === 401 && retry) {
          this.token = null;
          this.tokenExpires = 0;
          return this.updateSplitPre(splitId, data, false);
        }
        
        const errorText = await response.text();
        this.logger.error(`❌ Erro ao atualizar split: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Erro ao atualizar split: ${response.status}`);
      }

      const result = await response.json();
      this.logger.debug('✅ Split atualizado com sucesso');
      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao atualizar split:', error);
      throw error;
    }
  }

  /**
   * Deleta um split pré-configurado
   */
  async deleteSplitPre(splitId: string, retry = true): Promise<any> {
    const token = await this.authenticate();

    try {
      this.logger.debug(`Deletando split ${splitId}...`);
      
      const response = await fetch(
        `${this.baseUrl}/api/transactions/split/pre/${splitId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 && retry) {
          this.token = null;
          this.tokenExpires = 0;
          return this.deleteSplitPre(splitId, false);
        }

        if (response.status === 404) {
          throw new NotFoundException(`Split ${splitId} não encontrado`);
        }
        
        const errorText = await response.text();
        this.logger.error(`❌ Erro ao deletar split: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Erro ao deletar split: ${response.status}`);
      }

      const result = await response.json();
      this.logger.debug('✅ Split deletado com sucesso');
      return result;
    } catch (error) {
      this.logger.error('❌ Erro ao deletar split:', error);
      throw error;
    }
  }
}

export type { PaytimeEstablishment, PaytimeListResponse, PaytimeFilters, PaytimeSorter };