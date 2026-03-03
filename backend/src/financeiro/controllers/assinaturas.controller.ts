import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AssinaturasService } from '../services/assinaturas.service';
import {
  CreateAssinaturaDto,
  UpdateAssinaturaDto,
  CancelarAssinaturaDto,
  AlterarPlanoDto,
} from '../dto/assinatura.dto';
import { AtualizarCartaoDto } from '../dto/atualizar-cartao.dto';

@ApiTags('Assinaturas')
@ApiBearerAuth()
@Controller('financeiro/assinaturas')
@UseGuards(JwtAuthGuard)
export class AssinaturasController {
  private readonly logger = new Logger(AssinaturasController.name);

  constructor(private readonly assinaturasService: AssinaturasService) {}

  @Post()
  async create(@Body() createAssinaturaDto: CreateAssinaturaDto, @Request() req) {
    this.logger.log(`📥 [POST] /financeiro/assinaturas`);
    this.logger.log(`   - Aluno ID: ${createAssinaturaDto.aluno_id}`);
    this.logger.log(`   - Plano ID: ${createAssinaturaDto.plano_id}`);
    this.logger.log(`   - Método: ${createAssinaturaDto.metodo_pagamento}`);
    
    const assinatura = await this.assinaturasService.create(createAssinaturaDto, req.user);
    
    this.logger.log(`✅ Assinatura criada: ${assinatura.id}`);
    return assinatura;
  }

  @Get()
  async findAll(
    @Query('unidade_id') unidade_id?: string,
    @Query('status') status?: any,
    @Request() req?,
  ) {
    const user = req?.user;

    // Verificar se é franqueado
    const isFranqueado =
      user?.tipo_usuario === 'FRANQUEADO' ||
      user?.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );

    const assinaturas = await this.assinaturasService.findAll(
      unidade_id,
      status,
      req.user,
    );

