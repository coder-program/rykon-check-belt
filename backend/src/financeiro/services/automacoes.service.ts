import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, IsNull, Between } from 'typeorm';
import { Fatura, StatusFatura } from '../entities/fatura.entity';
import { Assinatura, StatusAssinatura, MetodoPagamento } from '../entities/assinatura.entity';
import { ConfiguracaoCobranca } from '../entities/configuracao-cobranca.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificacoesService } from './notificacoes.service';
import { PaytimeIntegrationService } from './paytime-integration.service';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class AutomacoesService {
  private readonly logger = new Logger(AutomacoesService.name);

  constructor(
    @InjectRepository(Fatura)
    private faturasRepository: Repository<Fatura>,
    @InjectRepository(Assinatura)
    private assinaturasRepository: Repository<Assinatura>,
    @InjectRepository(ConfiguracaoCobranca)
    private configRepository: Repository<ConfiguracaoCobranca>,
    private notificacoesService: NotificacoesService,
    private paytimeIntegrationService: PaytimeIntegrationService,
  ) {}

  /**
   * Calcula juros e multa para faturas vencidas
   * Executa diariamente às 00:01
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async calcularJurosMulta(): Promise<void> {
    this.logger.log('🔄 Iniciando cálculo de juros e multa...');

    const faturasVencidas = await this.faturasRepository.find({
      where: {
        status: StatusFatura.VENCIDA,
        data_vencimento: LessThan(new Date()),
      },
      relations: ['assinatura', 'assinatura.unidade'],
    });

    for (const fatura of faturasVencidas) {
      try {
        await this.aplicarJurosMulta(fatura);
      } catch (error) {
        this.logger.error(
          `Erro ao calcular juros/multa para fatura ${fatura.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `✅ Juros e multa calculados para ${faturasVencidas.length} faturas`,
    );
  }

  async aplicarJurosMulta(fatura: Fatura): Promise<Fatura> {
    if (!fatura.assinatura?.unidade_id) {
      return fatura;
    }

    const config = await this.getConfiguracaoUnidade(
      fatura.assinatura.unidade_id,
    );

    if (!config) {
      return fatura;
    }

    const hoje = new Date();
    const vencimento = new Date(fatura.data_vencimento);
    const diasAtraso = Math.floor(
      (hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diasAtraso <= 0) {
      return fatura;
    }

    // Calcular multa (aplicada uma vez)
    const multa =
      fatura.valor_original * (config.multa_atraso_percentual / 100);

    // Calcular juros diários
    const juros =
      fatura.valor_original *
      (config.juros_diario_percentual / 100) *
      diasAtraso;

    // Atualizar fatura
    fatura.valor_acrescimo = parseFloat((multa + juros).toFixed(2));
    fatura.valor_total =
      fatura.valor_original - fatura.valor_desconto + fatura.valor_acrescimo;

    await this.faturasRepository.save(fatura);

    this.logger.log(
      `💰 Fatura ${fatura.numero_fatura}: Multa R$ ${multa.toFixed(2)} + Juros R$ ${juros.toFixed(2)}`,
    );

    return fatura;
  }

  /**
   * Verifica inadimplência e bloqueia alunos
   * Executa diariamente às 06:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async verificarInadimplencia(): Promise<void> {
    this.logger.log('🔄 Verificando inadimplência...');

    const assinaturas = await this.assinaturasRepository.find({
      where: { status: StatusAssinatura.ATIVA },
      relations: ['aluno', 'unidade', 'plano'],
    });

    for (const assinatura of assinaturas) {
      try {
        await this.verificarBloqueio(assinatura);
      } catch (error) {
        this.logger.error(
          `Erro ao verificar inadimplência para assinatura ${assinatura.id}:`,
          error,
        );
      }
    }

    this.logger.log(`✅ Verificação de inadimplência concluída`);
  }

  async verificarBloqueio(assinatura: Assinatura): Promise<void> {
    const config = await this.getConfiguracaoUnidade(assinatura.unidade_id);

    if (!config) {
      return;
    }

    // Contar faturas vencidas
    const faturasVencidas = await this.faturasRepository.count({
      where: {
        assinatura_id: assinatura.id,
        status: StatusFatura.VENCIDA,
      },
    });

    // Verificar se deve marcar como inadimplente
    if (faturasVencidas >= config.faturas_vencidas_para_inadimplencia) {
      assinatura.status = StatusAssinatura.INADIMPLENTE;
      await this.assinaturasRepository.save(assinatura);

      this.logger.warn(
        `🚫 Assinatura ${assinatura.id} marcada como INADIMPLENTE (${faturasVencidas} faturas vencidas)`,
      );

      // Enviar notificação
      await this.notificacoesService.enviarNotificacaoInadimplencia(assinatura);
    }
  }

  /**
   * Envia lembretes de vencimento
   * Executa diariamente às 08:00
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async enviarLembretesVencimento(): Promise<void> {
    this.logger.log('🔄 Enviando lembretes de vencimento...');

    const configs = await this.configRepository.find({
      where: { enviar_lembrete_vencimento: true },
    });

    for (const config of configs) {
      try {
        await this.enviarLembretesUnidade(config);
      } catch (error) {
        this.logger.error(
          `Erro ao enviar lembretes para unidade ${config.unidade_id}:`,
          error,
        );
      }
    }

    this.logger.log('✅ Lembretes de vencimento enviados');
  }

  private async enviarLembretesUnidade(
    config: ConfiguracaoCobranca,
  ): Promise<void> {
    const dataLimite = new Date();
    dataLimite.setDate(
      dataLimite.getDate() + config.dias_antecedencia_lembrete,
    );

    const faturasPendentes = await this.faturasRepository.find({
      where: {
        status: StatusFatura.PENDENTE,
        data_vencimento: LessThan(dataLimite),
      },
      relations: ['aluno', 'aluno.usuario', 'assinatura'],
    });

    for (const fatura of faturasPendentes) {
      await this.notificacoesService.enviarLembreteVencimento(fatura);
    }

    this.logger.log(
      `📧 ${faturasPendentes.length} lembretes enviados para unidade ${config.unidade_id}`,
    );
  }

  /**
   * Gera faturas recorrentes
   * Executa diariamente às 00:30
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async gerarFaturasRecorrentes(): Promise<void> {
    this.logger.log('🔄 Gerando faturas recorrentes...');

    const hoje = new Date();
    const assinaturas = await this.assinaturasRepository.find({
      where: {
        status: StatusAssinatura.ATIVA,
        proxima_cobranca: LessThan(hoje),
      },
      relations: ['aluno', 'plano', 'unidade'],
    });

    for (const assinatura of assinaturas) {
      try {
        await this.gerarFaturaAssinatura(assinatura);
      } catch (error) {
        this.logger.error(
          `Erro ao gerar fatura para assinatura ${assinatura.id}:`,
          error,
        );
      }
    }

    this.logger.log(`✅ ${assinaturas.length} faturas recorrentes geradas`);
  }

  private async gerarFaturaAssinatura(assinatura: Assinatura): Promise<Fatura> {
    const numero_fatura = await this.gerarNumeroFatura();

    const fatura = this.faturasRepository.create({
      assinatura_id: assinatura.id,
      aluno_id: assinatura.aluno_id,
      numero_fatura,
      descricao: `${assinatura.plano?.nome || 'Mensalidade'} - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      valor_original: assinatura.valor,
      valor_desconto: 0,
      valor_acrescimo: 0,
      valor_total: assinatura.valor,
      valor_pago: 0,
      data_vencimento: assinatura.proxima_cobranca,
      status: StatusFatura.PENDENTE,
      metodo_pagamento: assinatura.metodo_pagamento as any,
    });

    await this.faturasRepository.save(fatura);

    // Atualizar próxima cobrança
    const proximaCobranca = new Date(assinatura.proxima_cobranca);
    proximaCobranca.setMonth(proximaCobranca.getMonth() + 1);
    assinatura.proxima_cobranca = proximaCobranca;
    await this.assinaturasRepository.save(assinatura);

    this.logger.log(
      `📄 Fatura ${numero_fatura} gerada para assinatura ${assinatura.id}`,
    );

    return fatura;
  }

  private async gerarNumeroFatura(): Promise<string> {
    const ano = new Date().getFullYear();
    const count = await this.faturasRepository.count();
    const numero = (count + 1).toString().padStart(6, '0');
    return `FAT${ano}${numero}`;
  }

  private async getConfiguracaoUnidade(
    unidadeId: string,
  ): Promise<ConfiguracaoCobranca | null> {
    if (!unidadeId) return null;

    return this.configRepository.findOne({
      where: { unidade_id: unidadeId },
    });
  }

  /**
   * ⚠️ CRON REMOVIDO: verificarCartoesVencendo
   * ⚠️ CRON REMOVIDO: processarCobrancasRecorrentes
   * 
   * Esses crons foram movidos para um serviço scheduler separado.
   * Ver: SERVICO_SCHEDULER_RECORRENCIA.md
   */

  /**
   * Executa todas as automações manualmente
   */
  async executarTodasAutomacoes(): Promise<any> {
    const inicio = Date.now();

    await this.calcularJurosMulta();
    await this.verificarInadimplencia();
    await this.gerarFaturasRecorrentes();
    await this.enviarLembretesVencimento();

    // ⚠️ REMOVIDO: processarCobrancasRecorrentes() - agora roda em serviço separado

    const duracao = Date.now() - inicio;

    return {
      message: 'Automações executadas com sucesso (exceto cobranças recorrentes)',
      duracao_ms: duracao,
      timestamp: new Date(),
      observacao: 'Cobranças recorrentes e cartões vencendo rodam em serviço scheduler separado',
    };
  }
}
