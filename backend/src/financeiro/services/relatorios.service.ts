import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Fatura, StatusFatura } from '../entities/fatura.entity';
import { ConfiguracaoCobranca } from '../entities/configuracao-cobranca.entity';
import { NotificacoesService } from './notificacoes.service';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface RelatorioCompletoDto {
  estatisticas: {
    total_pagas: number;
    valor_total_pagas: number;
    total_vencidas: number;
    valor_total_vencidas: number;
    total_pendentes: number;
    valor_total_pendentes: number;
    total_proximas_vencer: number;
    valor_total_proximas_vencer: number;
    taxa_inadimplencia: number;
  };
  faturas_pagas: FaturaRelatorioDto[];
  faturas_vencidas: FaturaRelatorioDto[];
  faturas_pendentes: FaturaRelatorioDto[];
  faturas_proximas_vencer: FaturaRelatorioDto[];
}

export interface FaturaRelatorioDto {
  id: string;
  numero_fatura: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_telefone: string;
  aluno_email: string;
  descricao: string;
  valor_total: number;
  data_vencimento: Date;
  data_pagamento?: Date;
  status: StatusFatura;
  link_pagamento?: string;
  dias_ate_vencimento?: number;
  dias_em_atraso?: number;
  unidade_nome?: string;
}

export interface ResultadoEnvio {
  fatura_id: string;
  numero_fatura: string;
  aluno_nome: string;
  sucesso: boolean;
  mensagem: string;
}

@Injectable()
export class RelatoriosService {
  private readonly logger = new Logger(RelatoriosService.name);

  constructor(
    @InjectRepository(Fatura)
    private faturaRepository: Repository<Fatura>,
    @InjectRepository(ConfiguracaoCobranca)
    private configRepository: Repository<ConfiguracaoCobranca>,
    private notificacoesService: NotificacoesService,
  ) {}

