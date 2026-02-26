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
      modalidade_id: createAulaDto.modalidade_id,
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
      .leftJoinAndSelect('aula.professor', 'professor')
      .leftJoinAndSelect('aula.modalidade', 'modalidade');

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
      .leftJoinAndSelect('aula.modalidade', 'modalidade')
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
      relations: ['unidade', 'professor', 'modalidade'],
    });

    if (!aula) {
      throw new NotFoundException(`Aula com ID ${id} não encontrada`);
    }

    return aula;
  }

  async update(id: string, updateAulaDto: UpdateAulaDto): Promise<Aula> {
    const aula = await this.findOne(id);
    const dadosAntes = {
      professor_id: aula.professor_id,
      nome: aula.nome,
      dia_semana: aula.dia_semana,
    };

    // Preparar dados para atualização
    const updateData: any = {
      ...updateAulaDto,
      data_hora_inicio: updateAulaDto.data_hora_inicio
        ? new Date(updateAulaDto.data_hora_inicio)
        : aula.data_hora_inicio,
      data_hora_fim: updateAulaDto.data_hora_fim
        ? new Date(updateAulaDto.data_hora_fim)
        : aula.data_hora_fim,
    };

    // Usar update() ao invés de save() para forçar UPDATE no banco
    const updateResult = await this.aulaRepository.update(id, updateData);
    
    // 🔍 QUERY RAW para verificar o que REALMENTE está no banco
    const queryRaw = await this.aulaRepository.manager.query(
      `SELECT id, nome, professor_id, dia_semana, updated_at 
       FROM teamcruz.aulas 
       WHERE id = $1`,
      [id]
    );
    // Limpar cache do TypeORM e recarregar
    await this.aulaRepository.manager.connection.queryResultCache?.remove(['aula_' + id]);
    
    const aulaAtualizada = await this.findOne(id);

    return aulaAtualizada;
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
    return aulas.map((aula, index) => {
      // Extrair horários dos timestamps usando toLocaleString
      let horarioInicio = aula.hora_inicio; // Fallback
      let horarioFim = aula.hora_fim; // Fallback
      
      if (aula.data_hora_inicio) {
        const horaStr = aula.data_hora_inicio.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        horarioInicio = horaStr.split(':').slice(0, 2).join(':');
      }
      
      if (aula.data_hora_fim) {
        const horaStr = aula.data_hora_fim.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        horarioFim = horaStr.split(':').slice(0, 2).join(':');
      }

      return {
        id: aula.id,
        nome: aula.nome,
        descricao: aula.descricao,
        professor: aula.professor?.nome_completo || 'A definir',
        unidade: aula.unidade?.nome || 'Unidade',
        diaSemana: this.getDiaSemanaStr(aula.dia_semana),
        horarioInicio,
        horarioFim,
        tipo: aula.tipo,
        nivel: 'Todos', // TODO: adicionar nível na entity se necessário
        modalidade:
          aula.tipo === 'GI' ? 'Gi' : aula.tipo === 'NO_GI' ? 'NoGi' : 'Misto',
        vagasDisponiveis: aula.capacidade_maxima, // TODO: calcular baseado em inscrições
        vagasTotal: aula.capacidade_maxima,
        inscrito: false, // TODO: verificar se usuário está inscrito
        ativo: aula.ativo,
      };
    });
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

    // Se não forneceu unidadeId, detectar automaticamente baseado no usuário
    let unidadeFiltro = unidadeId;
    let unidadesFranqueado: string[] = [];

    const perfis =
      user?.perfis?.map((p: any) =>
        (typeof p === 'string' ? p : p.nome)?.toUpperCase(),
      ) || [];
    const isFranqueado = perfis.includes('FRANQUEADO');
    const isMaster = perfis.includes('MASTER') || perfis.includes('ADMIN');
    const isGerente = perfis.includes('GERENTE_UNIDADE');

    if (!unidadeFiltro && user) {
      if (!isMaster) {
        if (isFranqueado) {
          // Franqueado: buscar unidades do franqueado
          const unidadesResult = await this.aulaRepository.manager.query(
            `SELECT id FROM teamcruz.unidades WHERE franqueado_id =
             (SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1)`,
            [user.id],
          );

          // Franqueado sem unidades - retornar vazio
          if (unidadesResult.length === 0) {
            return [];
          }

          // 🔥 Se não especificou unidade, buscar de TODAS as unidades do franqueado
          unidadesFranqueado = unidadesResult.map((u: any) => u.id);
        } else if (isGerente) {
          // Gerente: buscar unidade que ele gerencia
          const unidadeResult = await this.aulaRepository.manager.query(
            `SELECT unidade_id FROM teamcruz.gerente_unidades WHERE usuario_id = $1 AND ativo = true LIMIT 1`,
            [user.id],
          );
          if (unidadeResult.length > 0) {
            unidadeFiltro = unidadeResult[0].unidade_id;
          }
        }
      }
    }

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
      INNER JOIN teamcruz.professor_unidades pu ON pu.professor_id = prof.id AND pu.ativo = true
      LEFT JOIN teamcruz.aulas aula ON aula.professor_id = prof.id
        AND aula.data_hora_inicio >= $1
        AND aula.ativo = true
      WHERE prof.status = 'ATIVO'
    `;

    const params: any[] = [dataLimite];

    if (unidadeFiltro) {
      query += ` AND pu.unidade_id = $2`;
      params.push(unidadeFiltro);
    } else if (unidadesFranqueado.length > 0) {
      // 🔥 Filtrar por múltiplas unidades do franqueado
      query += ` AND pu.unidade_id = ANY($2::uuid[])`;
      params.push(unidadesFranqueado);
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
