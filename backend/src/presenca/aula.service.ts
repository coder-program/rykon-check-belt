import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aula } from './entities/aula.entity';
import { Turma } from './entities/turma.entity';
import { Presenca } from './entities/presenca.entity';
import { CreateAulaDto, UpdateAulaDto } from './dto/aula.dto';

@Injectable()
export class AulaService {
  constructor(
    @InjectRepository(Aula)
    private readonly aulaRepository: Repository<Aula>,
    @InjectRepository(Turma)
    private readonly turmaRepository: Repository<Turma>,
    @InjectRepository(Presenca)
    private readonly presencaRepository: Repository<Presenca>,
  ) {}

  async create(createAulaDto: CreateAulaDto): Promise<Aula> {
    let turma_id = createAulaDto.turma_id;

    // Se não foi fornecida uma turma, criar uma automaticamente
    if (!turma_id) {
      const turma = this.turmaRepository.create({
        nome: `Turma - ${createAulaDto.nome}`,
        tipo_turma: 'REGULAR',
        descricao: `Turma criada automaticamente para a aula ${createAulaDto.nome}`,
        unidade_id: createAulaDto.unidade_id,
        professor_id: createAulaDto.professor_id,
        capacidade: createAulaDto.capacidade_maxima || 30,
      });

      const savedTurma = await this.turmaRepository.save(turma);
      turma_id = savedTurma.id;
    }

    // CONSTRAINT: chk_aulas_horario_completo
    // Aula recorrente: dia_semana + data_hora_inicio + data_hora_fim (horários no dia da semana)
    // Aula pontual: apenas data_hora_inicio + data_hora_fim (data/hora específica)
    const aula = this.aulaRepository.create({
      nome: createAulaDto.nome,
      descricao: createAulaDto.descricao,
      unidade_id: createAulaDto.unidade_id,
      turma_id,
      professor_id: createAulaDto.professor_id,
      tipo: createAulaDto.tipo,
      dia_semana: createAulaDto.dia_semana,
      data_hora_inicio: createAulaDto.data_hora_inicio
        ? new Date(createAulaDto.data_hora_inicio)
        : null,
      data_hora_fim: createAulaDto.data_hora_fim
        ? new Date(createAulaDto.data_hora_fim)
        : null,
      capacidade_maxima: createAulaDto.capacidade_maxima,
      ativo: createAulaDto.ativo ?? true,
      configuracoes: createAulaDto.configuracoes,
    } as Partial<Aula>);

    const saved = await this.aulaRepository.save(aula);

    return this.findOne(saved.id);
  }

  async findAll(params?: {
    unidade_id?: string;
    ativo?: boolean;
    dia_semana?: number;
  }): Promise<Aula[]> {
    const query = this.aulaRepository
      .createQueryBuilder('aula')
      .leftJoinAndSelect('aula.unidade', 'unidade')
      .leftJoinAndSelect('aula.professor', 'professor');

    if (params?.unidade_id) {
      query.andWhere('aula.unidade_id = :unidade_id', {
        unidade_id: params.unidade_id,
      });
    }

    if (params?.ativo !== undefined) {
      query.andWhere('aula.ativo = :ativo', { ativo: params.ativo });
    }

    if (params?.dia_semana !== undefined) {
      query.andWhere('aula.dia_semana = :dia_semana', {
        dia_semana: params.dia_semana,
      });
    }

    query
      .orderBy('aula.dia_semana', 'ASC')
      .addOrderBy('aula.data_hora_inicio', 'ASC');

    const aulas = await query.getMany();

    return aulas;
  }

  async findAllByUnidades(
    unidadeIds: string[],
    params?: {
      ativo?: boolean;
      dia_semana?: number;
    },
  ): Promise<Aula[]> {
    if (!unidadeIds || unidadeIds.length === 0) {
      return [];
    }

    const query = this.aulaRepository
      .createQueryBuilder('aula')
      .leftJoinAndSelect('aula.unidade', 'unidade')
      .leftJoinAndSelect('aula.professor', 'professor')
      .where('aula.unidade_id IN (:...unidadeIds)', { unidadeIds });

    if (params?.ativo !== undefined) {
      query.andWhere('aula.ativo = :ativo', { ativo: params.ativo });
    }

    if (params?.dia_semana !== undefined) {
      query.andWhere('aula.dia_semana = :dia_semana', {
        dia_semana: params.dia_semana,
      });
    }

    query
      .orderBy('aula.dia_semana', 'ASC')
      .addOrderBy('aula.data_hora_inicio', 'ASC');

    const aulas = await query.getMany();

    return aulas;
  }

  async findOne(id: string): Promise<Aula> {
    const aula = await this.aulaRepository.findOne({
      where: { id },
      relations: ['unidade', 'professor'],
    });

    if (!aula) {
      throw new NotFoundException(`Aula com ID ${id} não encontrada`);
    }

    return aula;
  }

  async update(id: string, updateAulaDto: UpdateAulaDto): Promise<Aula> {
    const aula = await this.findOne(id);

    Object.assign(aula, {
      ...updateAulaDto,
      data_hora_inicio: updateAulaDto.data_hora_inicio
        ? new Date(updateAulaDto.data_hora_inicio)
        : aula.data_hora_inicio,
      data_hora_fim: updateAulaDto.data_hora_fim
        ? new Date(updateAulaDto.data_hora_fim)
        : aula.data_hora_fim,
    });

    await this.aulaRepository.save(aula);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const aula = await this.findOne(id);

    // Verificar se existem presenças registradas para esta aula
    const presencasCount = await this.presencaRepository.count({
      where: { aula_id: id },
    });

    if (presencasCount > 0) {
      // Se existem presenças, desativa ao invés de deletar
      aula.ativo = false;
      await this.aulaRepository.save(aula);
      return;
    }

    // Se não há presenças, pode deletar
    await this.aulaRepository.remove(aula);
  }

