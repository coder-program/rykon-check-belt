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
import {
  FaixaDef,
  CategoriaFaixa,
} from '../../graduacao/entities/faixa-def.entity';
import { AlunoFaixa } from '../../graduacao/entities/aluno-faixa.entity';
import {
  AlunoFaixaGrau,
  OrigemGrau,
} from '../../graduacao/entities/aluno-faixa-grau.entity';

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
    query.leftJoinAndSelect('aluno.faixas', 'faixas', 'faixas.ativa = :ativa', {
      ativa: true,
    });
    query.leftJoinAndSelect('faixas.faixaDef', 'faixaDef');

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
      relations: ['unidade'], // Removendo relações problemáticas temporariamente
    });

    if (!aluno) {
      throw new NotFoundException(`Aluno com ID ${id} não encontrado`);
    }

    return aluno;
  }

  async findByUsuarioId(usuarioId: string): Promise<Aluno | null> {
    const aluno = await this.alunoRepository.findOne({
      where: { usuario_id: usuarioId },
      relations: ['unidade'],
    });

    return aluno || null;
  }

  async create(dto: CreateAlunoDto): Promise<Aluno> {
    console.log('🔵 [AlunosService.create] Iniciando criação de aluno...');
    console.log(
      '🔵 [AlunosService.create] DTO recebido:',
      JSON.stringify(dto, null, 2),
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    console.log('🔵 [AlunosService.create] Transação iniciada');

    let savedAluno: any;

    try {
      // 1. Verificar se CPF já existe
      console.log(
        '🔵 [AlunosService.create] Verificando CPF existente:',
        dto.cpf,
      );
      const existingAluno = await this.alunoRepository.findOne({
        where: { cpf: dto.cpf },
      });

      if (existingAluno) {
        console.error('❌ [AlunosService.create] CPF já cadastrado:', dto.cpf);
        throw new ConflictException('CPF já cadastrado');
      }
      console.log('✅ [AlunosService.create] CPF OK (não existe duplicata)');

      // 2. Validar se é menor de idade e tem responsável
      console.log('🔵 [AlunosService.create] Validando idade e responsável...');
      const dataNascimento = new Date(dto.data_nascimento);
      const idade = this.calcularIdade(dataNascimento);
      console.log('🔵 [AlunosService.create] Idade calculada:', idade);

      if (idade < 18) {
        console.log(
          '🔵 [AlunosService.create] Aluno menor de idade, validando responsável...',
        );
        if (
          !dto.responsavel_nome ||
          !dto.responsavel_cpf ||
          !dto.responsavel_telefone
        ) {
          console.error(
            '❌ [AlunosService.create] Dados do responsável incompletos para menor de idade',
          );
          throw new BadRequestException(
            'Para alunos menores de 18 anos é obrigatório informar os dados do responsável',
          );
        }
        console.log('✅ [AlunosService.create] Dados do responsável OK');
      }

      // 3. Preparar dados do aluno
      console.log('🔵 [AlunosService.create] Preparando dados do aluno...');
      const alunoData: any = {
        ...dto,
        status: dto.status || StatusAluno.ATIVO,
        faixa_atual: dto.faixa_atual || FaixaEnum.BRANCA,
        graus: dto.graus || 0,
        data_matricula: dto.data_matricula
          ? new Date(dto.data_matricula)
          : new Date(),
        data_nascimento: new Date(dto.data_nascimento),
        data_ultima_graduacao: dto.data_ultima_graduacao
          ? new Date(dto.data_ultima_graduacao)
          : undefined,
      };
      console.log(
        '🔵 [AlunosService.create] alunoData preparado:',
        JSON.stringify(alunoData, null, 2),
      );

      console.log('🔵 [AlunosService.create] Criando entidade aluno...');
      const aluno = queryRunner.manager.create(Aluno, alunoData);
      console.log('🔵 [AlunosService.create] Salvando aluno no banco...');
      savedAluno = await queryRunner.manager.save(Aluno, aluno);
      console.log(
        '✅ [AlunosService.create] Aluno salvo com ID:',
        savedAluno.id,
      );

      // 4. Buscar a definição da faixa
      console.log(
        '🔵 [AlunosService.create] Buscando definição da faixa:',
        dto.faixa_atual || FaixaEnum.BRANCA,
      );
      let faixaDef = await this.buscarFaixaDef(
        dto.faixa_atual || FaixaEnum.BRANCA,
        idade,
        queryRunner,
      );

      if (!faixaDef) {
        console.warn(
          '⚠️ [AlunosService.create] Faixa não encontrada para a idade, permitindo cadastro com faixa solicitada:',
          idade,
          'Faixa solicitada:',
          dto.faixa_atual || FaixaEnum.BRANCA,
        );

        // Para o complete-profile, vamos permitir qualquer faixa e criar uma definição temporária se necessário
        const categoria =
          idade < 16 ? CategoriaFaixa.INFANTIL : CategoriaFaixa.ADULTO;
        const faixaDefRepository = queryRunner.manager.getRepository(FaixaDef);

        let tempFaixaDef = await faixaDefRepository.findOne({
          where: {
            codigo: dto.faixa_atual || FaixaEnum.BRANCA,
            categoria,
            ativo: true,
          },
        });

        // Se ainda não encontrou, criar uma entrada básica temporária
        if (!tempFaixaDef) {
          console.warn(
            '⚠️ [AlunosService.create] Criando definição de faixa temporária para:',
            dto.faixa_atual || FaixaEnum.BRANCA,
          );
          const novaFaixaDef = faixaDefRepository.create({
            codigo: dto.faixa_atual || FaixaEnum.BRANCA,
            nome_exibicao: (dto.faixa_atual || FaixaEnum.BRANCA).replace(
              '_',
              ' ',
            ),
            categoria,
            ordem: 1,
            cor_hex: '#FFFFFF',
            graus_max: 4,
            aulas_por_grau: 40,
            ativo: true,
          });
          tempFaixaDef = await faixaDefRepository.save(novaFaixaDef);
          console.log(
            '✅ [AlunosService.create] Faixa temporária criada com ID:',
            tempFaixaDef.id,
          );
        }

        // Assign the temporary faixa to the main variable
        const finalFaixaDef = tempFaixaDef;
        faixaDef = finalFaixaDef;
      }
      console.log(
        '✅ [AlunosService.create] FaixaDef encontrada - ID:',
        faixaDef.id,
        'Nome:',
        faixaDef,
      );

      // 5. Criar registro em aluno_faixa
      console.log(
        '🔵 [AlunosService.create] Criando registro em aluno_faixa...',
      );
      const alunoFaixaData = {
        aluno_id: savedAluno.id,
        faixa_def_id: faixaDef.id,
        ativa: true,
        dt_inicio: new Date(),
        graus_atual: dto.graus || 0,
        presencas_no_ciclo: 0,
        presencas_total_fx: 0,
      };
      console.log(
        '🔵 [AlunosService.create] Dados aluno_faixa:',
        JSON.stringify(alunoFaixaData, null, 2),
      );

      const alunoFaixa = queryRunner.manager.create(AlunoFaixa, alunoFaixaData);
      console.log('🔵 [AlunosService.create] Salvando aluno_faixa...');
      const savedAlunoFaixa = await queryRunner.manager.save(
        AlunoFaixa,
        alunoFaixa,
      );
      console.log(
        '✅ [AlunosService.create] aluno_faixa salvo com ID:',
        savedAlunoFaixa.id,
      );

      // 6. Criar registros de graus em aluno_faixa_grau (se houver graus)
      if (dto.graus && dto.graus > 0) {
        console.log(
          '🔵 [AlunosService.create] Criando',
          dto.graus,
          'grau(s)...',
        );
        for (let i = 1; i <= dto.graus; i++) {
          const grau = queryRunner.manager.create(AlunoFaixaGrau, {
            aluno_faixa_id: savedAlunoFaixa.id,
            grau_num: i,
            dt_concessao: new Date(),
            origem: OrigemGrau.MANUAL,
            observacao: 'Grau inicial do cadastro',
          });

          await queryRunner.manager.save(AlunoFaixaGrau, grau);
          console.log('✅ [AlunosService.create] Grau', i, 'salvo');
        }
      } else {
        console.log('🔵 [AlunosService.create] Nenhum grau para criar');
      }

      console.log('🔵 [AlunosService.create] Commitando transação...');
      await queryRunner.commitTransaction();
      console.log('✅ [AlunosService.create] Transação commitada com sucesso!');
    } catch (error) {
      console.error('❌ [AlunosService.create] ERRO durante criação do aluno!');
      console.error(
        '❌ [AlunosService.create] Tipo do erro:',
        error.constructor.name,
      );
      console.error('❌ [AlunosService.create] Mensagem:', error.message);
      console.error('❌ [AlunosService.create] Stack:', error.stack);
      await queryRunner.rollbackTransaction();
      console.log('🔴 [AlunosService.create] Transação revertida (rollback)');
      throw error;
    } finally {
      await queryRunner.release();
    }

    // Retornar aluno com relações (fora da transação)
    try {
      console.log(
        '🔵 [AlunosService.create] Buscando aluno completo com relações...',
      );
      const alunoCompleto = await this.findById(savedAluno.id);
      console.log('✅ [AlunosService.create] ALUNO CRIADO COM SUCESSO!');
      return alunoCompleto;
    } catch (findError) {
      console.error(
        '❌ [AlunosService.create] ERRO ao buscar aluno criado:',
        findError.message,
      );
      // Se der erro no findById, retornar pelo menos o aluno básico
      return savedAluno;
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
        const responsavelTelefone =
          dto.responsavel_telefone || aluno.responsavel_telefone;

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
      data_nascimento: dto.data_nascimento
        ? new Date(dto.data_nascimento)
        : aluno.data_nascimento,
      data_matricula: dto.data_matricula
        ? new Date(dto.data_matricula)
        : aluno.data_matricula,
      data_ultima_graduacao: dto.data_ultima_graduacao
        ? new Date(dto.data_ultima_graduacao)
        : aluno.data_ultima_graduacao,
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

  /**
   * Busca alunos por nome (para autocomplete)
   */
  async buscarPorNome(
    nome: string,
  ): Promise<Array<{ id: string; nome_completo: string; cpf?: string }>> {
    if (!nome || nome.length < 2) {
      return [];
    }

    const alunos = await this.alunoRepository.find({
      where: {
        nome_completo: ILike(`%${nome}%`),
      },
      select: ['id', 'nome_completo', 'cpf'],
      take: 10,
      order: {
        nome_completo: 'ASC',
      },
    });

    return alunos.map((aluno) => ({
      id: aluno.id,
      nome_completo: aluno.nome_completo,
      cpf: aluno.cpf,
    }));
  }

  /**
   * Obter estatísticas de alunos por filtros
   */
  async getStats(params: { search?: string; unidade_id?: string }) {
    const baseQuery = this.alunoRepository.createQueryBuilder('aluno');

    // Aplicar filtros básicos se fornecidos
    if (params.search) {
      baseQuery.andWhere(
        '(LOWER(aluno.nome_completo) LIKE :search OR aluno.cpf LIKE :search OR aluno.numero_matricula LIKE :search)',
        { search: `%${params.search.toLowerCase()}%` },
      );
    }

    if (params.unidade_id) {
      baseQuery.andWhere('aluno.unidade_id = :unidade', {
        unidade: params.unidade_id,
      });
    }

    // Contadores por status
    const totalAtivos = await baseQuery
      .clone()
      .andWhere('aluno.status = :status', { status: StatusAluno.ATIVO })
      .getCount();

    const totalInativos = await baseQuery
      .clone()
      .andWhere('aluno.status = :status', { status: StatusAluno.INATIVO })
      .getCount();

    const totalSuspensos = await baseQuery
      .clone()
      .andWhere('aluno.status = :status', { status: StatusAluno.SUSPENSO })
      .getCount();

    const totalCancelados = await baseQuery
      .clone()
      .andWhere('aluno.status = :status', { status: StatusAluno.CANCELADO })
      .getCount();

    // Contadores por faixa (apenas alunos ativos)
    const faixaStats = await this.alunoRepository
      .createQueryBuilder('aluno')
      .select('aluno.faixa_atual', 'faixa')
      .addSelect('COUNT(*)', 'count')
      .where('aluno.status = :status', { status: StatusAluno.ATIVO })
      .groupBy('aluno.faixa_atual')
      .getRawMany();

    const faixaCounts = faixaStats.reduce((acc, item) => {
      acc[item.faixa] = parseInt(item.count);
      return acc;
    }, {});

    // Total geral
    const total = await baseQuery.getCount();

    return {
      total,
      porStatus: {
        ativos: totalAtivos,
        inativos: totalInativos,
        suspensos: totalSuspensos,
        cancelados: totalCancelados,
      },
      porFaixa: faixaCounts,
    };
  }
}
