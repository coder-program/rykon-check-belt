import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Between, Like } from 'typeorm';
import {
  Competicao,
  StatusCompeticao,
  TipoCompeticao,
} from './entities/competicao.entity';
import {
  AlunoCompeticao,
  PosicaoCompeticao,
} from './entities/aluno-competicao.entity';
import { Aluno } from '../people/entities/aluno.entity';

@Injectable()
export class CompeticoesService {
  constructor(
    @InjectRepository(Competicao)
    private readonly competicaoRepository: Repository<Competicao>,
    @InjectRepository(AlunoCompeticao)
    private readonly alunoCompeticaoRepository: Repository<AlunoCompeticao>,
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
  ) {}

  // ========== COMPETIÇÕES ==========

  async listarCompetições(filtros?: {
    nome?: string;
    tipo?: TipoCompeticao;
    status?: StatusCompeticao;
    dataInicio?: Date;
    dataFim?: Date;
  }) {
    const where: any = { ativo: true };

    if (filtros?.nome) {
      where.nome = Like(`%${filtros.nome}%`);
    }

    if (filtros?.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros?.status) {
      where.status = filtros.status;
    }

    if (filtros?.dataInicio && filtros?.dataFim) {
      where.data_inicio = Between(filtros.dataInicio, filtros.dataFim);
    } else if (filtros?.dataInicio) {
      where.data_inicio = MoreThanOrEqual(filtros.dataInicio);
    }

    return this.competicaoRepository.find({
      where,
      order: { data_inicio: 'DESC' },
    });
  }

  async buscarCompeticao(id: string) {
    const competicao = await this.competicaoRepository.findOne({
      where: { id },
      relations: ['participacoes'],
    });

    if (!competicao) {
      throw new NotFoundException('Competição não encontrada');
    }

    return competicao;
  }

  async criarCompeticao(data: Partial<Competicao>, userId: string) {
    const competicao = this.competicaoRepository.create({
      ...data,
      created_by: userId,
      updated_by: userId,
    });

    return this.competicaoRepository.save(competicao);
  }

  async atualizarCompeticao(
    id: string,
    data: Partial<Competicao>,
    userId: string,
  ) {
    const competicao = await this.buscarCompeticao(id);

    Object.assign(competicao, data);
    competicao.updated_by = userId;

    return this.competicaoRepository.save(competicao);
  }

  async deletarCompeticao(id: string) {
    const competicao = await this.buscarCompeticao(id);
    competicao.ativo = false;
    return this.competicaoRepository.save(competicao);
  }

  // ========== PARTICIPAÇÕES ==========

