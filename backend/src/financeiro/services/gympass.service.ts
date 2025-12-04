import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transacao,
  TipoTransacao,
  OrigemTransacao,
} from '../entities/transacao.entity';
import { Assinatura } from '../entities/assinatura.entity';
import { Fatura } from '../entities/fatura.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface GympassTransacao {
  external_id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface ConfigGympass {
  unidade_id: string;
  gympass_unidade_id: string;
  percentual_repasse: number;
  ativo: boolean;
}

@Injectable()
export class GympassService {
  private readonly logger = new Logger(GympassService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    @InjectRepository(Transacao)
    private transacoesRepository: Repository<Transacao>,
    @InjectRepository(Assinatura)
    private assinaturasRepository: Repository<Assinatura>,
    @InjectRepository(Fatura)
    private faturasRepository: Repository<Fatura>,
    private httpService: HttpService,
  ) {
    this.apiUrl = process.env.GYMPASS_API_URL || 'https://api.gympass.com';
    this.apiKey = process.env.GYMPASS_API_KEY || '';
  }

  /**
   * Processa transação recebida do Gympass
   */
  async processarTransacao(
    dados: GympassTransacao,
    unidadeId: string,
  ): Promise<Transacao> {
    try {
      // Verificar se a transação já foi processada
      const existente = await this.transacoesRepository.findOne({
        where: {
          origem: OrigemTransacao.GYMPASS,
          observacoes: dados.external_id,
        },
      });

      if (existente) {
        this.logger.warn(
          `Transação Gympass ${dados.external_id} já processada`,
        );
        return existente;
      }

      // Calcular valor líquido após repasse
      const config = await this.getConfiguracao(unidadeId);
      const valorBruto = dados.amount;
      const percentualRepasse = config?.percentual_repasse || 70;
      const valorLiquido = valorBruto * (percentualRepasse / 100);

      // Criar transação
      const transacao = this.transacoesRepository.create({
        tipo: TipoTransacao.ENTRADA,
        origem: OrigemTransacao.GYMPASS,
        categoria: 'MENSALIDADE' as any,
        descricao: `Gympass - Check-in usuário ${dados.user_id}`,
        unidade_id: unidadeId,
        valor: valorLiquido,
        data: new Date(dados.created_at),
        status: 'CONFIRMADA' as any,
        observacoes: `${dados.external_id} - Bruto: R$${valorBruto.toFixed(2)}, Repasse: ${percentualRepasse}%`,
      });

      await this.transacoesRepository.save(transacao);

      this.logger.log(
        `✅ Transação Gympass ${dados.external_id} processada: R$ ${valorLiquido.toFixed(2)}`,
      );

      return transacao;
    } catch (error) {
      this.logger.error('Erro ao processar transação Gympass:', error);
      throw error;
    }
  }

  /**
   * Busca transações do Gympass via API
   */
  async sincronizarTransacoes(
    unidadeId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<any> {
    try {
      if (!this.apiKey) {
        throw new Error('Gympass API Key não configurada');
      }

      const config = await this.getConfiguracao(unidadeId);

      if (!config || !config.gympass_unidade_id) {
        throw new Error('Unidade não possui configuração Gympass');
      }

      const params: any = {
        unit_id: config.gympass_unidade_id,
      };

      if (dataInicio) {
        params.start_date = dataInicio.toISOString();
      }

      if (dataFim) {
        params.end_date = dataFim.toISOString();
      }

      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/v1/transactions`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          params,
        }),
      );

      const transacoes = response.data.transactions || [];

      // Processar cada transação
      const resultados: any[] = [];
      for (const txn of transacoes) {
        const processada = await this.processarTransacao(txn, unidadeId);
        resultados.push(processada);
      }

      this.logger.log(
        `✅ ${resultados.length} transações Gympass sincronizadas para unidade ${unidadeId}`,
      );

      return {
        total: resultados.length,
        transacoes: resultados,
      };
    } catch (error) {
      this.logger.error('Erro ao sincronizar transações Gympass:', error);
      throw error;
    }
  }

  /**
   * Busca estatísticas Gympass
   */
  async estatisticas(unidadeId: string, mes?: string): Promise<any> {
    const query = this.transacoesRepository
      .createQueryBuilder('transacao')
      .where('transacao.origem = :origem', { origem: OrigemTransacao.GYMPASS })
      .andWhere('transacao.unidade_id = :unidadeId', { unidadeId });

    if (mes) {
      const [ano, mesNum] = mes.split('-');
      const dataInicio = new Date(parseInt(ano), parseInt(mesNum) - 1, 1);
      const dataFim = new Date(parseInt(ano), parseInt(mesNum), 0);

      query.andWhere('transacao.data BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });
    }

    const transacoes = await query.getMany();

    const totalReceita = transacoes.reduce((sum, t) => sum + t.valor, 0);
    const totalCheckIns = transacoes.length;

    return {
      totalCheckIns,
      totalReceita,
      receitaMedia: totalCheckIns > 0 ? totalReceita / totalCheckIns : 0,
      transacoes: transacoes.slice(0, 10), // Últimas 10
    };
  }

  /**
   * Verifica se a integração está ativa e funcionando
   */
  async verificarIntegracao(unidadeId: string): Promise<any> {
    try {
      const config = await this.getConfiguracao(unidadeId);

      if (!config) {
        return {
          ativo: false,
          message: 'Integração não configurada',
        };
      }

      if (!this.apiKey) {
        return {
          ativo: false,
          message: 'API Key não configurada',
        };
      }

      // Testar conexão com API
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/v1/health`, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }),
      );

      return {
        ativo: true,
        config,
        api_status: response.data,
      };
    } catch (error) {
      return {
        ativo: false,
        message: error.message,
      };
    }
  }

  private async getConfiguracao(unidadeId: string): Promise<any> {
    // Buscar configuração da unidade
    // Por enquanto, retorna mock para desenvolvimento
    return {
      unidade_id: unidadeId,
      gympass_unidade_id: 'UNIT123',
      percentual_repasse: 70,
      ativo: true,
    };
  }
}
