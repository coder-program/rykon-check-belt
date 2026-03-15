import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Request,
  Logger,
  Inject,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RelatoriosService } from '../services/relatorios.service';
import { NotificacoesService } from '../services/notificacoes.service';

@Controller('relatorios-financeiros')
@UseGuards(JwtAuthGuard)
export class RelatoriosController {
  private readonly logger = new Logger(RelatoriosController.name);

  constructor(
    private readonly relatoriosService: RelatoriosService,
    private readonly notificacoesService: NotificacoesService,
    @Inject(DataSource) private dataSource: DataSource,
  ) {}

  private async getUnidadeIdFromUser(user: any): Promise<string | null> {
    if (!user) return null;
    if (user.unidade_id) return user.unidade_id;

    const perfis =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) || [];

    if (perfis.includes('GERENTE_UNIDADE')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) return result[0].unidade_id;
    }

    if (perfis.includes('RECEPCIONISTA')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM recepcionista_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      if (result && result.length > 0) return result[0].unidade_id;
    }

    return null;
  }

  /**
   * Busca relatório completo de faturas
   */
  @Get()
  async getRelatorio(
    @Query('unidade_id') unidadeId?: string,
    @Query('mes') mes?: string,
    @Query('ano') ano?: string,
    @Request() req?: any,
  ) {
    this.logger.log(`📊 [GET] /relatorios-financeiros`);

    const user = req?.user;
    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    // Aplicar filtro de unidade baseado no usuário
    let finalUnidadeId = unidadeId;
    if (!finalUnidadeId && userUnidadeId) {
      finalUnidadeId = userUnidadeId;
    }

    // Verificar se franqueado
    const isFranqueado =
      user?.tipo_usuario === 'FRANQUEADO' ||
      user?.perfis?.some(
        (p: any) =>
          (typeof p === 'string' ? p : p.nome)?.toUpperCase() === 'FRANQUEADO',
      );

    let franqueadoId: string | null = null;
    if (isFranqueado && user?.id) {
      const franqueadoResult = await this.dataSource.query(
        `SELECT id FROM franqueados WHERE usuario_id = $1 LIMIT 1`,
        [user.id],
      );
      franqueadoId = franqueadoResult[0]?.id || null;
    }

    return this.relatoriosService.getRelatorioCompleto(
      finalUnidadeId,
      mes,
      ano,
      franqueadoId || undefined,
    );
  }

  /**
   * Envia cobrança via WhatsApp para múltiplas faturas
   */
  @Post('enviar-cobrancas-whatsapp')
  async enviarCobrancasWhatsApp(
    @Body('faturas_ids') faturasIds: string[],
    @Body('mensagem') mensagem?: string,
  ) {
    this.logger.log(
      `📱 [POST] Enviando ${faturasIds.length} cobranças via WhatsApp`,
    );

    const resultados = await this.relatoriosService.enviarCobrancasEmMassa(
      faturasIds,
      mensagem,
    );

    return {
      total: faturasIds.length,
      enviados: resultados.filter((r) => r.sucesso).length,
      falhas: resultados.filter((r) => !r.sucesso).length,
      detalhes: resultados,
    };
  }

  /**
   * Envia lembrete para faturas próximas do vencimento
   * Se 'dias' não for informado, usa a configuração da unidade
   */
  @Post('enviar-lembretes-vencimento')
  async enviarLembretesVencimento(
    @Query('dias') dias?: number,
    @Query('unidade_id') unidadeId?: string,
    @Request() req?: any,
  ) {
    const diasNum = dias ? Number(dias) : undefined;
    this.logger.log(
      `📅 [POST] Enviando lembretes de vencimento ${diasNum ? `(${diasNum} dias)` : '(configuração da unidade)'}`,
    );

    const user = req?.user;
    const userUnidadeId = await this.getUnidadeIdFromUser(user);

    let finalUnidadeId = unidadeId;
    if (!finalUnidadeId && userUnidadeId) {
      finalUnidadeId = userUnidadeId;
    }

    const resultados = await this.relatoriosService.enviarLembretesVencimento(
      diasNum,
      finalUnidadeId,
    );

    return {
      total: resultados.length,
      enviados: resultados.filter((r) => r.sucesso).length,
      falhas: resultados.filter((r) => !r.sucesso).length,
      detalhes: resultados,
    };
  }
}

