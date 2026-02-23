import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  Logger,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaytimeService } from './paytime.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';

@ApiTags('Paytime')
@Controller('paytime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaytimeController {
  private readonly logger = new Logger(PaytimeController.name);

  constructor(
    private readonly paytimeService: PaytimeService,
  ) {}

  @Get('establishments')
  @ApiOperation({
    summary: '📋 Listar estabelecimentos do Paytime',
    description: 'Lista estabelecimentos cadastrados no Marketplace Paytime com filtros, busca e paginação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de estabelecimentos retornada com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  @ApiResponse({
    status: 400,
    description: 'Erro na autenticação com Paytime',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'Filtros em JSON (status, type, risk)',
    example: '{"status":"APPROVED"}',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busca textual por documento, email, nome ou telefone',
    example: 'joao',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página atual',
    example: 1,
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Registros por página (máx: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'sorters',
    required: false,
    description: 'Ordenação em JSON',
    example: '[{"column":"created_at","direction":"DESC"}]',
  })
  async listEstablishments(
    @Query('filters') filters?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('sorters') sorters?: string,
  ) {
    this.logger.debug('Listando estabelecimentos Paytime...');
    
    let parsedFilters;
    let parsedSorters;

    try {
      parsedFilters = filters ? JSON.parse(filters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear filtros:', error);
      parsedFilters = undefined;
    }

    try {
      parsedSorters = sorters ? JSON.parse(sorters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear sorters:', error);
      parsedSorters = undefined;
    }

    const result = await this.paytimeService.listEstablishments({
      filters: parsedFilters,
      search,
      page,
      perPage,
      sorters: parsedSorters,
    });

    return {
      ...result,
      data: this.paytimeService.convertToInternalFormat(result.data),
    };
  }

  @Get('establishments/approved')
  @ApiOperation({
    summary: '✅ Listar apenas estabelecimentos aprovados',
    description: 'Lista apenas estabelecimentos com status APPROVED',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de estabelecimentos aprovados',
  })
  async getApprovedEstablishments(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    this.logger.debug('Listando estabelecimentos aprovados...');
    
    const result = await this.paytimeService.getApprovedEstablishments({
      search,
      page,
      perPage,
    });

    return {
      ...result,
      data: this.paytimeService.convertToInternalFormat(result.data),
    };
  }

  @Get('auth/status')
  @ApiOperation({
    summary: '🔐 Status da autenticação com Paytime',
    description: 'Verifica se a autenticação com Paytime está funcionando',
  })
  async checkAuthStatus() {
    try {
      const token = await this.paytimeService.authenticate();
      return {
        authenticated: true,
        token_preview: token.substring(0, 10) + '...',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        authenticated: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('establishments')
  @ApiOperation({
    summary: '➕ Criar novo estabelecimento',
    description: 'Cria um novo estabelecimento no Marketplace Paytime',
  })
  @ApiResponse({
    status: 201,
    description: 'Estabelecimento criado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  async createEstablishment(@Body() data: any) {
    this.logger.debug('Criando novo estabelecimento no Paytime...');
    return this.paytimeService.createEstablishment(data);
  }

  @Get('establishments/:id')
  @ApiOperation({
    summary: '🔍 Buscar estabelecimento por ID',
    description: 'Retorna todos os detalhes de um estabelecimento específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do estabelecimento',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  @ApiResponse({
    status: 404,
    description: 'Estabelecimento não encontrado',
  })
  async getEstablishmentById(@Param('id') id: string) {
    this.logger.debug(`Buscando estabelecimento ID: ${id}...`);
    return this.paytimeService.getEstablishmentById(parseInt(id));
  }

  @Put('establishments/:id')
  @ApiOperation({
    summary: '✏️ Atualizar estabelecimento',
    description: 'Atualiza dados de um estabelecimento existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Estabelecimento atualizado com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  @ApiResponse({
    status: 404,
    description: 'Estabelecimento não encontrado',
  })
  @ApiResponse({
    status: 422,
    description: 'Erro de validação',
  })
  async updateEstablishment(@Param('id') id: string, @Body() data: any) {
    this.logger.debug(`Atualizando estabelecimento ID: ${id}...`);
    return this.paytimeService.updateEstablishment(parseInt(id), data);
  }

  @Get('establishments/:id/unidades')
  @ApiOperation({
    summary: '🏢 Listar unidades vinculadas',
    description: 'Lista todas as unidades TeamCruz vinculadas a um estabelecimento Paytime',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de unidades vinculadas',
  })
  async getVinculatedUnidades(@Param('id') establishmentId: string) {
    this.logger.log(`🔍 [CONTROLLER] Requisição recebida: GET /paytime/establishments/${establishmentId}/unidades`);
    return this.paytimeService.getVinculatedUnidades(establishmentId);
  }

  @Post('establishments/:id/vincular-unidade/:unidadeId')
  @ApiOperation({
    summary: '🔗 Vincular unidade',
    description: 'Vincula uma unidade TeamCruz a um estabelecimento Paytime',
  })
  @ApiResponse({
    status: 200,
    description: 'Unidade vinculada com sucesso',
  })
  async vincularUnidade(
    @Param('id') establishmentId: string,
    @Param('unidadeId') unidadeId: string,
  ) {
    this.logger.debug(`Vinculando unidade ${unidadeId} ao estabelecimento ${establishmentId}...`);
    return this.paytimeService.vincularUnidade(establishmentId, unidadeId);
  }

  @Post('establishments/:id/desvincular-unidade/:unidadeId')
  @ApiOperation({
    summary: '🔓 Desvincular unidade',
    description: 'Remove vínculo de uma unidade TeamCruz com estabelecimento Paytime',
  })
  @ApiResponse({
    status: 200,
    description: 'Unidade desvinculada com sucesso',
  })
  async desvincularUnidade(
    @Param('id') establishmentId: string,
    @Param('unidadeId') unidadeId: string,
  ) {
    this.logger.debug(`Desvinculando unidade ${unidadeId} do estabelecimento ${establishmentId}...`);
    return this.paytimeService.desvincularUnidade(establishmentId, unidadeId);
  }

  // ==========================================
  // GATEWAYS
  // ==========================================

  @Get('gateways')
  @ApiOperation({
    summary: '⚡ Listar gateways disponíveis',
    description: 'Lista todos os gateways (ACQUIRER e BANKING) disponíveis na plataforma Paytime',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de gateways retornada com sucesso',
    schema: {
      example: {
        total: 3,
        page: 1,
        perPage: 20,
        lastPage: 1,
        data: [
          {
            id: 2,
            name: 'PAGSEGURO',
            type: 'ACQUIRER',
            created_at: '2023-06-21T15:06:02.000Z',
            updated_at: '2023-06-21T15:06:02.000Z',
          },
          {
            id: 4,
            name: 'PAYTIME',
            type: 'ACQUIRER',
            created_at: '2023-06-21T15:06:02.000Z',
            updated_at: '2023-06-21T15:06:02.000Z',
          },
          {
            id: 6,
            name: 'CELCOIN',
            type: 'BANKING',
            created_at: '2023-12-13T09:36:06.000Z',
            updated_at: '2023-12-13T09:36:06.000Z',
          },
        ],
      },
    },
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'Filtros em JSON (ex: {"type":"ACQUIRER"})',
    example: '{"type":"ACQUIRER"}',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busca textual por nome do gateway',
    example: 'PAYTIME',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página atual',
    example: 1,
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Registros por página (máx: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'sorters',
    required: false,
    description: 'Ordenação em JSON',
    example: '[{"column":"created_at","direction":"DESC"}]',
  })
  async listGateways(
    @Query('filters') filters?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('sorters') sorters?: string,
  ) {
    this.logger.debug('📋 Listando gateways Paytime...');
    
    let parsedFilters;
    let parsedSorters;

    try {
      parsedFilters = filters ? JSON.parse(filters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear filtros:', error);
      parsedFilters = undefined;
    }

    try {
      parsedSorters = sorters ? JSON.parse(sorters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear sorters:', error);
      parsedSorters = undefined;
    }

    return this.paytimeService.listGateways(
      parsedFilters,
      search,
      page || 1,
      perPage || 20,
      parsedSorters,
    );
  }

  @Get('gateways/:id')
  @ApiOperation({
    summary: '🔍 Buscar gateway por ID',
    description: 'Retorna detalhes de um gateway específico (PAYTIME: 4, PAGSEGURO: 2, CELCOIN: 6)',
  })
  @ApiResponse({
    status: 200,
    description: 'Gateway encontrado',
    schema: {
      example: {
        id: 4,
        name: 'PAYTIME',
        type: 'ACQUIRER',
        created_at: '2023-06-21T15:06:02.000Z',
        updated_at: '2023-06-21T15:06:02.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Gateway não encontrado',
  })
  async getGateway(@Param('id') id: string) {
    this.logger.debug(`🔍 Buscando gateway ${id}...`);
    return this.paytimeService.getGateway(parseInt(id, 10));
  }

  @Get('plans')
  @ApiOperation({
    summary: '💳 Listar planos comerciais',
    description: 'Lista todos os planos comerciais disponíveis com suporte a filtros, busca e paginação',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número da página',
    example: 1,
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Registros por página',
    example: 20,
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'Filtros (JSON): gateway_id, type (COMMERCIAL/CUSTOM), modality (ONLINE/PRESENCIAL/AMBOS), active (true/false)',
    example: '{"gateway_id":4,"type":"COMMERCIAL","active":true}',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome, tipo ou modalidade',
    example: 'e-commerce',
  })
  @ApiQuery({
    name: 'sorters',
    required: false,
    description: 'Ordenação (JSON)',
    example: '[{"column":"name","direction":"ASC"}]',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de planos comerciais',
    schema: {
      example: {
        total: 150,
        page: 1,
        perPage: 20,
        lastPage: 8,
        data: [
          {
            id: 93,
            name: 'Plano E-commerce',
            gateway_id: 4,
            active: true,
            type: 'COMMERCIAL',
            modality: 'ONLINE',
            created_at: '2023-10-15T10:00:00.000Z',
            updated_at: '2023-10-15T10:00:00.000Z',
          },
          {
            id: 15,
            name: 'Plano Presencial',
            gateway_id: 4,
            active: true,
            type: 'COMMERCIAL',
            modality: 'PRESENCIAL',
            created_at: '2023-06-21T15:06:02.000Z',
            updated_at: '2023-06-21T15:06:02.000Z',
          },
        ],
      },
    },
  })
  async listPlans(
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('filters') filters?: string,
    @Query('search') search?: string,
    @Query('sorters') sorters?: string,
  ) {
    this.logger.debug('📋 Listando planos comerciais Paytime...');
    
    let parsedFilters;
    let parsedSorters;

    try {
      parsedFilters = filters ? JSON.parse(filters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear filtros:', error);
      parsedFilters = undefined;
    }

    try {
      parsedSorters = sorters ? JSON.parse(sorters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear sorters:', error);
      parsedSorters = undefined;
    }

    return this.paytimeService.listPlans(
      page || 1,
      perPage || 20,
      parsedFilters,
      search,
      parsedSorters,
    );
  }

  @Get('plans/:id')
  @ApiOperation({
    summary: '🔍 Buscar plano comercial por ID',
    description: 'Retorna detalhes de um plano comercial específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Plano encontrado',
    schema: {
      example: {
        id: 93,
        name: 'Plano E-commerce',
        gateway_id: 4,
        active: true,
        type: 'COMMERCIAL',
        modality: 'ONLINE',
        created_at: '2023-10-15T10:00:00.000Z',
        updated_at: '2023-10-15T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Plano não encontrado',
  })
  async getPlan(@Param('id') id: string) {
    this.logger.debug(`🔍 Buscando plano ${id}...`);
    return this.paytimeService.getPlan(parseInt(id, 10));
  }

  @Post('establishments/:id/gateways')
  @ApiOperation({
    summary: '🔌 Ativar gateway em estabelecimento',
    description: 'Ativa um gateway (Banking ou SubPaytime) para um estabelecimento específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do estabelecimento Paytime',
    example: 123,
  })
  @ApiBody({
    description: 'Dados para ativação do gateway',
    schema: {
      oneOf: [
        {
          title: 'Banking (Gateway ID 6)',
          type: 'object',
          properties: {
            reference_id: { type: 'string', example: 'REF-BANKING-001' },
            gateway_id: { type: 'number', example: 6 },
            active: { type: 'boolean', example: true },
            form_receipt: { type: 'string', example: 'PAYTIME' },
            fees_banking_id: { type: 'number', example: 2 },
          },
          required: ['reference_id', 'gateway_id', 'active', 'form_receipt', 'fees_banking_id'],
        },
        {
          title: 'SubPaytime (Gateway ID 4)',
          type: 'object',
          properties: {
            reference_id: { type: 'string', example: 'REF-SUBPAYTIME-001' },
            gateway_id: { type: 'number', example: 4 },
            active: { type: 'boolean', example: true },
            form_receipt: { type: 'string', example: 'PAYTIME' },
            statement_descriptor: { type: 'string', example: 'Minha Empresa' },
            plans: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 93 },
                  active: { type: 'boolean', example: true },
                },
              },
              example: [
                { id: 93, active: true },
                { id: 15, active: true },
              ],
            },
          },
          required: ['reference_id', 'gateway_id', 'active', 'form_receipt', 'statement_descriptor', 'plans'],
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Gateway ativado com sucesso',
    schema: {
      example: {
        id: 456,
        gateway: {
          id: 6,
          name: 'CELCOIN',
        },
        status: 'PENDING',
        active: true,
        created_at: '2026-02-01T12:00:00.000Z',
        updated_at: '2026-02-01T12:00:00.000Z',
      },
    },
  })
  async activateGateway(
    @Param('id') id: string,
    @Body() gatewayData: any,
  ) {
    this.logger.debug(`🔌 Ativando gateway para estabelecimento ${id}...`);
    return this.paytimeService.activateGateway(parseInt(id, 10), gatewayData);
  }

  @Get('establishments/:id/gateways')
  @ApiOperation({
    summary: '📋 Listar gateways do estabelecimento',
    description: 'Lista todos os gateways ativos de um estabelecimento',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do estabelecimento Paytime',
    example: 123,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número da página',
    example: 1,
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Registros por página',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de gateways do estabelecimento',
    schema: {
      example: {
        total: 2,
        page: 1,
        perPage: 20,
        lastPage: 1,
        data: [
          {
            id: 456,
            gateway: {
              id: 6,
              name: 'CELCOIN',
            },
            status: 'APPROVED',
            active: true,
            created_at: '2026-02-01T12:00:00.000Z',
          },
          {
            id: 789,
            gateway: {
              id: 4,
              name: 'PAYTIME',
            },
            status: 'APPROVED',
            active: true,
            created_at: '2026-02-01T12:05:00.000Z',
          },
        ],
      },
    },
  })
  async listEstablishmentGateways(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    this.logger.debug(`📋 Listando gateways do estabelecimento ${id}...`);
    return this.paytimeService.listEstablishmentGateways(
      parseInt(id, 10),
      page || 1,
      perPage || 20,
    );
  }

  @Get('establishments/:id/gateways/:gatewayId')
  @ApiOperation({
    summary: '🔍 Buscar gateway específico do estabelecimento',
    description: 'Retorna detalhes de um gateway ativado, incluindo URL do KYC se for Banking',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do estabelecimento Paytime',
    example: 123,
  })
  @ApiParam({
    name: 'gatewayId',
    description: 'ID da configuração do gateway',
    example: 456,
  })
  @ApiResponse({
    status: 200,
    description: 'Gateway encontrado',
    schema: {
      example: {
        id: 456,
        gateway: {
          id: 6,
          name: 'CELCOIN',
        },
        status: 'PENDING',
        active: true,
        metadata: {
          url_documents_copy: 'https://paytime.com.br/kyc/abc123...',
          email: 'estabelecimento@email.com',
          token: 'abc123...',
        },
        created_at: '2026-02-01T12:00:00.000Z',
        updated_at: '2026-02-01T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Gateway não encontrado',
  })
  async getEstablishmentGateway(
    @Param('id') id: string,
    @Param('gatewayId') gatewayId: string,
  ) {
    this.logger.debug(`🔍 Buscando gateway ${gatewayId} do estabelecimento ${id}...`);
    return this.paytimeService.getEstablishmentGateway(
      parseInt(id, 10),
      parseInt(gatewayId, 10),
    );
  }

  @Post('transactions/pix')
  @ApiOperation({
    summary: '💰 Criar transação PIX',
    description: 'Processa um pagamento via PIX e retorna QR Code',
  })
  @ApiHeader({
    name: 'establishment_id',
    description: 'ID do estabelecimento Paytime',
    required: true,
    example: '123',
  })
  @ApiBody({
    description: 'Dados para criar transação PIX',
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 10000, description: 'Valor em centavos (R$ 100,00 = 10000)' },
        customer: {
          type: 'object',
          properties: {
            first_name: { type: 'string', example: 'João' },
            last_name: { type: 'string', example: 'Silva' },
            document: { type: 'string', example: '12345678901' },
            email: { type: 'string', example: 'cliente@email.com' },
          },
          required: ['first_name', 'last_name', 'document', 'email'],
        },
        expires_in: { type: 'number', example: 3600, description: 'Tempo de expiração em segundos' },
      },
      required: ['amount', 'customer', 'expires_in'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Transação PIX criada com sucesso',
    schema: {
      example: {
        id: 'trans_abc123',
        status: 'PENDING',
        amount: 10000,
        pix: {
          qr_code: '00020126...',
          qr_code_url: 'https://...',
          expires_at: '2026-02-01T13:00:00.000Z',
        },
        created_at: '2026-02-01T12:00:00.000Z',
      },
    },
  })
  async createPixTransaction(
    @Headers('establishment_id') establishmentId: string,
    @Body() pixData: any,
  ) {
    if (!establishmentId) {
      throw new BadRequestException('establishment_id header é obrigatório');
    }
    this.logger.debug(`💳 Criando transação PIX para estabelecimento ${establishmentId}...`);
    return this.paytimeService.createPixTransaction(parseInt(establishmentId, 10), pixData);
  }

  @Post('transactions/card')
  @ApiOperation({
    summary: '💳 Criar transação com Cartão',
    description: 'Processa um pagamento com cartão de crédito ou débito',
  })
  @ApiHeader({
    name: 'establishment_id',
    description: 'ID do estabelecimento Paytime',
    required: true,
    example: '123',
  })
  @ApiBody({
    description: 'Dados para criar transação com cartão',
    schema: {
      type: 'object',
      properties: {
        payment_type: { type: 'string', enum: ['CREDIT', 'DEBIT'], example: 'CREDIT' },
        amount: { type: 'number', example: 39001, description: 'Valor em centavos' },
        installments: { type: 'number', example: 3, description: 'Número de parcelas (1-12)' },
        interest: { type: 'string', enum: ['ESTABLISHMENT', 'CUSTOMER'], example: 'ESTABLISHMENT' },
        customer: {
          type: 'object',
          properties: {
            first_name: { type: 'string', example: 'João' },
            last_name: { type: 'string', example: 'Silva' },
            document: { type: 'string', example: '12345678901' },
            email: { type: 'string', example: 'cliente@email.com' },
            phone: { type: 'string', example: '27999999999' },
          },
        },
        card: {
          type: 'object',
          properties: {
            number: { type: 'string', example: '5200000000001096' },
            holder_name: { type: 'string', example: 'JOAO DA SILVA' },
            expiration_month: { type: 'string', example: '12' },
            expiration_year: { type: 'string', example: '2028' },
            cvv: { type: 'string', example: '123' },
          },
        },
        billing_address: {
          type: 'object',
          properties: {
            street: { type: 'string', example: 'Rua Teste' },
            number: { type: 'string', example: '123' },
            neighborhood: { type: 'string', example: 'Centro' },
            city: { type: 'string', example: 'Vitória' },
            state: { type: 'string', example: 'ES' },
            zip_code: { type: 'string', example: '29090390' },
          },
        },
      },
      required: ['payment_type', 'amount', 'installments', 'customer', 'card', 'billing_address'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Transação com cartão criada',
    schema: {
      example: {
        id: 'trans_def456',
        status: 'PAID',
        amount: 39001,
        installments: 3,
        card: {
          brand: 'MASTERCARD',
          last4_digits: '1096',
        },
        created_at: '2026-02-01T12:00:00.000Z',
      },
    },
  })
  async createCardTransaction(
    @Headers('establishment_id') establishmentId: string,
    @Body() cardData: any,
  ) {
    if (!establishmentId) {
      throw new BadRequestException('establishment_id header é obrigatório');
    }
    this.logger.debug(`💳 Criando transação com cartão para estabelecimento ${establishmentId}...`);
    return this.paytimeService.createCardTransaction(parseInt(establishmentId, 10), cardData);
  }

  @Post('transactions/billet')
  @ApiOperation({
    summary: '📄 Criar boleto',
    description: 'Gera um boleto bancário para pagamento',
  })
  @ApiHeader({
    name: 'establishment_id',
    description: 'ID do estabelecimento Paytime',
    required: true,
    example: '123',
  })
  @ApiBody({
    description: 'Dados para gerar boleto',
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', example: 50000, description: 'Valor em centavos' },
        customer: {
          type: 'object',
          properties: {
            first_name: { type: 'string', example: 'João' },
            last_name: { type: 'string', example: 'Silva' },
            document: { type: 'string', example: '12345678901' },
            email: { type: 'string', example: 'cliente@email.com' },
          },
        },
        due_date: { type: 'string', example: '2026-02-15', description: 'Data de vencimento (YYYY-MM-DD)' },
      },
      required: ['amount', 'customer', 'due_date'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Boleto gerado com sucesso',
  })
  async createBilletTransaction(
    @Headers('establishment_id') establishmentId: string,
    @Body() billetData: any,
  ) {
    if (!establishmentId) {
      throw new BadRequestException('establishment_id header é obrigatório');
    }
    this.logger.debug(`📄 Criando boleto para estabelecimento ${establishmentId}...`);
    return this.paytimeService.createBilletTransaction(parseInt(establishmentId, 10), billetData);
  }

  @Get('transactions')
  @ApiOperation({
    summary: '📋 Listar transações',
    description: 'Lista todas as transações de um estabelecimento',
  })
  @ApiHeader({
    name: 'establishment_id',
    description: 'ID do estabelecimento Paytime',
    required: true,
    example: '123',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número da página',
    example: 1,
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Registros por página',
    example: 20,
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'Filtros (JSON): status, payment_type, etc',
    example: '{"status":"PAID"}',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por ID, cliente, etc',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de transações',
  })
  async listTransactions(
    @Headers('establishment_id') establishmentId: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('filters') filters?: string,
    @Query('search') search?: string,
  ) {
    if (!establishmentId) {
      throw new BadRequestException('establishment_id header é obrigatório');
    }

    let parsedFilters;
    try {
      parsedFilters = filters ? JSON.parse(filters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear filtros:', error);
      parsedFilters = undefined;
    }

    this.logger.debug(`📋 [CONTROLLER] Listando transações do estabelecimento ${establishmentId}...`);
    this.logger.debug(`📋 [CONTROLLER] Parâmetros: page=${page || 1}, perPage=${perPage || 20}, filters=${filters || 'nenhum'}`);
    
    const result = await this.paytimeService.listTransactions(
      parseInt(establishmentId, 10),
      page || 1,
      perPage || 20,
      parsedFilters,
      search,
    );
    
    this.logger.debug(`✅ [CONTROLLER] Retornando ${result.data?.length || 0} transações para o frontend`);
    return result;
  }

  @Get('transactions/:id')
  @ApiOperation({
    summary: '🔍 Buscar transação por ID',
    description: 'Retorna detalhes de uma transação específica',
  })
  @ApiHeader({
    name: 'establishment_id',
    description: 'ID do estabelecimento Paytime',
    required: true,
    example: '123',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da transação',
    example: 'trans_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Transação encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Transação não encontrada',
  })
  async getTransaction(
    @Headers('establishment_id') establishmentId: string,
    @Param('id') id: string,
  ) {
    if (!establishmentId) {
      throw new BadRequestException('establishment_id header é obrigatório');
    }
    this.logger.debug(`🔍 Buscando transação ${id} do estabelecimento ${establishmentId}...`);
    return this.paytimeService.getTransaction(parseInt(establishmentId, 10), id);
  }

  @Get('unidades/:unidadeId/plans')
  @ApiOperation({
    summary: '📋 Buscar planos comerciais Paytime da unidade',
    description: 'Retorna os planos comerciais Paytime selecionados para a unidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Planos retornados com sucesso',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 93 },
          active: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Plano E-commerce' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Unidade não encontrada',
  })
  @ApiParam({
    name: 'unidadeId',
    description: 'ID da unidade',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getUnidadePlans(@Param('unidadeId') unidadeId: string) {
    this.logger.debug(`📋 Buscando planos Paytime da unidade ${unidadeId}...`);
    return this.paytimeService.getUnidadePaytimePlans(unidadeId);
  }

  @Put('unidades/:unidadeId/plans')
  @ApiOperation({
    summary: '💾 Atualizar planos comerciais Paytime da unidade',
    description: 'Atualiza os planos comerciais Paytime selecionados para a unidade',
  })
  @ApiResponse({
    status: 200,
    description: 'Planos atualizados com sucesso',
  })
  @ApiResponse({
    status: 400,
    description: 'Unidade não possui estabelecimento Paytime configurado',
  })
  @ApiResponse({
    status: 404,
    description: 'Unidade não encontrada',
  })
  @ApiParam({
    name: 'unidadeId',
    description: 'ID da unidade',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Array de planos comerciais Paytime',
    schema: {
      type: 'object',
      properties: {
        plans: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 93 },
              active: { type: 'boolean', example: true },
              name: { type: 'string', example: 'Plano E-commerce' },
            },
          },
        },
      },
      required: ['plans'],
    },
  })
  async updateUnidadePlans(
    @Param('unidadeId') unidadeId: string,
    @Body('plans') plans: Array<{id: number; active: boolean; name: string}>,
  ) {
    this.logger.debug(`💾 Atualizando planos Paytime da unidade ${unidadeId}...`);
    await this.paytimeService.updateUnidadePaytimePlans(unidadeId, plans);
    return { message: 'Planos atualizados com sucesso', plans };
  }

  @Get('banking/balance')
  @ApiOperation({
    summary: '💰 Consultar saldo bancário',
    description: 'Consulta o saldo bancário de um estabelecimento Paytime',
  })
  @ApiQuery({
    name: 'establishment_id',
    required: true,
    description: 'ID do estabelecimento',
    example: 123,
  })
  @ApiResponse({
    status: 200,
    description: 'Saldo consultado com sucesso',
  })
  async getBankingBalance(@Query('establishment_id') establishmentId: number) {
    return this.paytimeService.getBankingBalance(establishmentId);
  }

  @Get('banking/extract')
  @ApiOperation({
    summary: '📋 Consultar extrato bancário',
    description: 'Consulta o extrato bancário de um estabelecimento Paytime',
  })
  @ApiQuery({
    name: 'establishment_id',
    required: true,
    description: 'ID do estabelecimento',
    example: 123,
  })
  @ApiQuery({
    name: 'start_date',
    required: true,
    description: 'Data de início (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'end_date',
    required: true,
    description: 'Data de fim (YYYY-MM-DD)',
    example: '2026-01-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Extrato consultado com sucesso',
  })
  async getBankingExtract(
    @Query('establishment_id') establishmentId: number,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.paytimeService.getBankingExtract(
      establishmentId,
      startDate,
      endDate,
    );
  }

  @Get('liquidations')
  @ApiOperation({
    summary: 'Listar liquidações completas',
    description: 'Retorna listagem completa de liquidações do Marketplace com valores, participantes, pagamentos, planos e histórico',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'JSON com filtros aplicáveis',
    example: '{"status":"PAID"}',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Texto de busca',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Registros por página (máximo 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página atual',
    example: 1,
  })
  @ApiQuery({
    name: 'sorters',
    required: false,
    description: 'JSON com lista de ordenadores',
    example: '[{"column":"created_at","direction":"DESC"}]',
  })
  @ApiResponse({
    status: 200,
    description: 'Liquidações listadas com sucesso',
  })
  async listLiquidations(
    @Query('filters') filters?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('sorters') sorters?: string,
  ) {
    this.logger.debug('Listando liquidações Paytime...');
    
    let parsedFilters;
    let parsedSorters;

    try {
      parsedFilters = filters ? JSON.parse(filters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear filtros:', error);
      parsedFilters = undefined;
    }

    try {
      parsedSorters = sorters ? JSON.parse(sorters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear sorters:', error);
      parsedSorters = undefined;
    }

    const result = await this.paytimeService.listLiquidations(
      parsedFilters,
      search,
      page,
      perPage,
      parsedSorters,
    );

    return result;
  }

  @Get('liquidations/extract')
  @ApiOperation({
    summary: 'Listar liquidações sumarizadas',
    description: 'Retorna listagem resumida de liquidações para relatórios de repasse, conferências financeiras e conciliação bancária',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'JSON com filtros aplicáveis',
    example: '{"status":"CREATED"}',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Texto de busca',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Registros por página (máximo 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página atual',
    example: 1,
  })
  @ApiQuery({
    name: 'sorters',
    required: false,
    description: 'JSON com lista de ordenadores',
    example: '[{"column":"liquidation","direction":"DESC"}]',
  })
  @ApiResponse({
    status: 200,
    description: 'Liquidações sumarizadas listadas com sucesso',
  })
  async listLiquidationsExtract(
    @Query('filters') filters?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @Query('sorters') sorters?: string,
  ) {
    this.logger.debug('Listando extrato de liquidações Paytime...');
    
    let parsedFilters;
    let parsedSorters;

    try {
      parsedFilters = filters ? JSON.parse(filters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear filtros:', error);
      parsedFilters = undefined;
    }

    try {
      parsedSorters = sorters ? JSON.parse(sorters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear sorters:', error);
      parsedSorters = undefined;
    }

    const result = await this.paytimeService.listLiquidationsExtract(
      parsedFilters,
      search,
      page,
      perPage,
      parsedSorters,
    );

    return result;
  }

  @Get('representatives')
  @ApiOperation({
    summary: '👥 Listar representantes comerciais',
    description: 'Lista representantes cadastrados no Marketplace Paytime com suas regiões e royalties',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de representantes retornada com sucesso',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'Filtros em JSON. Ex: {"active":true}',
    example: '{"active":true}',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Busca textual em first_name, last_name, document',
    example: 'Tech',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    description: 'Registros por página (máximo 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número da página',
    example: 1,
  })
  @ApiQuery({
    name: 'sorters',
    required: false,
    description: 'Ordenação em JSON. Ex: [{"column":"created_at","direction":"DESC"}]',
    example: '[{"column":"created_at","direction":"DESC"}]',
  })
  async listRepresentatives(
    @Query('filters') filters?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('sorters') sorters?: string,
  ) {
    this.logger.debug('Listando representantes comerciais Paytime...');
    
    let parsedFilters;
    let parsedSorters;

    try {
      parsedFilters = filters ? JSON.parse(filters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear filtros:', error);
      parsedFilters = undefined;
    }

    try {
      parsedSorters = sorters ? JSON.parse(sorters) : undefined;
    } catch (error) {
      this.logger.warn('Erro ao parsear sorters:', error);
      parsedSorters = undefined;
    }

    // Converter page e perPage para números
    const pageNumber = page ? parseInt(page, 10) : undefined;
    const perPageNumber = perPage ? parseInt(perPage, 10) : undefined;

    const result = await this.paytimeService.listRepresentatives(
      parsedFilters,
      search,
      pageNumber,
      perPageNumber,
      parsedSorters,
    );

    return result;
  }

  @Get('representatives/:id')
  @ApiOperation({
    summary: '🔍 Exibir detalhes do representante',
    description: 'Retorna informações detalhadas de um representante específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do representante',
  })
  @ApiResponse({
    status: 401,
    description: 'Token inválido ou expirado',
  })
  @ApiResponse({
    status: 404,
    description: 'Representante não encontrado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do representante',
    example: '60030',
  })
  async getRepresentativeById(@Param('id') id: string) {
    this.logger.debug(`Buscando representante ID: ${id}...`);
    return this.paytimeService.getRepresentativeById(parseInt(id));
  }

  // ==================== ENDPOINTS DE ANTIFRAUDE ====================

  @Get('antifraud/idpay/sdk-config')
  @ApiOperation({
    summary: '🔐 Obter configuração SDK IDPAY',
    description: 'Retorna configuração necessária para carregar SDK IDPAY (Unico) no frontend',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração SDK retornada com sucesso',
  })
  async getIdpaySdkConfig() {
    this.logger.debug('Obtendo SDK config IDPAY...');
    return this.paytimeService.getIdpaySdkConfig();
  }

  @Post('antifraud/idpay/:id/authenticate')
  @ApiOperation({
    summary: '🔐 Autenticar transação com IDPAY',
    description: 'Envia dados de autenticação biométrica IDPAY para validação da transação',
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticação processada com sucesso',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da transação Paytime',
    example: '123456',
  })
  @ApiBody({
    description: 'Dados de autenticação IDPAY',
    schema: {
      type: 'object',
      properties: {
        encrypted: { type: 'string', description: 'Dados criptografados do SDK' },
        jwt: { type: 'string', description: 'JWT retornado pelo SDK (opcional)' },
        uniqueness_id: { type: 'string', description: 'ID único da captura' },
      },
      required: ['encrypted', 'uniqueness_id'],
    },
  })
  async authenticateIdpay(
    @Param('id') id: string,
    @Body() authData: {
      id: string;
      concluded: boolean;
      capture_concluded: boolean;
    },
  ) {
    this.logger.debug(`Autenticando IDPAY para transação ${id}...`);
    return this.paytimeService.authenticateIdpay(id, authData);
  }

  @Get('antifraud/threeds/sdk-config')
  @ApiOperation({
    summary: '🔐 Obter configuração SDK 3DS',
    description: 'Retorna configuração necessária para carregar SDK 3DS (PagBank) no frontend',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração SDK retornada com sucesso',
  })
  async getThreeDsSdkConfig() {
    this.logger.debug('Obtendo SDK config 3DS...');
    return this.paytimeService.getThreeDsSdkConfig();
  }

  @Get('antifraud/threeds/test-cards')
  @ApiOperation({
    summary: '🔐 Obter cartões de teste 3DS',
    description: 'Retorna lista de cartões de teste para validação 3DS em homologação',
  })
  @ApiResponse({
    status: 200,
    description: 'Cartões de teste retornados com sucesso',
  })
  async getThreeDsTestCards() {
    this.logger.debug('Obtendo cartões teste 3DS...');
    return this.paytimeService.getThreeDsTestCards();
  }

  @Post('antifraud/threeds/:id/authenticate')
  @ApiOperation({
    summary: '🔐 Autenticar transação com 3DS',
    description: 'Envia token de autenticação 3DS para validação da transação',
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticação processada com sucesso',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da transação Paytime',
    example: '123456',
  })
  @ApiBody({
    description: 'Dados de autenticação 3DS',
    schema: {
      type: 'object',
      properties: {
        authentication_token: { type: 'string', description: 'Token retornado pelo SDK 3DS' },
        redirect_url: { type: 'string', description: 'URL de redirecionamento (opcional)' },
      },
      required: ['authentication_token'],
    },
  })
  async authenticateThreeDs(
    @Param('id') id: string,
    @Body() authData: {
      authentication_token: string;
      redirect_url?: string;
    },
  ) {
    this.logger.debug(`Autenticando 3DS para transação ${id}...`);
    return this.paytimeService.authenticateThreeDs(id, authData);
  }

  @Post('antifraud/session')
  @ApiOperation({
    summary: '🔐 Gerar Session ID ClearSale',
    description: 'Gera Session ID único para rastreamento ClearSale',
  })
  @ApiResponse({
    status: 200,
    description: 'Session ID gerado com sucesso',
  })
  @ApiBody({
    description: 'Dados para geração de Session ID',
    schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'ID do usuário' },
        ip_address: { type: 'string', description: 'IP do usuário (opcional)' },
        user_agent: { type: 'string', description: 'User Agent do navegador (opcional)' },
      },
      required: ['user_id'],
    },
  })
  async generateSessionId(
    @Body() sessionData: {
      user_id: string;
      ip_address?: string;
      user_agent?: string;
    },
  ) {
    this.logger.debug('Gerando Session ID ClearSale...');
    return this.paytimeService.generateSessionId(sessionData);
  }

  @Get('antifraud/script-config')
  @ApiOperation({
    summary: '🔐 Obter configuração ClearSale',
    description: 'Retorna configuração do script ClearSale para carregar no frontend',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração retornada com sucesso',
  })
  async getClearSaleScriptConfig() {
    this.logger.debug('Obtendo config ClearSale...');
    return this.paytimeService.getClearSaleScriptConfig();
  }

  @Get('establishments/:establishmentId/splits')
  @ApiOperation({
    summary: '💰 Listar regras de split',
    description: 'Lista todas as regras de split pré-configuradas do estabelecimento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de splits retornada com sucesso',
  })
  @ApiParam({
    name: 'establishmentId',
    description: 'ID do estabelecimento no Paytime',
    example: 156655,
  })
  async listSplits(@Param('establishmentId') establishmentId: string) {
    this.logger.debug(`Listando splits do estabelecimento ${establishmentId}...`);
    return this.paytimeService.listSplitPre(Number(establishmentId));
  }

  @Get('establishments/:establishmentId/splits/:splitId')
  @ApiOperation({
    summary: '💰 Buscar split',
    description: 'Retorna detalhes de uma regra de split específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Split encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Split não encontrado',
  })
  @ApiParam({
    name: 'establishmentId',
    description: 'ID do estabelecimento no Paytime',
    example: 156655,
  })
  @ApiParam({
    name: 'splitId',
    description: 'ID do split',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getSplit(
    @Param('establishmentId') establishmentId: string,
    @Param('splitId') splitId: string,
  ) {
    this.logger.debug(`Buscando split ${splitId}...`);
    return this.paytimeService.getSplitPre(splitId);
  }

  @Post('establishments/:establishmentId/splits')
  @ApiOperation({
    summary: '💰 Criar regra de split',
    description: 'Cria uma nova regra de split pré-configurada',
  })
  @ApiResponse({
    status: 201,
    description: 'Split criado com sucesso',
  })
  @ApiParam({
    name: 'establishmentId',
    description: 'ID do estabelecimento no Paytime',
    example: 156655,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome da regra de split', example: 'Comissão Instrutor' },
        description: { type: 'string', description: 'Descrição da regra', example: 'Split automático para instrutores' },
        percentage: { type: 'number', description: 'Percentual do split (0-100)', example: 10 },
        establishments: {
          type: 'array',
          description: 'Estabelecimentos participantes',
          items: {
            type: 'object',
            properties: {
              establishment_id: { type: 'number', description: 'ID do estabelecimento', example: 156656 },
              percentage: { type: 'number', description: 'Percentual (0-100)', example: 10 },
            },
          },
        },
      },
      required: ['name', 'establishments'],
    },
  })
  async createSplit(
    @Param('establishmentId') establishmentId: string,
    @Body() data: any,
  ) {
    this.logger.debug(`Criando split para estabelecimento ${establishmentId}...`);
    return this.paytimeService.createSplitPre(Number(establishmentId), data);
  }

  @Put('establishments/:establishmentId/splits/:splitId')
  @ApiOperation({
    summary: '💰 Atualizar regra de split',
    description: 'Atualiza uma regra de split existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Split atualizado com sucesso',
  })
  @ApiParam({
    name: 'establishmentId',
    description: 'ID do estabelecimento no Paytime',
    example: 156655,
  })
  @ApiParam({
    name: 'splitId',
    description: 'ID do split',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome da regra de split' },
        description: { type: 'string', description: 'Descrição da regra' },
        percentage: { type: 'number', description: 'Percentual do split (0-100)' },
        establishments: {
          type: 'array',
          description: 'Estabelecimentos participantes',
          items: {
            type: 'object',
            properties: {
              establishment_id: { type: 'number', description: 'ID do estabelecimento' },
              percentage: { type: 'number', description: 'Percentual (0-100)' },
            },
          },
        },
      },
    },
  })
  async updateSplit(
    @Param('establishmentId') establishmentId: string,
    @Param('splitId') splitId: string,
    @Body() data: any,
  ) {
    this.logger.debug(`Atualizando split ${splitId}...`);
    return this.paytimeService.updateSplitPre(splitId, data);
  }

  @Post('establishments/:establishmentId/splits/:splitId/delete')
  @ApiOperation({
    summary: '💰 Deletar regra de split',
    description: 'Remove uma regra de split pré-configurada',
  })
  @ApiResponse({
    status: 200,
    description: 'Split deletado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Split não encontrado',
  })
  @ApiParam({
    name: 'establishmentId',
    description: 'ID do estabelecimento no Paytime',
    example: 156655,
  })
  @ApiParam({
    name: 'splitId',
    description: 'ID do split',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async deleteSplit(
    @Param('establishmentId') establishmentId: string,
    @Param('splitId') splitId: string,
  ) {
    this.logger.debug(`Deletando split ${splitId}...`);
    return this.paytimeService.deleteSplitPre(splitId);
  }
}

