import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatracaService, CatracaCheckInDto, CatracaResponse } from './catraca.service';
import { CatracaConfig } from '../people/entities/unidade.entity';

@ApiTags('🚪 Catraca Biométrica')
@Controller('catraca')
export class CatracaController {
  private readonly logger = new Logger(CatracaController.name);

  constructor(private readonly catracaService: CatracaService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '🔔 Webhook - Recebe check-in da catraca',
    description: 'Endpoint chamado pela catraca Henry8X quando reconhece um aluno. Valida e registra a presença.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        matricula: { type: 'string', example: '123456', description: 'Matrícula do aluno (6 dígitos)' },
        cpf: { type: 'string', example: '12345678900', description: 'CPF do aluno (alternativo)' },
        foto: { type: 'string', description: 'Base64 da foto capturada pela catraca' },
        unidade_id: { type: 'string', example: '8863d9de-b350-4c8f-a930-726b1df3261f', description: 'ID da unidade' },
        dispositivo_id: { type: 'string', example: 'HENRY8X_001', description: 'ID do dispositivo' },
        timestamp: { type: 'string', example: '2026-02-09T10:30:00Z' },
        api_key: { type: 'string', description: 'Chave de autenticação da catraca' },
      },
      required: ['unidade_id'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resposta para a catraca com instrução de liberar ou não',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        liberar_catraca: { type: 'boolean' },
        nome_aluno: { type: 'string' },
        foto_aluno: { type: 'string' },
        mensagem_display: { type: 'string', example: 'BEM-VINDO ROBSON' },
        tempo_liberacao_segundos: { type: 'number', example: 6 },
      },
    },
  })
  async webhookCheckin(@Body() data: CatracaCheckInDto): Promise<CatracaResponse> {
    this.logger.log(`🚪 Webhook catraca - Unidade: ${data.unidade_id}, Matrícula: ${data.matricula || data.cpf}`);
    return await this.catracaService.webhookCheckin(data);
  }

  @Get('config/:unidade_id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '⚙️ Obter configuração da catraca',
    description: 'Retorna a configuração da catraca biométrica da unidade',
  })
  @ApiParam({
    name: 'unidade_id',
    description: 'ID da unidade',
    example: '8863d9de-b350-4c8f-a930-726b1df3261f',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração da catraca',
  })
  @ApiResponse({
    status: 404,
    description: 'Unidade não encontrada',
  })
  async getConfiguracao(@Param('unidade_id') unidade_id: string) {
    return await this.catracaService.getConfiguracao(unidade_id);
  }

  @Put('config/:unidade_id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '✏️ Atualizar configuração da catraca',
    description: 'Atualiza configuração da catraca biométrica da unidade (apenas admin/franqueado)',
  })
  @ApiParam({
    name: 'unidade_id',
    description: 'ID da unidade',
    example: '8863d9de-b350-4c8f-a930-726b1df3261f',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        habilitada: { type: 'boolean', example: true },
        config: {
          type: 'object',
          properties: {
            tipo: { type: 'string', enum: ['HENRY8X', 'CONTROLID', 'INTELBRAS', 'HIKVISION', 'ZKTECO'], example: 'HENRY8X' },
            ip: { type: 'string', example: '192.168.100.163' },
            porta: { type: 'number', example: 3000 },
            modelo_placa: { type: 'string', example: 'Primme SF A' },
            sentido: { type: 'string', enum: ['ANTI_HORARIO', 'HORARIO'], example: 'ANTI_HORARIO' },
            giro: { type: 'string', enum: ['ENTRADA', 'SAIDA', 'BIDIRECIONAL'], example: 'ENTRADA' },
            qtd_digitos_matricula: { type: 'number', example: 6 },
            tempo_liberacao_segundos: { type: 'number', example: 6 },
            modelo_biometria: { type: 'string', enum: ['PADRAO', 'FACIAL', 'DIGITAL'], example: 'PADRAO' },
            api_key: { type: 'string', description: 'Chave secreta para autenticação' },
            permite_entrada_manual: { type: 'boolean', example: true },
            permite_saida_automatica: { type: 'boolean', example: false },
            horario_funcionamento: {
              type: 'object',
              properties: {
                inicio: { type: 'string', example: '06:00' },
                fim: { type: 'string', example: '22:00' },
              },
            },
          },
          required: ['tipo', 'ip', 'porta'],
        },
      },
      required: ['habilitada', 'config'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada com sucesso',
  })
  async atualizarConfiguracao(
    @Param('unidade_id') unidade_id: string,
    @Body() body: { habilitada: boolean; config: CatracaConfig },
  ) {
    return await this.catracaService.atualizarConfiguracao(
      unidade_id,
      body.habilitada,
      body.config,
    );
  }

  @Post('test/:unidade_id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '🧪 Testar conexão com catraca',
    description: 'Testa a conexão e configuração da catraca',
  })
  @ApiParam({
    name: 'unidade_id',
    description: 'ID da unidade',
    example: '8863d9de-b350-4c8f-a930-726b1df3261f',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado do teste',
  })
  async testarConexao(@Param('unidade_id') unidade_id: string) {
    return await this.catracaService.testarConexao(unidade_id);
  }
}
