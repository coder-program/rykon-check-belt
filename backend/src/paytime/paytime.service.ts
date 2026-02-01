import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unidade } from '../people/entities/unidade.entity';

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
  private readonly baseUrl = 'https://rykon-pay-production.up.railway.app';
  private readonly paytimePassword = '!Rykon@pay';
  
  private token: string | null = null;
  private tokenExpires: number = 0;
  private authenticationPromise: Promise<string> | null = null; // Lock para evitar múltiplas autenticações simultâneas

  constructor(
    private configService: ConfigService,
    @InjectRepository(Unidade)
    private unidadeRepository: Repository<Unidade>,
  ) {}

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
      this.logger.debug('📤 Payload enviado:', JSON.stringify(data, null, 2));
      
      const response = await fetch(
        `${this.baseUrl}/api/establishments/${id}`,
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
}

export type { PaytimeEstablishment, PaytimeListResponse, PaytimeFilters, PaytimeSorter };