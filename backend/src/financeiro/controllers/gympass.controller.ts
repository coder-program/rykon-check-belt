import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  GympassService,
  GympassRegistroDto,
  GympassStatusWebhook,
  ConfigConvenio,
} from '../services/gympass.service';

@Controller('convenios')
export class GympassController {
  constructor(private readonly gympassService: GympassService) {}

  // ========== 1. REGISTRO DE USUÁRIO (Gympass chama quando usuário ativa) ==========
  
  /**
   * API de Registro de Usuários - Gympass/Wellhub Partner API
   * 
   * Endpoint chamado PELA Gympass para registrar/ativar usuário
   * 
   * IMPORTANTE:
   * - Tempo de resposta NÃO DEVE exceder 2 segundos
   * - Retorna redirect_link para o usuário completar cadastro
   * - Se usuário já existe, retorna link de login
   * 
   * URL para Gympass: https://api.rykon.com.br/convenios/gympass/register/:unidadeId
   * 
   * Headers esperados:
   * - Content-Type: application/json
   * - Authorization: Bearer <access_token> (se configurado)
   * 
   * Body (da documentação oficial):
   * {
   *   "gympass_user_id": "gpw-29caecdf-2d5e-40b8-82b4-d0a044fa4679",
   *   "email": "user@example.com",        // Opcional (não recomendado - PII)
   *   "first_name": "John",               // Opcional (não recomendado - PII)
   *   "last_name": "Doe",                 // Opcional (não recomendado - PII)
   *   "origin": "ios",                    // Opcional: web|android|ios
   *   "user_status": "1",                 // Opcional: 1=básico, 2=premium
   *   "country_code": "br"                // Opcional: código do país
   * }
   * 
   * Response:
   * {
   *   "redirect_link": "https://app.rykon.com.br/cadastro/gympass?..."
   * }
   */
  @Post('gympass/register/:unidadeId')
  async registrarUsuarioGympass(
    @Param('unidadeId') unidadeId: string,
    @Body() dados: GympassRegistroDto,
  ) {
    return this.gympassService.registrarUsuarioGympass(dados, unidadeId);
  }

  @Post('totalpass/register/:unidadeId')
  async registrarUsuarioTotalpass(
    @Param('unidadeId') unidadeId: string,
    @Body() dados: GympassRegistroDto,
  ) {
    // Totalpass usa mesmo formato
    return this.gympassService.registrarUsuarioTotalpass(dados, unidadeId);
  }

  // ========== 2. WEBHOOK DE STATUS (Gympass notifica mudança de status) ==========
  
  /**
   * API de Status do Usuário - Gympass/Wellhub Partner API
   * 
   * Endpoint chamado PELA Gympass quando usuário cancela/pausa/reativa
   * 
   * URL para Gympass: https://api.rykon.com.br/convenios/gympass/status
   * 
   * Body (da documentação oficial):
   * {
   *   "gympass_user_id": "gpw-29caecdf-2d5e-40b8-82b4-d0a044fa4679",
   *   "status": "canceled",  // active | canceled | paused | downgraded
   *   "timestamp": "2026-01-27T10:00:00Z"
   * }
   */
  @Post('gympass/status')
  async receberMudancaStatusGympass(@Body() dados: GympassStatusWebhook) {
    return this.gympassService.processarMudancaStatus(dados);
  }

  @Post('totalpass/status')
  async receberMudancaStatusTotalpass(@Body() dados: GympassStatusWebhook) {
    return this.gympassService.processarMudancaStatus(dados);
  }

  // ========== 3. ENVIAR EVENTOS MANUALMENTE (para testes) ==========
  
  /**
   * Envia evento de check-in manualmente para Gympass
   * Normalmente chamado automaticamente pelo sistema de presença
   */
  @Post('gympass/enviar-evento')
  @UseGuards(JwtAuthGuard)
  async enviarEvento(@Query('presencaId') presencaId: string) {
    return this.gympassService.enviarEventoCheckIn(presencaId);
  }

  // ========== 4. ESTATÍSTICAS ==========

  @Get('estatisticas')
  @UseGuards(JwtAuthGuard)
  async estatisticas(
    @Query('unidadeId') unidadeId: string,
    @Query('mes') mes?: string,
  ) {
    return this.gympassService.estatisticas(unidadeId, mes);
  }

  @Get('verificar-integracao')
  @UseGuards(JwtAuthGuard)
  async verificarIntegracao(@Query('unidadeId') unidadeId: string) {
    return this.gympassService.verificarIntegracao(unidadeId);
  }

  // ========== 6. LISTAGEM DE ALUNOS ==========

  @Get('alunos')
  @UseGuards(JwtAuthGuard)
  async listarAlunosConvenio(
    @Query('unidadeId') unidadeId: string,
    @Query('convenio') convenio: 'GYMPASS' | 'TOTALPASS',
  ) {
    return this.gympassService.listarAlunosConvenio(unidadeId, convenio);
  }
}
