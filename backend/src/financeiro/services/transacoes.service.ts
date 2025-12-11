import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transacao, TipoTransacao } from '../entities/transacao.entity';
import { Fatura, StatusFatura } from '../entities/fatura.entity';
import { Despesa, StatusDespesa } from '../entities/despesa.entity';
import { CreateTransacaoDto, FiltroTransacoesDto } from '../dto/transacao.dto';

@Injectable()
export class TransacoesService {
  constructor(
    @InjectRepository(Transacao)
    private transacaoRepository: Repository<Transacao>,
  ) {}

  async create(
    createTransacaoDto: CreateTransacaoDto,
    user: any,
  ): Promise<Transacao> {
    const transacao = this.transacaoRepository.create({
      ...createTransacaoDto,
      criado_por: user.id,
    });

    return await this.transacaoRepository.save(transacao);
  }

  async findAll(
    filtro: FiltroTransacoesDto,
    franqueado_id?: string | null,
  ): Promise<Transacao[]> {
    const query = this.transacaoRepository
      .createQueryBuilder('transacao')
      .leftJoinAndSelect('transacao.aluno', 'aluno')
      .leftJoinAndSelect('transacao.unidade', 'unidade')
      .leftJoinAndSelect('transacao.fatura', 'fatura')
      .leftJoinAndSelect('transacao.despesa', 'despesa')
      .orderBy('transacao.data', 'DESC');

    // Se foi passado franqueado_id, filtrar pelas unidades desse franqueado
    if (franqueado_id) {
      console.log(
        '🔍 [TRANSACOES SERVICE] Filtrando por franqueado_id:',
        franqueado_id,
      );
      query.andWhere('unidade.franqueado_id = :franqueado_id', {
        franqueado_id,
      });
    } else if (filtro.unidade_id) {
      query.andWhere('transacao.unidade_id = :unidade_id', {
        unidade_id: filtro.unidade_id,
      });
    }

    if (filtro.data_inicio) {
      query.andWhere('transacao.data >= :data_inicio', {
        data_inicio: filtro.data_inicio,
      });
    }

    if (filtro.data_fim) {
      query.andWhere('transacao.data <= :data_fim', {
        data_fim: filtro.data_fim,
      });
    }

    if (filtro.tipo) {
      query.andWhere('transacao.tipo = :tipo', { tipo: filtro.tipo });
    }

    if (filtro.origem) {
      query.andWhere('transacao.origem = :origem', { origem: filtro.origem });
    }

    if (filtro.categoria) {
      query.andWhere('transacao.categoria = :categoria', {
        categoria: filtro.categoria,
      });
    }

    if (filtro.aluno_id) {
      query.andWhere('transacao.aluno_id = :aluno_id', {
        aluno_id: filtro.aluno_id,
      });
    }

    const result = await query.getMany();
    console.log(
      `🔍 [TRANSACOES SERVICE] Encontradas ${result.length} transações`,
    );

    return result;
  }

  async getExtrato(
    filtro: FiltroTransacoesDto,
    franqueado_id?: string | null,
  ): Promise<any> {
    console.log('📋 [EXTRATO] getExtrato chamado com filtro:', filtro);

    const transacoes = await this.findAll(filtro, franqueado_id);

    console.log(`📋 [EXTRATO] Encontradas ${transacoes.length} transações`);

    let saldoAnterior = 0;
    let totalEntradas = 0;
    let totalSaidas = 0;

    const extrato = transacoes.map((t) => {
      const valor = t.tipo === TipoTransacao.ENTRADA ? t.valor : -t.valor;

      if (t.tipo === TipoTransacao.ENTRADA) {
        totalEntradas += t.valor;
      } else {
        totalSaidas += t.valor;
      }

      saldoAnterior += valor;

      return {
        id: t.id,
        data: t.data,
        descricao: t.descricao,
        tipo: t.tipo,
        categoria: t.categoria,
        aluno: t.aluno ? t.aluno.nome_completo : null,
        valor: t.valor,
        saldo: saldoAnterior,
        metodo_pagamento: t.metodo_pagamento,
        status: t.status,
      };
    });

    return {
      extrato,
      resumo: {
        total_entradas: totalEntradas,
        total_saidas: totalSaidas,
        saldo_periodo: totalEntradas - totalSaidas,
      },
    };
  }

  async getDashboardData(unidade_id?: string, mes?: string): Promise<any> {
    // Calcular período
    let dataInicio: Date;
    let dataFim: Date;

    if (mes) {
      const [ano, mesNum] = mes.split('-');
      dataInicio = new Date(parseInt(ano), parseInt(mesNum) - 1, 1);
      dataFim = new Date(parseInt(ano), parseInt(mesNum), 0);
    } else {
      const hoje = new Date();
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }

    const query = this.transacaoRepository
      .createQueryBuilder('transacao')
      .where('transacao.data BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    if (unidade_id) {
      query.andWhere('transacao.unidade_id = :unidade_id', { unidade_id });
    }

    const transacoes = await query.getMany();

    const entradas = transacoes
      .filter((t) => t.tipo === TipoTransacao.ENTRADA)
      .reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);

    const saidas = transacoes
      .filter((t) => t.tipo === TipoTransacao.SAIDA)
      .reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);

    return {
      receita_mes: entradas,
      despesas_mes: saidas,
      saldo: entradas - saidas,
    };
  }
}
