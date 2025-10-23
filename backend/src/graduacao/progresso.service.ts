import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoricoGraus } from './entities/historico-graus.entity';
import { HistoricoFaixas } from './entities/historico-faixas.entity';
import { AlunoFaixa } from './entities/aluno-faixa.entity';
import { FaixaDef } from './entities/faixa-def.entity';
import { Aluno } from '../people/entities/aluno.entity';
import { ProgressoAlunoDto } from './progresso.controller';

@Injectable()
export class ProgressoService {
  constructor(
    @InjectRepository(HistoricoGraus)
    private historicoGrausRepository: Repository<HistoricoGraus>,
    @InjectRepository(HistoricoFaixas)
    private historicoFaixasRepository: Repository<HistoricoFaixas>,
    @InjectRepository(AlunoFaixa)
    private alunoFaixaRepository: Repository<AlunoFaixa>,
    @InjectRepository(FaixaDef)
    private faixaDefRepository: Repository<FaixaDef>,
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
  ) {}

  async getHistoricoCompleto(usuarioId: string): Promise<ProgressoAlunoDto> {
    try {
      // Validar que usuarioId foi fornecido
      if (!usuarioId) {
        throw new NotFoundException('ID do usuário não fornecido');
      }

      // Primeiro, encontrar o aluno pelo usuário
      const aluno = await this.alunoRepository.findOne({
        where: { usuario_id: usuarioId },
        relations: ['faixas', 'faixas.faixaDef'],
      });

      // Verificar se não está pegando o aluno errado
      if (aluno && aluno.usuario_id !== usuarioId) {
        console.error(
          `⚠️⚠️ ERRO CRÍTICO: Aluno retornado tem usuario_id diferente!`,
        );
        console.error(`Esperado: ${usuarioId}, Recebido: ${aluno.usuario_id}`);
        throw new Error('Erro de segurança: Aluno incorreto retornado');
      }

      if (!aluno) {
        // Retornar dados vazios em vez de erro
        return {
          graduacaoAtual: {
            faixa: 'Não definida',
            grau: 0,
            aulasNaFaixa: 0,
            aulasParaProximoGrau: 0,
            progressoPercentual: 0,
          },
          historicoGraus: [],
          historicoFaixas: [],
        };
      }

      // Buscar a faixa ativa atual
      const faixaAtiva = await this.alunoFaixaRepository.findOne({
        where: { aluno_id: aluno.id, ativa: true },
        relations: ['faixaDef'],
      });

      if (!faixaAtiva) {
        // Buscar histórico de graus mesmo sem faixa ativa
        const historicoGraus = await this.historicoGrausRepository.find({
          where: { aluno_id: aluno.id },
          relations: ['faixa'],
          order: { data_concessao: 'DESC' },
        });

        // Buscar histórico de faixas
        const historicoFaixas = await this.alunoFaixaRepository
          .createQueryBuilder('faixa')
          .leftJoinAndSelect('faixa.faixaDef', 'faixaDef')
          .where('faixa.aluno_id = :aluno_id', { aluno_id: aluno.id })
          .orderBy('CASE WHEN faixa.dt_fim IS NULL THEN 0 ELSE 1 END', 'ASC')
          .addOrderBy('faixa.dt_inicio', 'DESC')
          .getMany();

        return {
          graduacaoAtual: {
            faixa: 'Não definida',
            grau: 0,
            aulasNaFaixa: 0,
            aulasParaProximoGrau: 0,
            progressoPercentual: 0,
          },
          historicoGraus: historicoGraus.map((h) => ({
            id: h.id,
            faixa: h.faixa?.nome_exibicao || 'Desconhecida',
            grau: h.grau_numero,
            dataConcessao:
              h.data_concessao instanceof Date
                ? h.data_concessao.toISOString().split('T')[0]
                : new Date(h.data_concessao).toISOString().split('T')[0],
            origemGrau: h.origem_grau,
            aulasAcumuladas: h.aulas_acumuladas,
            justificativa: h.justificativa,
          })),
          historicoFaixas: historicoFaixas.map((h) => ({
            id: h.id,
            faixaOrigem: undefined,
            faixaDestino: h.faixaDef?.nome_exibicao || 'Desconhecida',
            dataPromocao:
              h.dt_inicio instanceof Date
                ? h.dt_inicio.toISOString().split('T')[0]
                : new Date(h.dt_inicio).toISOString().split('T')[0],
            dt_inicio:
              h.dt_inicio instanceof Date
                ? h.dt_inicio.toISOString().split('T')[0]
                : new Date(h.dt_inicio).toISOString().split('T')[0],
            dt_fim: h.dt_fim
              ? h.dt_fim instanceof Date
                ? h.dt_fim.toISOString().split('T')[0]
                : new Date(h.dt_fim).toISOString().split('T')[0]
              : undefined,
            evento: undefined,
            observacoes: `Grau atual: ${h.graus_atual}/${h.faixaDef?.graus_max || 4}`,
          })),
        };
      }

      // Calcular progresso atual
      const aulasParaProximoGrau = Math.max(
        0,
        faixaAtiva.faixaDef.aulas_por_grau - faixaAtiva.presencas_no_ciclo,
      );
      const progressoPercentual = Math.min(
        100,
        (faixaAtiva.presencas_no_ciclo / faixaAtiva.faixaDef.aulas_por_grau) *
          100,
      );

      // Buscar histórico de graus
      const historicoGraus = await this.historicoGrausRepository.find({
        where: { aluno_id: aluno.id },
        relations: ['faixa'],
        order: { data_concessao: 'DESC' },
      });

      // Buscar histórico de faixas da tabela aluno_faixa
      // Ordena primeiro por faixas atuais (dt_fim null), depois por dt_inicio DESC
      const historicoFaixas = await this.alunoFaixaRepository
        .createQueryBuilder('faixa')
        .leftJoinAndSelect('faixa.faixaDef', 'faixaDef')
        .where('faixa.aluno_id = :aluno_id', { aluno_id: aluno.id })
        .orderBy('CASE WHEN faixa.dt_fim IS NULL THEN 0 ELSE 1 END', 'ASC')
        .addOrderBy('faixa.dt_inicio', 'DESC')
        .getMany();

      return {
        graduacaoAtual: {
          faixa: faixaAtiva.faixaDef.nome_exibicao,
          grau: faixaAtiva.graus_atual,
          aulasNaFaixa: faixaAtiva.presencas_no_ciclo,
          aulasParaProximoGrau,
          progressoPercentual: Math.round(progressoPercentual),
        },
        historicoGraus: historicoGraus.map((h) => ({
          id: h.id,
          faixa: h.faixa.nome_exibicao,
          grau: h.grau_numero,
          dataConcessao:
            h.data_concessao instanceof Date
              ? h.data_concessao.toISOString().split('T')[0]
              : new Date(h.data_concessao).toISOString().split('T')[0],
          origemGrau: h.origem_grau,
          aulasAcumuladas: h.aulas_acumuladas,
          justificativa: h.justificativa,
        })),
        historicoFaixas: historicoFaixas.map((h) => ({
          id: h.id,
          faixaOrigem: undefined, // A faixa anterior não está diretamente disponível
          faixaDestino: h.faixaDef.nome_exibicao,
          dataPromocao:
            h.dt_inicio instanceof Date
              ? h.dt_inicio.toISOString().split('T')[0]
              : new Date(h.dt_inicio).toISOString().split('T')[0],
          dt_inicio:
            h.dt_inicio instanceof Date
              ? h.dt_inicio.toISOString().split('T')[0]
              : new Date(h.dt_inicio).toISOString().split('T')[0],
          dt_fim: h.dt_fim
            ? h.dt_fim instanceof Date
              ? h.dt_fim.toISOString().split('T')[0]
              : new Date(h.dt_fim).toISOString().split('T')[0]
            : undefined,
          evento: undefined, // Campo não existe em aluno_faixa
          observacoes: `Grau atual: ${h.graus_atual}/${h.faixaDef.graus_max}`,
        })),
      };
    } catch (error) {
      console.error('❌ Erro no serviço progresso:', error);
      throw error;
    }
  }

