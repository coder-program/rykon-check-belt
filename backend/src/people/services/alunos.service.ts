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
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { AlunoUnidadeService } from './aluno-unidade.service';
import { AlunoUnidade } from '../entities/aluno-unidade.entity';

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
    @InjectRepository(AlunoUnidade)
    private readonly alunoUnidadeRepository: Repository<AlunoUnidade>,
    private dataSource: DataSource,
    private readonly usuariosService: UsuariosService,
    private readonly alunoUnidadeService: AlunoUnidadeService,
  ) {}

  async list(params: ListAlunosParams, user?: any) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const query = this.alunoRepository.createQueryBuilder('aluno');

    query.leftJoinAndSelect('aluno.unidade', 'unidade');
    // Comentado temporariamente - tabela aluno_unidades não existe
    // query.leftJoinAndSelect(
    //   'aluno.alunoUnidades',
    //   'alunoUnidades',
    //   'alunoUnidades.ativo = :ativo',
    //   { ativo: true },
    // );
    // query.leftJoinAndSelect('alunoUnidades.unidade', 'unidadeMultipla');
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
    // Se gerente de unidade, filtra apenas alunos da sua unidade
    else if (user && this.isGerenteUnidade(user) && !this.isMaster(user)) {
      const unidadeId = await this.getUnidadeIdByGerente(user);
      if (unidadeId) {
        query.andWhere('aluno.unidade_id = :unidadeId', { unidadeId });
      } else {
        query.andWhere('1 = 0'); // Retorna vazio se gerente não tem unidade
      }
    }
    // Se recepcionista, filtra apenas alunos das suas unidades
    else if (user && this.isRecepcionista(user) && !this.isMaster(user)) {
      const unidadeIds = await this.getUnidadesIdsByRecepcionista(user);
      if (unidadeIds && unidadeIds.length > 0) {
        query.andWhere('aluno.unidade_id IN (:...unidadeIds)', { unidadeIds });
      } else {
        query.andWhere('1 = 0'); // Retorna vazio se recepcionista não tem unidades
      }
    }
    // Se professor/instrutor, filtra apenas alunos das suas unidades
    else if (user && this.isProfessor(user)) {
      const professorId = await this.getProfessorIdByUser(user);
      if (professorId) {
        const unidadesDoProfessor =
          await this.getUnidadesDoProfessor(professorId);
        if (unidadesDoProfessor.length > 0) {
          query.andWhere('aluno.unidade_id IN (:...unidades)', {
            unidades: unidadesDoProfessor,
          });
        } else {
          query.andWhere('1 = 0'); // Retorna vazio se professor não tem unidades
        }
      }
    }
    // Se franqueado (não master), filtra apenas alunos das suas unidades
    else if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (franqueadoId) {
        // Buscar unidades do franqueado
        const unidadesDeFranqueado =
          await this.getUnidadesDeFranqueado(franqueadoId);
        if (unidadesDeFranqueado.length > 0) {
          query.andWhere('aluno.unidade_id IN (:...unidades)', {
            unidades: unidadesDeFranqueado,
          });
        } else {
          query.andWhere('1 = 0'); // Retorna vazio se franqueado não tem unidades
        }
      }
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

    // Buscar status dos usuários vinculados aos alunos
    const usuarioIds = items
      .filter((aluno) => aluno.usuario_id)
      .map((aluno) => aluno.usuario_id);

    let usuariosStatus: { [key: string]: boolean } = {};
    if (usuarioIds.length > 0) {
      const usuarios = await this.dataSource.query(
        `SELECT id, ativo FROM teamcruz.usuarios WHERE id = ANY($1)`,
        [usuarioIds],
      );
      usuariosStatus = usuarios.reduce((acc, u) => {
        acc[u.id] = u.ativo;
        return acc;
      }, {});
    }

    // Mapear os resultados para incluir o status do usuário
    const itemsWithStatus = items.map((aluno) => ({
      ...aluno,
      status_usuario: aluno.usuario_id
        ? usuariosStatus[aluno.usuario_id]
          ? 'ATIVO'
          : 'INATIVO'
        : null,
    }));

    return {
      items: itemsWithStatus,
      page,
      pageSize,
      total,
      hasNextPage: page * pageSize < total,
    };
  }

  async findById(id: string, user?: any): Promise<Aluno> {
    const aluno = await this.alunoRepository.findOne({
      where: { id },
      relations: ['unidade', 'alunoUnidades', 'alunoUnidades.unidade'],
    });

    if (!aluno) {
      throw new NotFoundException(`Aluno com ID ${id} não encontrado`);
    }

    // Se franqueado (não master), verifica se aluno pertence às suas unidades
    if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (franqueadoId) {
        const unidadesDeFranqueado =
          await this.getUnidadesDeFranqueado(franqueadoId);
        if (!unidadesDeFranqueado.includes(aluno.unidade_id)) {
          throw new NotFoundException('Aluno não encontrado');
        }
      }
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedAluno: any;

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
        if (
          !dto.responsavel_nome ||
          !dto.responsavel_cpf ||
          !dto.responsavel_telefone
        ) {
          throw new BadRequestException(
            'Para alunos menores de 18 anos é obrigatório informar os dados do responsável',
          );
        }
      }

      // 3. Preparar dados do aluno
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

      // Manter compatibilidade com sistema antigo (unidade_id único)
      if (dto.unidade_id) {
        alunoData.unidade_id = dto.unidade_id;
      } else if (dto.unidades && dto.unidades.length > 0) {
        // Se usar o novo sistema, usar a primeira unidade como principal no campo legado
        const unidadePrincipal =
          dto.unidades.find((u) => u.is_principal) || dto.unidades[0];
        alunoData.unidade_id = unidadePrincipal.unidade_id;
      }

      const aluno = queryRunner.manager.create(Aluno, alunoData);
      savedAluno = await queryRunner.manager.save(Aluno, aluno);

      // 4. Buscar a definição da faixa
      let faixaDef = await this.buscarFaixaDef(
        dto.faixa_atual || FaixaEnum.BRANCA,
        idade,
        queryRunner,
      );

      if (!faixaDef) {
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
        }

        // Assign the temporary faixa to the main variable
        const finalFaixaDef = tempFaixaDef;
        faixaDef = finalFaixaDef;
      }

      // 5. Criar registro em aluno_faixa
      const alunoFaixaData = {
        aluno_id: savedAluno.id,
        faixa_def_id: faixaDef.id,
        ativa: true,
        dt_inicio: new Date(),
        graus_atual: dto.graus || 0,
        presencas_no_ciclo: 0,
        presencas_total_fx: 0,
      };

      const alunoFaixa = queryRunner.manager.create(AlunoFaixa, alunoFaixaData);
      const savedAlunoFaixa = await queryRunner.manager.save(
        AlunoFaixa,
        alunoFaixa,
      );

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

      // 7. Vincular aluno às unidades (novo sistema)
      if (dto.unidades && dto.unidades.length > 0) {
        const vinculos = dto.unidades.map((unidadeDto) => {
          const vinculo = queryRunner.manager.create(AlunoUnidade, {
            aluno_id: savedAluno.id,
            unidade_id: unidadeDto.unidade_id,
            data_matricula: unidadeDto.data_matricula
              ? new Date(unidadeDto.data_matricula)
              : new Date(),
            is_principal: unidadeDto.is_principal || false,
            observacoes: unidadeDto.observacoes,
            ativo: true,
          });
          return vinculo;
        });

        // Garantir que pelo menos uma unidade seja principal
        const temPrincipal = vinculos.some((v) => v.is_principal);
        if (!temPrincipal && vinculos.length > 0) {
          vinculos[0].is_principal = true;
        }

        await queryRunner.manager.save(AlunoUnidade, vinculos);
      } else if (dto.unidade_id) {
        // Sistema legado: criar um único vínculo
        const vinculoLegado = queryRunner.manager.create(AlunoUnidade, {
          aluno_id: savedAluno.id,
          unidade_id: dto.unidade_id,
          data_matricula: dto.data_matricula
            ? new Date(dto.data_matricula)
            : new Date(),
          is_principal: true,
          ativo: true,
        });

        await queryRunner.manager.save(AlunoUnidade, vinculoLegado);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    }

    // Retornar aluno com relações (fora da transação)
    try {
      const alunoCompleto = await this.findById(savedAluno.id);
      return alunoCompleto;
    } catch (findError) {
      // Se der erro no findById, retornar pelo menos o aluno básico
      return savedAluno;
    }
  }

  async update(id: string, dto: UpdateAlunoDto, user?: any): Promise<Aluno> {
    const aluno = await this.findById(id, user);

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
   * Aprovar auto-cadastro de aluno
   * Ativa o usuário vinculado ao aluno (muda status de INATIVO para ATIVO em usuarios)
   */
  async approveAluno(alunoId: string): Promise<Aluno> {
    const aluno = await this.alunoRepository.findOne({
      where: { id: alunoId },
      relations: ['unidade'],
    });

    if (!aluno) {
      throw new NotFoundException(`Aluno com ID ${alunoId} não encontrado`);
    }

    if (!aluno.usuario_id) {
      throw new BadRequestException(
        'Aluno não possui usuário vinculado para aprovação',
      );
    }

    // Usar o UsuariosService para aprovar o usuário
    await this.usuariosService.approveUser(aluno.usuario_id);

    // Retornar aluno atualizado
    return this.findById(alunoId);
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
  async getStats(params: { search?: string; unidade_id?: string }, user?: any) {
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
    // Se professor/instrutor, filtra apenas alunos das suas unidades
    else if (user && this.isProfessor(user)) {
      const professorId = await this.getProfessorIdByUser(user);
      if (professorId) {
        const unidadesDoProfessor =
          await this.getUnidadesDoProfessor(professorId);
        if (unidadesDoProfessor.length > 0) {
          baseQuery.andWhere('aluno.unidade_id IN (:...unidades)', {
            unidades: unidadesDoProfessor,
          });
        } else {
          baseQuery.andWhere('1 = 0');
        }
      }
    }
    // Se franqueado (não master), filtra apenas alunos das suas unidades
    else if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (franqueadoId) {
        baseQuery.andWhere(
          'aluno.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = :franqueadoId)',
          { franqueadoId },
        );
      }
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
    const faixaQuery = this.alunoRepository
      .createQueryBuilder('aluno')
      .select('aluno.faixa_atual', 'faixa')
      .addSelect('COUNT(*)', 'count')
      .where('aluno.status = :status', { status: StatusAluno.ATIVO });

    // Aplicar mesmos filtros que a baseQuery
    if (params.search) {
      faixaQuery.andWhere(
        '(LOWER(aluno.nome_completo) LIKE :search OR aluno.cpf LIKE :search OR aluno.numero_matricula LIKE :search)',
        { search: `%${params.search.toLowerCase()}%` },
      );
    }

    if (params.unidade_id) {
      faixaQuery.andWhere('aluno.unidade_id = :unidade', {
        unidade: params.unidade_id,
      });
    }
    // Se professor/instrutor, filtra apenas alunos das suas unidades
    else if (user && this.isProfessor(user)) {
      const professorId = await this.getProfessorIdByUser(user);
      if (professorId) {
        const unidadesDoProfessor =
          await this.getUnidadesDoProfessor(professorId);
        if (unidadesDoProfessor.length > 0) {
          faixaQuery.andWhere('aluno.unidade_id IN (:...unidades)', {
            unidades: unidadesDoProfessor,
          });
        }
      }
    }
    // Se franqueado (não master), filtra apenas alunos das suas unidades
    else if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (franqueadoId) {
        faixaQuery.andWhere(
          'aluno.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = :franqueadoId)',
          { franqueadoId },
        );
      }
    }

    const faixaStats = await faixaQuery
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

  // Métodos auxiliares para controle de acesso por perfil
  private isMaster(user: any): boolean {
    const perfis = (user?.perfis || []).map((p: any) =>
      (p.nome || '').toLowerCase(),
    );
    return perfis.includes('master');
  }

  private isFranqueado(user: any): boolean {
    const perfis = (user?.perfis || []).map((p: any) =>
      (p.nome || '').toLowerCase(),
    );
    return perfis.includes('franqueado');
  }

  private isRecepcionista(user: any): boolean {
    const perfis = (user?.perfis || []).map((p: any) =>
      (p.nome || '').toLowerCase(),
    );
    return perfis.includes('recepcionista');
  }

  private async getUnidadeIdByRecepcionista(user: any): Promise<string | null> {
    if (!user?.id) return null;
    // MÉTODO ANTIGO - mantido para compatibilidade
    // Buscar unidade onde o usuário é o responsável com papel ADMINISTRATIVO (recepcionista)
    const result = await this.dataSource.query(
      `SELECT id FROM teamcruz.unidades
       WHERE responsavel_cpf = (
         SELECT cpf FROM teamcruz.usuarios WHERE id = $1
       )
       LIMIT 1`,
      [user.id],
    );
    return result[0]?.id || null;
  }

  private async getUnidadesIdsByRecepcionista(user: any): Promise<string[]> {
    if (!user?.id) return [];

    // NOVO MÉTODO - busca todas as unidades vinculadas na tabela recepcionista_unidades
    const result = await this.dataSource.query(
      `SELECT ru.unidade_id
       FROM teamcruz.recepcionista_unidades ru
       WHERE ru.usuario_id = $1
         AND ru.ativo = true
       ORDER BY ru.created_at`,
      [user.id],
    );

    const unidadeIds = result.map((row: any) => row.unidade_id);
    return unidadeIds;
  }

  private isGerenteUnidade(user: any): boolean {
    const perfis = (user?.perfis || []).map((p: any) =>
      (p.nome || '').toLowerCase(),
    );
    return perfis.includes('gerente_unidade') || perfis.includes('gerente');
  }

  private async getUnidadeIdByGerente(user: any): Promise<string | null> {
    if (!user?.id) return null;
    // Buscar unidade onde o usuário é o responsável com papel GERENTE
    const result = await this.dataSource.query(
      `SELECT id FROM teamcruz.unidades
       WHERE responsavel_cpf = (
         SELECT cpf FROM teamcruz.usuarios WHERE id = $1
       )
       AND responsavel_papel = 'GERENTE'
       LIMIT 1`,
      [user.id],
    );
    return result[0]?.id || null;
  }

  private isProfessor(user: any): boolean {
    const perfis = (user?.perfis || []).map((p: any) =>
      (p.nome || '').toLowerCase(),
    );
    return perfis.includes('professor') || perfis.includes('instrutor');
  }

  private async getProfessorIdByUser(user: any): Promise<string | null> {
    if (!user?.id) return null;
    const result = await this.dataSource.query(
      `SELECT id FROM teamcruz.professores WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );
    return result[0]?.id || null;
  }

  private async getUnidadesDoProfessor(professorId: string): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT unidade_id FROM teamcruz.professor_unidades WHERE professor_id = $1 AND ativo = true`,
      [professorId],
    );
    return result.map((r: any) => r.unidade_id);
  }

  private async getFranqueadoIdByUser(user: any): Promise<string | null> {
    if (!user?.id) {
      return null;
    }
    const result = await this.dataSource.query(
      `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );
    return result[0]?.id || null;
  }

  private async getUnidadesDeFranqueado(
    franqueadoId: string,
  ): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT id FROM teamcruz.unidades WHERE franqueado_id = $1`,
      [franqueadoId],
    );
    return result.map((r: any) => r.id);
  }
}