  /**
   * Retorna relatório completo de faturas
   */
  async getRelatorioCompleto(
    unidadeId?: string,
    mes?: string,
    ano?: string,
    franqueadoId?: string,
  ): Promise<RelatorioCompletoDto> {
    this.logger.log('📊 Gerando relatório financeiro completo...');

    // Definir período
    let dataInicio: Date;
    let dataFim: Date;

    if (mes && ano) {
      const mesNum = parseInt(mes, 10) - 1; // JS months são 0-indexed
      const anoNum = parseInt(ano, 10);
      dataInicio = new Date(anoNum, mesNum, 1);
      dataFim = new Date(anoNum, mesNum + 1, 0, 23, 59, 59);
    } else if (ano) {
      const anoNum = parseInt(ano, 10);
      dataInicio = new Date(anoNum, 0, 1);
      dataFim = new Date(anoNum, 11, 31, 23, 59, 59);
    } else {
      // Padrão: mês atual
      const agora = new Date();
      dataInicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
      dataFim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    }

    this.logger.log(`📅 Período: ${dataInicio.toISOString()} até ${dataFim.toISOString()}`);

    // Buscar todas as faturas do período
    const queryBuilder = this.faturaRepository
      .createQueryBuilder('fatura')
      .leftJoinAndSelect('fatura.aluno', 'aluno')
      .leftJoinAndSelect('aluno.unidade', 'unidade')
      .where('fatura.data_vencimento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    // Filtros adicionais
    if (unidadeId) {
      queryBuilder.andWhere('aluno.unidade_id = :unidadeId', { unidadeId });
    }

    if (franqueadoId) {
      queryBuilder.andWhere('unidade.franqueado_id = :franqueadoId', {
        franqueadoId,
      });
    }

    const faturas = await queryBuilder.getMany();

    this.logger.log(`📦 Faturas encontradas: ${faturas.length}`);

    // Separar faturas por status
    const hoje = dayjs().startOf('day');
    const faturasPagas: FaturaRelatorioDto[] = [];
    const faturasVencidas: FaturaRelatorioDto[] = [];
    const faturasPendentes: FaturaRelatorioDto[] = [];
    const faturasProximasVencer: FaturaRelatorioDto[] = [];

    faturas.forEach((fatura) => {
      const faturaDto = this.mapearFaturaParaDto(fatura);

      if (fatura.status === StatusFatura.PAGA) {
        faturasPagas.push(faturaDto);
      } else if (fatura.status === StatusFatura.VENCIDA) {
        faturasVencidas.push(faturaDto);
      } else if (fatura.status === StatusFatura.PENDENTE) {
        const dataVencimento = dayjs(fatura.data_vencimento).startOf('day');
        const diasRestantes = dataVencimento.diff(hoje, 'days');

        if (diasRestantes < 0) {
          // Já venceu mas ainda está como PENDENTE (atualizar para VENCIDA)
          faturaDto.status = StatusFatura.VENCIDA;
          faturaDto.dias_em_atraso = Math.abs(diasRestantes);
          faturasVencidas.push(faturaDto);
        } else if (diasRestantes <= 7) {
          // Próximas de vencer (7 dias ou menos)
          faturaDto.dias_ate_vencimento = diasRestantes;
          faturasProximasVencer.push(faturaDto);
        } else {
          // Pendentes normais
          faturaDto.dias_ate_vencimento = diasRestantes;
          faturasPendentes.push(faturaDto);
        }
      } else {
        // Outros status (CANCELADA, etc)
        faturasPendentes.push(faturaDto);
      }
    });

    // Calcular estatísticas
    const estatisticas = {
      total_pagas: faturasPagas.length,
      valor_total_pagas: faturasPagas.reduce(
        (sum, f) => sum + Number(f.valor_total),
        0,
      ),
      total_vencidas: faturasVencidas.length,
      valor_total_vencidas: faturasVencidas.reduce(
        (sum, f) => sum + Number(f.valor_total),
        0,
      ),
      total_pendentes: faturasPendentes.length,
      valor_total_pendentes: faturasPendentes.reduce(
        (sum, f) => sum + Number(f.valor_total),
        0,
      ),
      total_proximas_vencer: faturasProximasVencer.length,
      valor_total_proximas_vencer: faturasProximasVencer.reduce(
        (sum, f) => sum + Number(f.valor_total),
        0,
      ),
      taxa_inadimplencia:
        faturas.length > 0
          ? (faturasVencidas.length / faturas.length) * 100
          : 0,
    };

    this.logger.log('✅ Relatório gerado com sucesso');

    return {
      estatisticas,
      faturas_pagas: faturasPagas,
      faturas_vencidas: faturasVencidas,
      faturas_pendentes: faturasPendentes,
      faturas_proximas_vencer: faturasProximasVencer,
    };
  }

  /**
   * Envia cobranças via WhatsApp em massa
   */
  async enviarCobrancasEmMassa(
    faturasIds: string[],
    mensagemPersonalizada?: string,
  ): Promise<ResultadoEnvio[]> {
    this.logger.log(`📱 Enviando ${faturasIds.length} cobranças via WhatsApp...`);

    const resultados: ResultadoEnvio[] = [];

    for (const faturaId of faturasIds) {
      try {
        const fatura = await this.faturaRepository.findOne({
          where: { id: faturaId },
          relations: ['aluno', 'aluno.unidade'],
        });

        if (!fatura) {
          resultados.push({
            fatura_id: faturaId,
            numero_fatura: 'N/A',
            aluno_nome: 'N/A',
            sucesso: false,
            mensagem: 'Fatura não encontrada',
          });
          continue;
        }

        if (!fatura.aluno?.telefone) {
          resultados.push({
            fatura_id: faturaId,
            numero_fatura: fatura.numero_fatura,
            aluno_nome: fatura.aluno?.nome_completo || 'N/A',
            sucesso: false,
            mensagem: 'Aluno sem telefone cadastrado',
          });
          continue;
        }

        await this.notificacoesService.enviarCobrancaWhatsapp(
          fatura,
          mensagemPersonalizada,
        );

        resultados.push({
          fatura_id: faturaId,
          numero_fatura: fatura.numero_fatura,
          aluno_nome: fatura.aluno.nome_completo,
          sucesso: true,
          mensagem: 'Enviado com sucesso',
        });

        // Delay entre envios para evitar rate limit
        await this.sleep(1000);
      } catch (error) {
        this.logger.error(`Erro ao enviar cobrança ${faturaId}:`, error);
        const err = error as Error;

        resultados.push({
          fatura_id: faturaId,
          numero_fatura: 'N/A',
          aluno_nome: 'N/A',
          sucesso: false,
          mensagem: err.message || 'Erro desconhecido',
        });
      }
    }

    const sucesso = resultados.filter((r) => r.sucesso).length;
    this.logger.log(`✅ Enviados ${sucesso} de ${faturasIds.length} cobranças`);

    return resultados;
  }

  /**
   * Envia lembretes para faturas próximas do vencimento
   */
  async enviarLembretesVencimento(
    dias?: number,
    unidadeId?: string,
  ): Promise<ResultadoEnvio[]> {
    // Buscar configuração da unidade
    let diasAntecedencia = dias || 3; // Padrão
    let enviarLembretes = true;

    if (unidadeId) {
      const config = await this.configRepository.findOne({
        where: { unidade_id: unidadeId },
      });

      if (config) {
        enviarLembretes = config.enviar_lembrete_vencimento ?? true;
        diasAntecedencia = dias || config.dias_antecedencia_lembrete || 3;
      }
    }

    if (!enviarLembretes && !dias) {
      this.logger.warn('Lembretes de vencimento desativados na configuração');
      return [];
    }

    this.logger.log(
      `📅 Enviando lembretes para faturas que vencem em ${diasAntecedencia} dias...`,
    );

    const hoje = dayjs().startOf('day');
    const dataLimite = hoje.add(diasAntecedencia, 'days').endOf('day').toDate();

    const queryBuilder = this.faturaRepository
      .createQueryBuilder('fatura')
      .leftJoinAndSelect('fatura.aluno', 'aluno')
      .leftJoinAndSelect('aluno.unidade', 'unidade')
      .where('fatura.status = :status', { status: StatusFatura.PENDENTE })
      .andWhere('fatura.data_vencimento <= :dataLimite', { dataLimite })
      .andWhere('fatura.data_vencimento > :hoje', { hoje: hoje.toDate() });

    if (unidadeId) {
      queryBuilder.andWhere('aluno.unidade_id = :unidadeId', { unidadeId });
    }

    const faturas = await queryBuilder.getMany();

    this.logger.log(
      `📎 ${faturas.length} faturas encontradas para envio de lembretes em ${diasAntecedencia} dias`,
    );

    const resultados: ResultadoEnvio[] = [];

    for (const fatura of faturas) {
      try {
        await this.notificacoesService.enviarLembreteVencimento(fatura);

        resultados.push({
          fatura_id: fatura.id,
          numero_fatura: fatura.numero_fatura,
          aluno_nome: fatura.aluno?.nome_completo || 'N/A',
          sucesso: true,
          mensagem: 'Lembrete enviado',
        });

        await this.sleep(1000);
      } catch (error) {
        this.logger.error(`Erro ao enviar lembrete ${fatura.id}:`, error);
        const err = error as Error;

        resultados.push({
          fatura_id: fatura.id,
          numero_fatura: fatura.numero_fatura,
          aluno_nome: fatura.aluno?.nome_completo || 'N/A',
          sucesso: false,
          mensagem: err.message || 'Erro desconhecido',
        });
      }
    }

    const sucesso = resultados.filter((r) => r.sucesso).length;
    this.logger.log(`✅ Enviados ${sucesso} de ${faturas.length} lembretes`);

    return resultados;
  }

  /**
   * Mapeia Fatura para DTO de relatório
   */
  private mapearFaturaParaDto(fatura: Fatura): FaturaRelatorioDto {
    return {
      id: fatura.id,
      numero_fatura: fatura.numero_fatura,
      aluno_id: fatura.aluno_id,
      aluno_nome: fatura.aluno?.nome_completo || 'N/A',
      aluno_telefone: fatura.aluno?.telefone || '',
      aluno_email: fatura.aluno?.email || '',
      descricao: fatura.descricao || '',
      valor_total: Number(fatura.valor_total),
      data_vencimento: fatura.data_vencimento,
      data_pagamento: fatura.data_pagamento || undefined,
      status: fatura.status,
      link_pagamento: fatura.link_pagamento,
      unidade_nome: (fatura.aluno as any)?.unidade?.nome || 'N/A',
    };
  }

  /**
   * Delay helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