    // Mapear para incluir campos derivados
    return assinaturas.map((assinatura) => ({
      ...assinatura,
      aluno_nome: assinatura.aluno?.nome_completo,
      plano_nome: assinatura.plano?.nome,
      valor_mensal: assinatura.valor,
    }));
  }

  @Get('aluno/:aluno_id')
  findByAluno(@Param('aluno_id') aluno_id: string) {
    return this.assinaturasService.findByAluno(aluno_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assinaturasService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssinaturaDto: UpdateAssinaturaDto,
  ) {
    return this.assinaturasService.update(id, updateAssinaturaDto);
  }

  @Patch(':id/cancelar')
  cancelar(
    @Param('id') id: string,
    @Body() cancelarDto: CancelarAssinaturaDto,
    @Request() req,
  ) {
    return this.assinaturasService.cancelar(id, cancelarDto, req.user);
  }

  @Patch(':id/pausar')
  pausar(@Param('id') id: string) {
    return this.assinaturasService.pausar(id);
  }

  @Patch(':id/reativar')
  reativar(@Param('id') id: string) {
    return this.assinaturasService.reativar(id);
  }

  @Patch(':id/alterar-plano')
  alterarPlano(
    @Param('id') id: string,
    @Body() alterarPlanoDto: AlterarPlanoDto,
  ) {
    return this.assinaturasService.alterarPlano(id, alterarPlanoDto);
  }

  @Post('renovar/:id')
  renovar(@Param('id') id: string, @Request() req) {
    return this.assinaturasService.renovar(id);
  }

  @Put(':id/atualizar-cartao')
  @ApiOperation({ 
    summary: 'Atualizar cartão da assinatura',
    description: 'Atualiza o cartão de crédito salvo na assinatura. Realiza cobrança teste de R$ 1,00 para validar o cartão. Se a assinatura estava inadimplente, reativa automaticamente e cobra faturas pendentes.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cartão atualizado com sucesso',
    schema: {
      example: {
        success: true,
        message: 'Cartão atualizado com sucesso!',
        token_salvo: true,
        dados_cartao: {
          last4: '1005',
          brand: 'MASTERCARD',
          exp_month: '12',
          exp_year: '2026'
        },
        status: 'ATIVA',
        reativada: false
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dados inválidos ou cartão recusado' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Sem permissão para atualizar este cartão' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assinatura não encontrada' 
  })
  async atualizarCartao(
    @Param('id') id: string,
    @Body() dto: AtualizarCartaoDto,
    @Request() req: any,
  ): Promise<any> {
    return await this.assinaturasService.atualizarCartao(id, dto, req.user);
  }

  @Get('pendentes-cobranca')
  @ApiOperation({ 
    summary: '[SCHEDULER] Lista assinaturas que devem ser cobradas',
    description: 'Endpoint usado pelo scheduler para identificar assinaturas com cobrança recorrente pendente. Filtra por: status ATIVA, método CARTAO, possui token, proxima_cobranca <= data informada (ou hoje).'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de assinaturas pendentes de cobrança',
    schema: {
      example: [{
        id: 123,
        aluno_id: 456,
        plano_id: 789,
        status: 'ATIVA',
        metodo_pagamento: 'CARTAO',
        valor: 150.00,
        proxima_cobranca: '2026-03-01',
        retry_count: 0,
        token_cartao: 'tk_abc123...',
        aluno: {
          nome_completo: 'João Silva',
          email: 'joao@email.com'
        },
        plano: {
          nome: 'Plano Mensal'
        }
      }]
    }
  })
  async findPendentesCobranca(
    @Query('data') data?: string,
  ): Promise<any> {
    this.logger.log(`📥 [GET] /financeiro/assinaturas/pendentes-cobranca`);
    this.logger.log(`   - Data: ${data || 'hoje'}`);
    
    const assinaturas = await this.assinaturasService.findPendentesCobranca(data);
    
    this.logger.log(`✅ Encontradas ${assinaturas.length} assinaturas pendentes`);
    return assinaturas;
  }

  @Post(':id/cobrar-recorrencia')
  @ApiOperation({ 
    summary: '[SCHEDULER] Executa cobrança recorrente',
    description: 'Endpoint usado pelo scheduler para executar cobrança usando token salvo. Gera nova fatura e processa pagamento automaticamente. Se aprovado, atualiza proxima_cobranca += 1 mês.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cobrança processada com sucesso',
    schema: {
      example: {
        success: true,
        assinatura_id: 123,
        fatura_id: 456,
        fatura_numero: 'REC-123-20260301120000',
        valor: 150.00,
        status: 'PAID',
        transacao_id: 789,
        paytime_transaction_id: '507f1f77bcf86cd799439011',
        proxima_cobranca: '2026-04-01T00:00:00.000Z'
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Assinatura sem token ou pagamento recusado' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assinatura não encontrada' 
  })
  async cobrarRecorrencia(
    @Param('id') id: string,
  ): Promise<any> {
    this.logger.log(`📥 [POST] /financeiro/assinaturas/${id}/cobrar-recorrencia`);
    
    const resultado = await this.assinaturasService.cobrarRecorrencia(id);
    
    this.logger.log(`✅ Cobrança processada: ${resultado.status}`);
    return resultado;
  }

  @Patch(':id/registrar-falha')
  @ApiOperation({ 
    summary: '[SCHEDULER] Registra falha de cobrança',
    description: 'Endpoint usado pelo scheduler para registrar falha na cobrança recorrente. Incrementa retry_count e agenda nova tentativa (3 dias na 1ª falha, 5 dias na 2ª). Após 3 falhas, marca como INADIMPLENTE.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Falha registrada com sucesso',
    schema: {
      example: {
        assinatura_id: 123,
        retry_count: 2,
        status: 'ATIVA',
        proxima_tentativa: '2026-03-06T00:00:00.000Z',
        inadimplente: false,
        motivo: 'Cartão recusado'
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Assinatura não encontrada' 
  })
  async registrarFalha(
    @Param('id') id: string,
    @Body() body?: { motivo?: string },
  ): Promise<any> {
    this.logger.log(`📥 [PATCH] /financeiro/assinaturas/${id}/registrar-falha`);
    this.logger.log(`   - Motivo: ${body?.motivo || 'Não informado'}`);
    
    const resultado = await this.assinaturasService.registrarFalhaCobranca(id, body?.motivo);
    
    this.logger.log(`✅ Falha registrada: retry ${resultado.retry_count}/3`);
    return resultado;
  }
}
