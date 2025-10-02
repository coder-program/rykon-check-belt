import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Aluno, StatusAluno, FaixaEnum } from '../entities/aluno.entity';
import { CreateAlunoDto } from '../dto/create-aluno.dto';
import { UpdateAlunoDto } from '../dto/update-aluno.dto';
import { FaixaDef } from '../../graduacao/entities/faixa-def.entity';
import { AlunoFaixa } from '../../graduacao/entities/aluno-faixa.entity';
import { AlunoFaixaGrau, OrigemGrau } from '../../graduacao/entities/aluno-faixa-grau.entity';

interface ListAlunosParams {
  page?: number;
  pageSize?: number;
  search?: string;
  unidade_id?: string;
  status?: StatusAluno;
  faixa?: string;
}

@Injectable()
export class AlunosService {
  constructor(
    @InjectRepository(Aluno)
    private readonly alunoRepository: Repository<Aluno>,
    @InjectRepository(FaixaDef)
    private readonly faixaDefRepository: Repository<FaixaDef>,
    @InjectRepository(AlunoFaixa)
    private readonly alunoFaixaRepository: Repository<AlunoFaixa>,
    @InjectRepository(AlunoFaixaGrau)
    private readonly alunoFaixaGrauRepository: Repository<AlunoFaixaGrau>,
    private dataSource: DataSource,
  ) {}

