import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Person,
  TipoCadastro,
  StatusCadastro,
} from '../entities/person.entity';
import { CreatePersonDto } from '../dto/create-person.dto';
import { UpdatePersonDto } from '../dto/update-person.dto';
import { FilterPersonDto } from '../dto/filter-person.dto';
import { FaixaDef } from '../../graduacao/entities/faixa-def.entity';
import { AlunoFaixa } from '../../graduacao/entities/aluno-faixa.entity';

@Injectable()
export class AlunosService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(FaixaDef)
    private readonly faixaDefRepository: Repository<FaixaDef>,
    @InjectRepository(AlunoFaixa)
    private readonly alunoFaixaRepository: Repository<AlunoFaixa>,
    private dataSource: DataSource,
  ) {}

  async list(params: FilterPersonDto) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const query = this.personRepository.createQueryBuilder('person');

    // Filtrar por tipo de cadastro se especificado
    if (params.tipo_cadastro) {
      query.where('person.tipo_cadastro = :tipo', {
        tipo: params.tipo_cadastro,
      });
    } else {
      // Se não especificado, buscar tanto alunos quanto professores
      query.where('person.tipo_cadastro IN (:...tipos)', {
        tipos: [TipoCadastro.ALUNO, TipoCadastro.PROFESSOR],
      });
    }

    // Busca por nome ou CPF
    if (params.search) {
      query.andWhere(
        '(LOWER(person.nome_completo) LIKE :search OR person.cpf LIKE :search)',
        { search: `%${params.search.toLowerCase()}%` },
      );
    }

    // Filtro por faixa baseado na idade
    if (params.faixa && params.faixa !== 'todos') {
      if (params.faixa === 'kids') {
        // Kids: menores de 16 anos (calcular pela data de nascimento)
        query.andWhere(
          'EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM person.data_nascimento) < 16',
        );
      } else if (params.faixa === 'jovem') {
        // Jovem: 16-17 anos
        query.andWhere(
          'EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM person.data_nascimento) >= 16 AND EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM person.data_nascimento) < 18',
        );
      } else if (params.faixa === 'adulto') {
        // Adulto: 18 anos ou mais
        query.andWhere(
          'EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM person.data_nascimento) >= 18',
        );
      }
    }

    // Filtro por unidade
    if (params.unidade_id) {
      query.andWhere('person.unidade_id = :unidade', {
        unidade: params.unidade_id,
      });
    }

    // Filtro por status
    if (params.status) {
      query.andWhere('person.status = :status', { status: params.status });
    }

    // Paginação
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      page,
      pageSize,
      total,
      hasNextPage: page * pageSize < total,
    };
  }

  async create(dto: CreatePersonDto): Promise<Person> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar se CPF já existe
      const existingPerson = await this.personRepository.findOne({
        where: { cpf: dto.cpf },
      });

      if (existingPerson) {
        throw new ConflictException('CPF já cadastrado');
      }

      // Criar nova pessoa usando o tipo_cadastro do DTO
      const person = this.personRepository.create({
        ...dto,
        status: dto.status || StatusCadastro.ATIVO,
      });

      // Se for aluno, definir data_matricula
      if (dto.tipo_cadastro === TipoCadastro.ALUNO && !person.data_matricula) {
        person.data_matricula = new Date();
      }

      // Salvar a pessoa
      const savedPerson = await queryRunner.manager.save(person);

      // Se for aluno, criar registro na tabela aluno_faixa
      if (dto.tipo_cadastro === TipoCadastro.ALUNO) {
        await this.criarFaixaInicialAluno(savedPerson, queryRunner);
      }

      await queryRunner.commitTransaction();
      return savedPerson;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cria o registro inicial na tabela aluno_faixa quando um aluno é cadastrado
   */
  private async criarFaixaInicialAluno(person: Person, queryRunner: any) {
    // Buscar a definição da faixa baseada no que foi informado no cadastro
    let faixaDef: FaixaDef | null = null;

    if (person.faixa_atual) {
      faixaDef = await queryRunner.manager.findOne(FaixaDef, {
        where: {
          codigo: person.faixa_atual.toUpperCase(),
          ativo: true,
        },
      });
    }

    // Se não encontrou a faixa específica, usar faixa BRANCA como padrão
    if (!faixaDef) {
      faixaDef = await queryRunner.manager.findOne(FaixaDef, {
        where: {
          codigo: 'BRANCA',
          ativo: true,
        },
      });
    }

    // Se ainda não encontrou, criar um registro com faixa padrão
    if (!faixaDef) {
      // Buscar qualquer faixa ativa como fallback
      faixaDef = await queryRunner.manager.findOne(FaixaDef, {
        where: { ativo: true },
        order: { ordem: 'ASC' },
      });
    }

    if (faixaDef) {
      // Criar registro em aluno_faixa
      const alunoFaixa = queryRunner.manager.create(AlunoFaixa, {
        aluno_id: person.id,
        faixa_def_id: faixaDef.id,
        ativa: true,
        dt_inicio: new Date(),
        graus_atual: person.grau_atual || 0,
        presencas_no_ciclo: 0,
        presencas_total_fx: 0,
      });

      await queryRunner.manager.save(alunoFaixa);

      // Atualizar os campos de compatibilidade na tabela pessoas
      await queryRunner.manager.update(Person, person.id, {
        faixa_atual: faixaDef.codigo,
        grau_atual: person.grau_atual || 0,
      });
    }
  }

  async update(id: string, dto: UpdatePersonDto): Promise<Person> {
    const person = await this.personRepository.findOne({ where: { id } });

    if (!person) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // Se mudou o CPF, verificar se já não existe
    if (dto.cpf && dto.cpf !== person.cpf) {
      const existingPerson = await this.personRepository.findOne({
        where: { cpf: dto.cpf },
      });

      if (existingPerson) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    Object.assign(person, dto);
    return await this.personRepository.save(person);
  }

  async get(id: string): Promise<Person | null> {
    return await this.personRepository.findOne({
      where: { id, tipo_cadastro: TipoCadastro.ALUNO },
    });
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.personRepository.delete({
      id,
      tipo_cadastro: TipoCadastro.ALUNO,
    });
    return (result.affected ?? 0) > 0;
  }
}
