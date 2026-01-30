import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaytimeService } from './paytime.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Paytime')
@Controller('paytime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaytimeController {
  private readonly logger = new Logger(PaytimeController.name);

  constructor(private readonly paytimeService: PaytimeService) {}

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
}