  async list(params: ListAlunosParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const query = this.alunoRepository.createQueryBuilder('aluno');

    query.leftJoinAndSelect('aluno.unidade', 'unidade');

    // Busca por nome ou CPF
    if (params.search) {
      query.andWhere(
        '(LOWER(aluno.nome_completo) LIKE :search OR aluno.cpf LIKE :search OR aluno.numero_matricula LIKE :search)',
        { search: `%${params.search.toLowerCase()}%` },
      );
    }

    // Filtro por unidade
    if (params.unidade_id) {
      query.andWhere('aluno.unidade_id = :unidade', {
        unidade: params.unidade_id,
      });
    }

    // Filtro por status
    if (params.status) {
      query.andWhere('aluno.status = :status', { status: params.status });
    }

    // Filtro por faixa
    if (params.faixa && params.faixa !== 'todos') {
      query.andWhere('aluno.faixa_atual = :faixa', { faixa: params.faixa });
    }

    // Ordenar por data de matrícula (mais recentes primeiro)
    query.orderBy('aluno.data_matricula', 'DESC');

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

  async findById(id: string): Promise<Aluno> {
    const aluno = await this.alunoRepository.findOne({
      where: { id },
      relations: ['unidade', 'faixas', 'graduacoes'],
    });

    if (!aluno) {
      throw new NotFoundException(`Aluno com ID ${id} não encontrado`);
    }

    return aluno;
  }

  async create(dto: CreateAlunoDto): Promise<Aluno> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar se CPF já existe
      const existingAluno = await this.alunoRepository.findOne({
        where: { cpf: dto.cpf },
      });

      if (existingAluno) {
        throw new ConflictException('CPF já cadastrado');
      }

      // 2. Validar se é menor de idade e tem responsável
      const dataNascimento = new Date(dto.data_nascimento);
      const idade = this.calcularIdade(dataNascimento);
      
      if (idade < 18) {
        if (!dto.responsavel_nome || !dto.responsavel_cpf || !dto.responsavel_telefone) {
          throw new BadRequestException(
            'Para alunos menores de 18 anos é obrigatório informar os dados do responsável',
          );
        }
      }

      // 3. Criar aluno na tabela alunos
      const alunoData: any = {
        ...dto,
        status: dto.status || StatusAluno.ATIVO,
        faixa_atual: dto.faixa_atual || FaixaEnum.BRANCA,
        graus: dto.graus || 0,
        data_matricula: dto.data_matricula ? new Date(dto.data_matricula) : new Date(),
        data_nascimento: new Date(dto.data_nascimento),
        data_ultima_graduacao: dto.data_ultima_graduacao ? new Date(dto.data_ultima_graduacao) : undefined,
      };

      const aluno = this.alunoRepository.create(alunoData);
      const savedAluno: any = await queryRunner.manager.save(aluno);

      // 4. Buscar a definição da faixa
      const faixaDef = await this.buscarFaixaDef(dto.faixa_atual || FaixaEnum.BRANCA, idade, queryRunner);

      if (!faixaDef) {
        throw new BadRequestException('Faixa inválida para a idade do aluno');
      }

      // 5. Criar registro em aluno_faixa
      const alunoFaixa = queryRunner.manager.create(AlunoFaixa, {
        aluno_id: savedAluno.id,
        faixa_def_id: faixaDef.id,
        ativa: true,
        dt_inicio: new Date(),
        graus_atual: dto.graus || 0,
        presencas_no_ciclo: 0,
        presencas_total_fx: 0,
      });

      const savedAlunoFaixa = await queryRunner.manager.save(AlunoFaixa, alunoFaixa);

      // 6. Criar registros de graus em aluno_faixa_grau (se houver graus)
      if (dto.graus && dto.graus > 0) {
        for (let i = 1; i <= dto.graus; i++) {
          const grau = queryRunner.manager.create(AlunoFaixaGrau, {
            aluno_faixa_id: savedAlunoFaixa.id,
            grau_num: i,
            dt_concessao: new Date(),
            origem: OrigemGrau.MANUAL,
            observacao: 'Grau inicial do cadastro',
          });

          await queryRunner.manager.save(AlunoFaixaGrau, grau);
        }
      }

      await queryRunner.commitTransaction();

      // Retornar aluno com relações
      return this.findById(savedAluno.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, dto: UpdateAlunoDto): Promise<Aluno> {
    const aluno = await this.findById(id);

    // Verificar CPF único (se estiver sendo alterado)
    if (dto.cpf && dto.cpf !== aluno.cpf) {
      const existingAluno = await this.alunoRepository.findOne({
        where: { cpf: dto.cpf },
      });

      if (existingAluno) {
        throw new ConflictException('CPF já cadastrado');
      }
    }

    // Validar responsável se for menor de idade
    if (dto.data_nascimento) {
      const dataNascimento = new Date(dto.data_nascimento);
      const idade = this.calcularIdade(dataNascimento);
      
      if (idade < 18) {
        const responsavelNome = dto.responsavel_nome || aluno.responsavel_nome;
        const responsavelCpf = dto.responsavel_cpf || aluno.responsavel_cpf;
        const responsavelTelefone = dto.responsavel_telefone || aluno.responsavel_telefone;

        if (!responsavelNome || !responsavelCpf || !responsavelTelefone) {
          throw new BadRequestException(
            'Para alunos menores de 18 anos é obrigatório informar os dados do responsável',
          );
        }
      }
    }

    // Atualizar os dados
    Object.assign(aluno, {
      ...dto,
      data_nascimento: dto.data_nascimento ? new Date(dto.data_nascimento) : aluno.data_nascimento,
      data_matricula: dto.data_matricula ? new Date(dto.data_matricula) : aluno.data_matricula,
      data_ultima_graduacao: dto.data_ultima_graduacao ? new Date(dto.data_ultima_graduacao) : aluno.data_ultima_graduacao,
    });

    await this.alunoRepository.save(aluno);

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const aluno = await this.findById(id);
    await this.alunoRepository.softRemove(aluno);
  }

  /**
   * Busca a definição da faixa apropriada baseada no código e idade
   */
  private async buscarFaixaDef(
    faixaCodigo: FaixaEnum,
    idade: number,
    queryRunner?: any,
  ): Promise<FaixaDef | null> {
    const repository = queryRunner 
      ? queryRunner.manager.getRepository(FaixaDef)
      : this.faixaDefRepository;

    // Determinar categoria baseada na idade
    const categoria = idade < 16 ? 'INFANTIL' : 'ADULTO';

    // Buscar faixa específica
    let faixaDef = await repository.findOne({
      where: {
        codigo: faixaCodigo,
        categoria,
        ativo: true,
      },
    });

    // Se não encontrou, buscar faixa BRANCA como fallback
    if (!faixaDef && faixaCodigo !== FaixaEnum.BRANCA) {
      faixaDef = await repository.findOne({
        where: {
          codigo: FaixaEnum.BRANCA,
          categoria,
          ativo: true,
        },
      });
    }

    return faixaDef;
  }

  /**
   * Calcula a idade baseada na data de nascimento
   */
  private calcularIdade(dataNascimento: Date): number {
    const hoje = new Date();
    let idade = hoje.getFullYear() - dataNascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = dataNascimento.getMonth();

    if (
      mesAtual < mesNascimento ||
      (mesAtual === mesNascimento && hoje.getDate() < dataNascimento.getDate())
    ) {
      idade--;
    }

    return idade;
  }

  /**
   * Busca aluno por CPF
   */
  async findByCpf(cpf: string): Promise<Aluno | null> {
    return this.alunoRepository.findOne({
      where: { cpf },
      relations: ['unidade', 'faixas'],
    });
  }

  /**
   * Busca aluno por número de matrícula
   */
  async findByMatricula(numero_matricula: string): Promise<Aluno | null> {
    return this.alunoRepository.findOne({
      where: { numero_matricula },
      relations: ['unidade', 'faixas'],
    });
  }
}