  async buscarHistoricoAluno(alunoId: string, usuarioId?: string) {
    console.log('🏆 [buscarHistoricoAluno] Buscando histórico para:', alunoId);

    // Se usuarioId for fornecido, buscar o aluno vinculado
    let alunoIdFinal = alunoId;

    if (usuarioId) {
      const aluno = await this.alunoRepository.findOne({
        where: { usuario_id: usuarioId },
      });

      if (aluno) {
        alunoIdFinal = aluno.id;
      }
    }

    const participacoes = await this.alunoCompeticaoRepository.find({
      where: { aluno_id: alunoIdFinal },
      relations: ['competicao'],
      order: { created_at: 'DESC' },
    });

    console.log(
      '🏆 [buscarHistoricoAluno] Participações encontradas:',
      participacoes.length,
    );

    // Calcular estatísticas
    const totalCompeticoes = participacoes.length;
    const totalOuros = participacoes.filter(
      (p) => p.posicao === PosicaoCompeticao.OURO,
    ).length;
    const totalPratas = participacoes.filter(
      (p) => p.posicao === PosicaoCompeticao.PRATA,
    ).length;
    const totalBronzes = participacoes.filter(
      (p) => p.posicao === PosicaoCompeticao.BRONZE,
    ).length;
    const totalPodios = totalOuros + totalPratas + totalBronzes;

    const totalLutas = participacoes.reduce(
      (sum, p) => sum + (p.total_lutas || 0),
      0,
    );
    const totalVitorias = participacoes.reduce(
      (sum, p) => sum + (p.vitorias || 0),
      0,
    );
    const totalDerrotas = participacoes.reduce(
      (sum, p) => sum + (p.derrotas || 0),
      0,
    );

    const aproveitamento =
      totalLutas > 0 ? Math.round((totalVitorias / totalLutas) * 100) : 0;

    return {
      participacoes: participacoes.map((p) => ({
        id: p.id,
        competicao: {
          id: p.competicao.id,
          nome: p.competicao.nome,
          tipo: p.competicao.tipo,
          modalidade: p.competicao.modalidade,
          data: p.competicao.data_inicio,
          local: p.competicao.local,
          cidade: p.competicao.cidade,
          estado: p.competicao.estado,
        },
        categoria_peso: p.categoria_peso,
        categoria_idade: p.categoria_idade,
        categoria_faixa: p.categoria_faixa,
        colocacao: p.colocacao,
        posicao: p.posicao,
        total_lutas: p.total_lutas,
        vitorias: p.vitorias,
        derrotas: p.derrotas,
        observacoes: p.observacoes,
        medalha_emoji: p.getMedalhaEmoji(),
        aproveitamento: p.getAproveitamento(),
      })),
      estatisticas: {
        totalCompeticoes,
        totalOuros,
        totalPratas,
        totalBronzes,
        totalPodios,
        totalLutas,
        totalVitorias,
        totalDerrotas,
        aproveitamento,
      },
    };
  }

  async registrarParticipacao(data: Partial<AlunoCompeticao>, userId: string) {
    // Verificar se aluno existe
    const aluno = await this.alunoRepository.findOne({
      where: { id: data.aluno_id },
    });

    if (!aluno) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Verificar se competição existe
    const competicao = await this.competicaoRepository.findOne({
      where: { id: data.competicao_id },
    });

    if (!competicao) {
      throw new NotFoundException('Competição não encontrada');
    }

    // Verificar duplicação
    const existente = await this.alunoCompeticaoRepository.findOne({
      where: {
        aluno_id: data.aluno_id,
        competicao_id: data.competicao_id,
        categoria_peso: data.categoria_peso,
        categoria_faixa: data.categoria_faixa,
      },
    });

    if (existente) {
      throw new BadRequestException(
        'Participação já registrada para esta categoria',
      );
    }

    const participacao = this.alunoCompeticaoRepository.create({
      ...data,
      created_by: userId,
      updated_by: userId,
    });

    return this.alunoCompeticaoRepository.save(participacao);
  }

  async atualizarParticipacao(
    id: string,
    data: Partial<AlunoCompeticao>,
    userId: string,
  ) {
    const participacao = await this.alunoCompeticaoRepository.findOne({
      where: { id },
    });

    if (!participacao) {
      throw new NotFoundException('Participação não encontrada');
    }

    Object.assign(participacao, data);
    participacao.updated_by = userId;

    return this.alunoCompeticaoRepository.save(participacao);
  }

  async deletarParticipacao(id: string) {
    const participacao = await this.alunoCompeticaoRepository.findOne({
      where: { id },
    });

    if (!participacao) {
      throw new NotFoundException('Participação não encontrada');
    }

    return this.alunoCompeticaoRepository.remove(participacao);
  }

  // Buscar histórico do usuário logado
  async meuHistoricoCompeticoes(userId: string) {
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: userId },
    });

    if (!aluno) {
      return {
        participacoes: [],
        estatisticas: {
          totalCompeticoes: 0,
          totalOuros: 0,
          totalPratas: 0,
          totalBronzes: 0,
          totalPodios: 0,
          totalLutas: 0,
          totalVitorias: 0,
          totalDerrotas: 0,
          aproveitamento: 0,
        },
      };
    }

    return this.buscarHistoricoAluno(aluno.id);
  }
}
