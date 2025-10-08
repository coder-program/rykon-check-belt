import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoricoGraus } from './entities/historico-graus.entity';
import { HistoricoFaixas } from './entities/historico-faixas.entity';
import { AlunoFaixa } from './entities/aluno-faixa.entity';
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
    @InjectRepository(Aluno)
    private alunoRepository: Repository<Aluno>,
  ) {}

  async getHistoricoCompleto(usuarioId: string): Promise<ProgressoAlunoDto> {
    try {
      console.log('🔍 Buscando histórico para usuário:', usuarioId);

      // Primeiro, encontrar o aluno pelo usuário
      const aluno = await this.alunoRepository.findOne({
        where: { usuario_id: usuarioId },
        relations: ['faixas', 'faixas.faixaDef'],
      });

      if (!aluno) {
        throw new NotFoundException('Aluno não encontrado');
      }

      // Buscar a faixa ativa atual
      const faixaAtiva = await this.alunoFaixaRepository.findOne({
        where: { aluno_id: aluno.id, ativa: true },
        relations: ['faixaDef'],
      });

      if (!faixaAtiva) {
        throw new NotFoundException('Faixa ativa não encontrada');
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

      // Buscar histórico de faixas
      const historicoFaixas = await this.historicoFaixasRepository.find({
        where: { aluno_id: aluno.id },
        relations: ['faixaOrigem', 'faixaDestino'],
        order: { data_promocao: 'DESC' },
      });

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
          dataConcessao: h.data_concessao.toISOString().split('T')[0],
          origemGrau: h.origem_grau,
          aulasAcumuladas: h.aulas_acumuladas,
          justificativa: h.justificativa,
        })),
        historicoFaixas: historicoFaixas.map((h) => ({
          id: h.id,
          faixaOrigem: h.faixaOrigem?.nome_exibicao,
          faixaDestino: h.faixaDestino.nome_exibicao,
          dataPromocao: h.data_promocao.toISOString().split('T')[0],
          evento: h.evento,
          observacoes: h.observacoes,
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
      dataPromocao: string;
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

    const novaFaixa = this.historicoFaixasRepository.create({
      aluno_id: aluno.id,
      faixa_origem_id: dadosFaixa.faixaOrigemId,
      faixa_destino_id: dadosFaixa.faixaDestinoId,
      data_promocao: new Date(dadosFaixa.dataPromocao),
      evento: dadosFaixa.evento,
      observacoes: dadosFaixa.observacoes,
      created_by: usuarioId,
    });

    return await this.historicoFaixasRepository.save(novaFaixa);
  }

  async listarFaixas() {
    return await this.historicoGrausRepository
      .createQueryBuilder('hg')
      .innerJoin('hg.faixa', 'f')
      .select(['f.id', 'f.nome_exibicao', 'f.ordem'])
      .groupBy('f.id, f.nome_exibicao, f.ordem')
      .orderBy('f.ordem', 'ASC')
      .getRawMany();
  }
}
