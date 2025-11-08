import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Aula } from './entities/aula.entity';
import { Turma } from './entities/turma.entity';
import { CreateAulaDto, UpdateAulaDto } from './dto/aula.dto';

@Injectable()
export class AulaService {
  constructor(
    @InjectRepository(Aula)
    private readonly aulaRepository: Repository<Aula>,
    @InjectRepository(Turma)
    private readonly turmaRepository: Repository<Turma>,
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

    const aula = this.aulaRepository.create({
      ...createAulaDto,
      turma_id,
      data_hora_inicio: createAulaDto.data_hora_inicio
        ? new Date(createAulaDto.data_hora_inicio)
        : undefined,
      data_hora_fim: createAulaDto.data_hora_fim
        ? new Date(createAulaDto.data_hora_fim)
        : undefined,
    });

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

    console.log('📊 [AULAS HOJE]', {
      unidade_id,
      dia_semana: diaSemanaHoje,
      count,
    });

    return count;
  }
}
