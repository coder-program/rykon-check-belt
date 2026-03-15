import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnidadeAlunosSnapshot } from '../entities/unidade-alunos-snapshot.entity';
import { FranqueadoHistoricoEvento, TipoEvento } from '../entities/franqueado-historico-evento.entity';
import { Aluno, StatusAluno } from '../entities/aluno.entity';
import { FranqueadoContrato } from '../entities/franqueado-contrato.entity';

// ── DTOs inline (simples) ────────────────────────────────────────

export interface CreateEventoDto {
  franqueado_id: string;
  contrato_id?: string;
  tipo_evento: TipoEvento;
  descricao: string;
  usuario_responsavel?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSnapshotDto {
  unidade_id: string;
  franqueado_id?: string;
  contrato_id?: string;
  data_referencia: string;
  competencia?: string;
  total_alunos: number;
  total_alunos_ativos: number;
  total_alunos_inativos: number;
  total_professores?: number;
  total_checkins_mes?: number;
  usuarios_esperados?: number;
  receita_estimativa?: number;
  observacao?: string;
}

@Injectable()
export class FranqueadoFase3Service {
  constructor(
    @InjectRepository(UnidadeAlunosSnapshot)
    private snapshotRepo: Repository<UnidadeAlunosSnapshot>,

    @InjectRepository(FranqueadoHistoricoEvento)
    private eventoRepo: Repository<FranqueadoHistoricoEvento>,

    @InjectRepository(Aluno)
    private alunoRepo: Repository<Aluno>,

    @InjectRepository(FranqueadoContrato)
    private contratoRepo: Repository<FranqueadoContrato>,
  ) {}

  // ── EVENTOS ──────────────────────────────────────────────────

  async registrarEvento(dto: CreateEventoDto): Promise<FranqueadoHistoricoEvento> {
    const evento = this.eventoRepo.create(dto as import('typeorm').DeepPartial<FranqueadoHistoricoEvento>);
    return this.eventoRepo.save(evento);
  }

  async findEventosByFranqueado(
    franqueadoId: string,
    limit = 50,
  ): Promise<FranqueadoHistoricoEvento[]> {
    return this.eventoRepo.find({
      where: { franqueado_id: franqueadoId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async findEventosByContrato(contratoId: string): Promise<FranqueadoHistoricoEvento[]> {
    return this.eventoRepo.find({
      where: { contrato_id: contratoId },
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  // ── SNAPSHOTS ────────────────────────────────────────────────

  async createSnapshot(dto: CreateSnapshotDto): Promise<UnidadeAlunosSnapshot> {
    const percentual =
      dto.usuarios_esperados && dto.usuarios_esperados > 0
        ? Math.round((dto.total_alunos_ativos / dto.usuarios_esperados) * 10000) / 100
        : null;

    const snap = this.snapshotRepo.create({
      ...dto,
      percentual_ocupacao: percentual,
    } as import('typeorm').DeepPartial<UnidadeAlunosSnapshot>);

    return this.snapshotRepo.save(snap);
  }

  /**
   * Gera um snapshot on-demand para uma unidade, buscando dados reais de alunos.
   */
  async gerarSnapshotManual(
    unidadeId: string,
    franqueadoId?: string,
    contratoId?: string,
  ): Promise<UnidadeAlunosSnapshot> {
    // Contar alunos ativos e inativos
    const [totalAtivos, totalInativos] = await Promise.all([
      this.alunoRepo.count({ where: { unidade_id: unidadeId, status: StatusAluno.ATIVO } }),
      this.alunoRepo.count({ where: { unidade_id: unidadeId, status: StatusAluno.INATIVO } }),
    ]);

    const totalAlunos = totalAtivos + totalInativos;

    // Buscar usuários esperados do contrato se disponível
    let usuariosEsperados: number | null = null;
    if (contratoId) {
      const contrato = await this.contratoRepo.findOne({ where: { id: contratoId } });
      usuariosEsperados = contrato?.usuarios_ativos_esperados ?? null;
    }

    const hoje = new Date();
    const dataReferencia = hoje.toISOString().split('T')[0];
    const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    const dto: CreateSnapshotDto = {
      unidade_id: unidadeId,
      franqueado_id: franqueadoId,
      contrato_id: contratoId,
      data_referencia: dataReferencia,
      competencia,
      total_alunos: totalAlunos,
      total_alunos_ativos: totalAtivos,
      total_alunos_inativos: totalInativos,
      total_professores: 0,
      total_checkins_mes: 0,
      usuarios_esperados: usuariosEsperados ?? undefined,
      origem: 'MANUAL',
    } as CreateSnapshotDto & { origem: string };

    return this.createSnapshot(dto);
  }

  async getSnapshotsByUnidade(
    unidadeId: string,
    limit = 12,
  ): Promise<UnidadeAlunosSnapshot[]> {
    return this.snapshotRepo.find({
      where: { unidade_id: unidadeId },
      order: { data_referencia: 'DESC' },
      take: limit,
    });
  }

  /**
   * Retorna evolução mensal de alunos para gráfico (últimos N meses).
   */
  async getEvolucaoAlunos(
    unidadeId: string,
    meses = 12,
  ): Promise<{ competencia: string; ativos: number; inativos: number; total: number }[]> {
    const snaps = await this.snapshotRepo.find({
      where: { unidade_id: unidadeId },
      order: { data_referencia: 'ASC' },
      take: meses,
    });

    return snaps.map((s) => ({
      competencia: s.competencia ?? s.data_referencia,
      ativos: s.total_alunos_ativos,
      inativos: s.total_alunos_inativos,
      total: s.total_alunos,
    }));
  }

  /**
   * Retorna snapshots de todas as unidades de um franqueado.
   */
  async getSnapshotsByFranqueado(franqueadoId: string): Promise<UnidadeAlunosSnapshot[]> {
    // último snapshot por unidade
    const result = await this.snapshotRepo
      .createQueryBuilder('snap')
      .where('snap.franqueado_id = :franqueadoId', { franqueadoId })
      .orderBy('snap.data_referencia', 'DESC')
      .getMany();

    // Deduplica: mantém apenas o snapshot mais recente por unidade
    const seen = new Set<string>();
    return result.filter((s) => {
      if (seen.has(s.unidade_id)) return false;
      seen.add(s.unidade_id);
      return true;
    });
  }

  /**
   * Gera snapshots para todas as unidades vinculadas a um contrato de franqueado.
   */
  async gerarSnapshotsPorContrato(contratoId: string): Promise<{ gerados: number; erros: string[] }> {
    const contrato = await this.contratoRepo.findOne({ where: { id: contratoId } });
    if (!contrato) throw new NotFoundException('Contrato não encontrado');

    // Buscar unidades pelo franqueado_id (a partir da relação franqueados -> unidades)
    // Usamos uma query raw para não precisar injetar mais repositórios
    const unidades: { id: string }[] = await this.snapshotRepo.query(
      `SELECT id FROM unidades WHERE franqueado_id = $1`,
      [contrato.franqueado_id],
    );

    let gerados = 0;
    const erros: string[] = [];

    for (const u of unidades) {
      try {
        await this.gerarSnapshotManual(u.id, contrato.franqueado_id, contratoId);
        gerados++;
      } catch (err: unknown) {
        erros.push(`Unidade ${u.id}: ${(err as Error).message}`);
      }
    }

    return { gerados, erros };
  }
}