  async adicionarGrau(
    usuarioId: string,
    dadosGrau: {
      faixaId: string;
      grauNumero: number;
      dataConcessao: string;
      origemGrau: string;
      aulasAcumuladas?: number;
      justificativa?: string;
    },
  ) {
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    const novoGrau = this.historicoGrausRepository.create({
      aluno_id: aluno.id,
      faixa_id: dadosGrau.faixaId,
      grau_numero: dadosGrau.grauNumero,
      data_concessao: new Date(dadosGrau.dataConcessao),
      origem_grau: dadosGrau.origemGrau as any,
      aulas_acumuladas: dadosGrau.aulasAcumuladas,
      justificativa: dadosGrau.justificativa,
      created_by: usuarioId,
    });

    return await this.historicoGrausRepository.save(novoGrau);
  }

  async adicionarFaixa(
    usuarioId: string,
    dadosFaixa: {
      faixaOrigemId?: string;
      faixaDestinoId: string;
      dt_inicio: string;
      dt_fim?: string;
      evento?: string;
      observacoes?: string;
    },
  ) {
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Criar uma faixa histórica (inativa) - não interfere com a faixa atual
    const faixaHistorica = this.alunoFaixaRepository.create({
      aluno_id: aluno.id,
      faixa_def_id: dadosFaixa.faixaDestinoId,
      ativa: false, // Sempre inativa para histórico
      dt_inicio: new Date(dadosFaixa.dt_inicio),
      dt_fim: dadosFaixa.dt_fim ? new Date(dadosFaixa.dt_fim) : undefined,
      graus_atual: 4, // Assumindo que completou todos os graus da faixa
      presencas_no_ciclo: 0,
      presencas_total_fx: 0,
    });

    return await this.alunoFaixaRepository.save(faixaHistorica);
  }

  async listarFaixas() {
    const faixas = await this.faixaDefRepository.find({
      select: ['id', 'nome_exibicao', 'ordem', 'codigo'],
      order: { ordem: 'ASC' },
    });

    return faixas.map((faixa) => ({
      id: faixa.id,
      nome: faixa.nome_exibicao,
      codigo: faixa.codigo,
      ordem: faixa.ordem,
    }));
  }

  async atualizarFaixa(
    usuarioId: string,
    faixaId: string,
    dadosAtualizacao: {
      dt_inicio?: string;
      dt_fim?: string;
    },
  ) {
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: usuarioId },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Buscar a faixa específica do aluno
    const faixaAluno = await this.alunoFaixaRepository.findOne({
      where: {
        id: faixaId,
        aluno_id: aluno.id,
      },
    });

    if (!faixaAluno) {
      throw new NotFoundException('Faixa não encontrada no histórico do aluno');
    }

    // Atualizar apenas os campos fornecidos
    if (dadosAtualizacao.dt_inicio) {
      faixaAluno.dt_inicio = new Date(dadosAtualizacao.dt_inicio);
    }

    if (dadosAtualizacao.dt_fim) {
      faixaAluno.dt_fim = new Date(dadosAtualizacao.dt_fim);
    }

    return await this.alunoFaixaRepository.save(faixaAluno);
  }
}