  async findHorariosDisponiveis(unidade_id?: string): Promise<any[]> {
    const aulas = await this.findAll({
      unidade_id,
      ativo: true,
    });

    // Mapear para formato do frontend
    return aulas.map((aula) => ({
      id: aula.id,
      nome: aula.nome,
      descricao: aula.descricao,
      professor: aula.professor?.nome_completo || 'A definir',
      unidade: aula.unidade?.nome || 'Unidade',
      diaSemana: this.getDiaSemanaStr(aula.dia_semana),
      horarioInicio: aula.hora_inicio,
      horarioFim: aula.hora_fim,
      tipo: aula.tipo,
      nivel: 'Todos', // TODO: adicionar nível na entity se necessário
      modalidade:
        aula.tipo === 'GI' ? 'Gi' : aula.tipo === 'NO_GI' ? 'NoGi' : 'Misto',
      vagasDisponiveis: aula.capacidade_maxima, // TODO: calcular baseado em inscrições
      vagasTotal: aula.capacidade_maxima,
      inscrito: false, // TODO: verificar se usuário está inscrito
      ativo: aula.ativo,
    }));
  }

  private getDiaSemanaStr(dia: number): string {
    const dias = [
      'domingo',
      'segunda',
      'terca',
      'quarta',
      'quinta',
      'sexta',
      'sabado',
    ];
    return dias[dia] || 'todos';
  }

  async countHoje(unidade_id?: string): Promise<number> {
    const hoje = new Date();
    const diaSemanaHoje = hoje.getDay(); // 0 = domingo, 1 = segunda, etc

    const query = this.aulaRepository
      .createQueryBuilder('aula')
      .where('aula.ativo = :ativo', { ativo: true })
      .andWhere('aula.dia_semana = :dia_semana', { dia_semana: diaSemanaHoje });

    if (unidade_id) {
      query.andWhere('aula.unidade_id = :unidade_id', { unidade_id });
    }

    const count = await query.getCount();

    return count;
  }

  async findAulasHoje(unidadeIds?: string | string[]): Promise<Aula[]> {
    const hoje = new Date();
    const diaSemanaHoje = hoje.getDay(); // 0 = domingo, 1 = segunda, etc

    const query = this.aulaRepository
      .createQueryBuilder('aula')
      .leftJoinAndSelect('aula.unidade', 'unidade')
      .leftJoinAndSelect('aula.professor', 'professor')
      .leftJoinAndSelect('aula.turma', 'turma')
      .where('aula.ativo = :ativo', { ativo: true })
      .andWhere('aula.dia_semana = :dia_semana', { dia_semana: diaSemanaHoje });

    if (unidadeIds) {
      if (Array.isArray(unidadeIds)) {
        query.andWhere('aula.unidade_id IN (:...unidadeIds)', { unidadeIds });
      } else {
        query.andWhere('aula.unidade_id = :unidadeId', {
          unidadeId: unidadeIds,
        });
      }
    }

    query
      .orderBy('aula.data_hora_inicio', 'ASC')
      .addOrderBy('aula.nome', 'ASC');

    const aulas = await query.getMany();

    return aulas;
  }

  async getAulasPorProfessor(user: any, unidadeId?: string) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    // Query para buscar professores com total de aulas
    let query = `
      SELECT
        prof.id,
        prof.usuario_id,
        u.nome as nome_completo,
        prof.faixa_ministrante as faixa_nome,
        COUNT(DISTINCT aula.id) as total_aulas,
        COUNT(DISTINCT DATE(aula.data_hora_inicio)) as dias_trabalho,
        ROUND(COUNT(DISTINCT aula.id)::numeric / 4.0, 1) as media_aulas_semana,
        ARRAY_AGG(DISTINCT aula.tipo) FILTER (WHERE aula.tipo IS NOT NULL) as modalidades
      FROM teamcruz.professores prof
      INNER JOIN teamcruz.usuarios u ON u.id = prof.usuario_id
      LEFT JOIN teamcruz.aulas aula ON aula.professor_id = prof.id
        AND aula.data_hora_inicio >= $1
        AND aula.ativo = true
      WHERE prof.status = 'ATIVO'
    `;

    const params: any[] = [dataLimite];

    if (unidadeId) {
      query += ` AND prof.unidade_id = $2`;
      params.push(unidadeId);
    }

    query += `
      GROUP BY prof.id, prof.usuario_id, u.nome, prof.faixa_ministrante
      HAVING COUNT(DISTINCT aula.id) > 0
      ORDER BY total_aulas DESC, u.nome ASC
      LIMIT 20
    `;

    const resultado = await this.aulaRepository.manager.query(query, params);

    return resultado.map((r: any) => ({
      id: r.id,
      nome: r.nome_completo,
      faixa: {
        nome: r.faixa_nome || 'Não definida',
      },
      totalAulas: parseInt(r.total_aulas) || 0,
      diasTrabalho: parseInt(r.dias_trabalho) || 0,
      mediaAulasSemana: parseFloat(r.media_aulas_semana) || 0,
      modalidades: r.modalidades || [],
    }));
  }
}
