import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Aluno, StatusAluno, FaixaEnum } from '../entities/aluno.entity';
import { Person } from '../entities/person.entity';
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
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
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
    const pageSize = Math.min(5000, Math.max(1, Number(params.pageSize) || 20));

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

    // Filtro por faixa (apenas valores válidos do enum)
    // Ignorar valores de categoria como 'kids', 'adulto', 'todos', 'todas'
    const faixasValidas = [
      'branca',
      'cinza',
      'cinza_branca',
      'cinza_preta',
      'amarela',
      'amarela_branca',
      'amarela_preta',
      'laranja',
      'laranja_branca',
      'laranja_preta',
      'verde',
      'verde_branca',
      'verde_preta',
      'azul',
      'roxa',
      'marrom',
      'preta',
      'coral',
    ];
    const faixaLower = params.faixa?.toLowerCase();
    if (
      params.faixa &&
      faixaLower !== 'todos' &&
      faixaLower !== 'todas' &&
      faixasValidas.includes(faixaLower)
    ) {
      query
        .leftJoin('aluno.faixas', 'faixa_filtro', 'faixa_filtro.ativa = true')
        .leftJoin('faixa_filtro.faixaDef', 'faixaDef_filtro')
        .andWhere('faixaDef_filtro.codigo = :faixa', {
          faixa: params.faixa.toUpperCase(),
        });
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

  async create(dto: CreateAlunoDto | any): Promise<Aluno> {
    const isDependenteCadastro = (dto as any).is_dependente_cadastro || false;

    // CPF é obrigatório APENAS se NÃO for cadastro de dependente
    if (!isDependenteCadastro && !dto.cpf) {
      throw new BadRequestException('CPF é obrigatório');
    }

    // VALIDAÇÃO: Verificar se número de matrícula já existe ANTES de iniciar transação
    if (dto.numero_matricula && dto.numero_matricula.trim() !== '') {
      const matriculaExistente = await this.alunoRepository.findOne({
        where: { numero_matricula: dto.numero_matricula },
      });

      if (matriculaExistente) {
        throw new BadRequestException(
          `Número de matrícula ${dto.numero_matricula} já está em uso`,
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedAluno: any;
    let usuario_id: string | undefined = dto.usuario_id;

    try {
      // 1. Criar usuário APENAS se NÃO for cadastro de dependente E não foi fornecido usuario_id
      if (!usuario_id && !isDependenteCadastro) {
        // Buscar ID do perfil ALUNO
        const perfilAluno = await queryRunner.manager.query(
          `SELECT id FROM teamcruz.perfis WHERE UPPER(nome) = 'ALUNO' LIMIT 1`,
        );

        if (!perfilAluno || perfilAluno.length === 0) {
          throw new BadRequestException(
            'Perfil ALUNO não encontrado no sistema',
          );
        }

        // Gerar username a partir do nome (remover espaços e caracteres especiais)
        const baseUsername = dto.nome_completo
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');

        // Verificar se username já existe e adicionar número se necessário
        let username = baseUsername;
        let counter = 1;
        let usernameExists = true;

        while (usernameExists) {
          const existing = await queryRunner.manager.query(
            `SELECT id FROM teamcruz.usuarios WHERE username = $1`,
            [username],
          );
          if (existing.length === 0) {
            usernameExists = false;
          } else {
            username = `${baseUsername}${counter}`;
            counter++;
          }
        }

        // Criar usuário com ativo = false (aguardando aprovação)
        const usuarioData = {
          username,
          email: dto.email || `${username}@temp.local`,
          nome: dto.nome_completo,
          cpf: dto.cpf,
          telefone: dto.telefone,
          password: await import('bcrypt').then((bcrypt) =>
            bcrypt.hash(dto.cpf?.replace(/\D/g, '') || 'temppass123', 10),
          ), // Senha inicial = CPF ou senha temporária
          ativo: false, // Aguardando aprovação
          cadastro_completo: false,
        };

        const usuario = await queryRunner.manager.query(
          `INSERT INTO teamcruz.usuarios
           (username, email, nome, cpf, telefone, password, ativo, cadastro_completo, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           RETURNING id`,
          [
            usuarioData.username,
            usuarioData.email,
            usuarioData.nome,
            usuarioData.cpf,
            usuarioData.telefone,
            usuarioData.password,
            usuarioData.ativo,
            usuarioData.cadastro_completo,
          ],
        );

        usuario_id = usuario[0].id;

        // Vincular perfil ALUNO ao usuário
        await queryRunner.manager.query(
          `INSERT INTO teamcruz.usuario_perfis (usuario_id, perfil_id, created_at, updated_at)
           VALUES ($1, $2, NOW(), NOW())`,
          [usuario_id, perfilAluno[0].id],
        );
      }

      // Se for dependente, não precisa de usuario_id
      if (dto.responsavel_id) {
        usuario_id = undefined; // Garante que dependente não tenha usuario_id
      }

      // 2. Verificar se CPF já existe (apenas se CPF foi fornecido)
      if (dto.cpf) {
        const existingAluno = await this.alunoRepository.findOne({
          where: { cpf: dto.cpf },
        });

        if (existingAluno) {
          throw new ConflictException('CPF já cadastrado');
        }
      }

      // 3. Validar se é menor de idade e tem responsável (apenas se não for dependente)
      const dataNascimento = new Date(dto.data_nascimento);
      const idade = this.calcularIdade(dataNascimento);

      if (!dto.responsavel_id && idade <= 15) {
        if (
          !dto.responsavel_nome ||
          !dto.responsavel_cpf ||
          !dto.responsavel_telefone
        ) {
          throw new BadRequestException(
            'Para alunos que completam 15 anos ou menos no ano atual é obrigatório informar os dados do responsável',
          );
        }
      }

      // 4. Preparar dados do aluno (incluindo usuario_id se foi criado)
      // Gerar número de matrícula único se não foi fornecido
      let numeroMatricula = dto.numero_matricula;
      if (!numeroMatricula || numeroMatricula.trim() === '') {
        // Gerar número único baseado em timestamp + random
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0');
        numeroMatricula = `${timestamp}${random}`;

        // Verificar se já existe (improvável, mas garantir unicidade)
        let tentativas = 0;
        while (tentativas < 5) {
          const existente = await this.alunoRepository.findOne({
            where: { numero_matricula: numeroMatricula },
          });
          if (!existente) break;

          // Se existir, gerar outro
          const newRandom = Math.floor(Math.random() * 1000)
            .toString()
            .padStart(3, '0');
          numeroMatricula = `${timestamp}${newRandom}`;
          tentativas++;
        }
      }

      const alunoData: any = {
        ...dto,
        numero_matricula: numeroMatricula, // Usar o número gerado ou fornecido
        cpf: dto.cpf && dto.cpf.trim() !== '' ? dto.cpf : null, // Converter string vazia para null
        usuario_id, // Incluir o usuario_id criado automaticamente
        status: dto.status || StatusAluno.ATIVO,
        // Garantir que data_matricula seja sempre a data local atual (sem problemas de timezone)
        data_matricula: dto.data_matricula
          ? new Date(dto.data_matricula + 'T12:00:00') // Adicionar horário meio-dia para evitar problemas de timezone
          : new Date(new Date().toISOString().split('T')[0] + 'T12:00:00'),
        data_nascimento: new Date(dto.data_nascimento),
        data_ultima_graduacao: dto.data_ultima_graduacao
          ? new Date(dto.data_ultima_graduacao)
          : undefined,
        // Converter strings vazias para null em campos de data
        atestado_medico_validade:
          dto.atestado_medico_validade &&
          dto.atestado_medico_validade.trim() !== ''
            ? new Date(dto.atestado_medico_validade)
            : null,
        // Converter strings vazias para null em campos de texto
        telefone:
          dto.telefone && dto.telefone.trim() !== '' ? dto.telefone : null,
        telefone_emergencia:
          dto.telefone_emergencia && dto.telefone_emergencia.trim() !== ''
            ? dto.telefone_emergencia
            : null,
        nome_contato_emergencia:
          dto.nome_contato_emergencia &&
          dto.nome_contato_emergencia.trim() !== ''
            ? dto.nome_contato_emergencia
            : null,
        observacoes_medicas:
          dto.observacoes_medicas && dto.observacoes_medicas.trim() !== ''
            ? dto.observacoes_medicas
            : null,
        alergias:
          dto.alergias && dto.alergias.trim() !== '' ? dto.alergias : null,
        medicamentos_uso_continuo:
          dto.medicamentos_uso_continuo &&
          dto.medicamentos_uso_continuo.trim() !== ''
            ? dto.medicamentos_uso_continuo
            : null,
        plano_saude:
          dto.plano_saude && dto.plano_saude.trim() !== ''
            ? dto.plano_saude
            : null,
        restricoes_medicas:
          dto.restricoes_medicas && dto.restricoes_medicas.trim() !== ''
            ? dto.restricoes_medicas
            : null,
        responsavel_nome:
          dto.responsavel_nome && dto.responsavel_nome.trim() !== ''
            ? dto.responsavel_nome
            : null,
        responsavel_cpf:
          dto.responsavel_cpf && dto.responsavel_cpf.trim() !== ''
            ? dto.responsavel_cpf
            : null,
        responsavel_telefone:
          dto.responsavel_telefone && dto.responsavel_telefone.trim() !== ''
            ? dto.responsavel_telefone
            : null,
        responsavel_parentesco:
          dto.responsavel_parentesco && dto.responsavel_parentesco.trim() !== ''
            ? dto.responsavel_parentesco
            : null,
        observacoes:
          dto.observacoes && dto.observacoes.trim() !== ''
            ? dto.observacoes
            : null,
        dia_vencimento:
          dto.dia_vencimento && dto.dia_vencimento !== ''
            ? Number(dto.dia_vencimento)
            : null,
        valor_mensalidade:
          dto.valor_mensalidade && dto.valor_mensalidade !== ''
            ? Number(dto.valor_mensalidade)
            : null,
        desconto_percentual:
          dto.desconto_percentual && dto.desconto_percentual !== ''
            ? Number(dto.desconto_percentual)
            : 0,
        // Converter strings vazias para false em campos booleanos
        consent_lgpd:
          dto.consent_lgpd === true || dto.consent_lgpd === 'true'
            ? true
            : false,
        consent_imagem:
          dto.consent_imagem === true || dto.consent_imagem === 'true'
            ? true
            : false,
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

      // 5. Buscar a definição da faixa
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

        // Buscar faixa sem restrição de categoria primeiro
        let tempFaixaDef = await faixaDefRepository.findOne({
          where: {
            codigo: dto.faixa_atual || FaixaEnum.BRANCA,
            ativo: true,
          },
        });

        // Se não encontrou, buscar qualquer faixa BRANCA ativa
        if (
          !tempFaixaDef &&
          (dto.faixa_atual || FaixaEnum.BRANCA) === FaixaEnum.BRANCA
        ) {
          tempFaixaDef = await faixaDefRepository.findOne({
            where: {
              codigo: FaixaEnum.BRANCA,
              ativo: true,
            },
          });
        }

        // Se ainda não encontrou, criar uma entrada básica temporária
        if (!tempFaixaDef) {
          try {
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
          } catch (error) {
            // Se falhar por já existir, buscar novamente
            tempFaixaDef = await faixaDefRepository.findOne({
              where: {
                codigo: dto.faixa_atual || FaixaEnum.BRANCA,
                ativo: true,
              },
            });

            if (!tempFaixaDef) {
              throw new BadRequestException(
                'Não foi possível encontrar ou criar definição de faixa',
              );
            }
          }
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
      console.error(' [ALUNO CREATE] Erro ao criar aluno:', error);
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
    const unidadeAnterior = aluno.unidade_id; // Salvar antes do assign

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

      if (idade <= 15) {
        const responsavelNome = dto.responsavel_nome || aluno.responsavel_nome;
        const responsavelCpf = dto.responsavel_cpf || aluno.responsavel_cpf;
        const responsavelTelefone =
          dto.responsavel_telefone || aluno.responsavel_telefone;

        if (!responsavelNome || !responsavelCpf || !responsavelTelefone) {
          throw new BadRequestException(
            'Para alunos que completam 15 anos ou menos no ano atual é obrigatório informar os dados do responsável',
          );
        }
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
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
    };

    // Fazer UPDATE direto no banco (bypass da relação @ManyToOne)
    await this.alunoRepository.update(id, updateData);

    // Buscar novamente do banco para garantir dados atualizados
    const resultado = await this.alunoRepository.findOne({
      where: { id },
      relations: ['unidade', 'alunoUnidades', 'alunoUnidades.unidade'],
    });

    if (!resultado) {
      throw new NotFoundException(
        `Aluno com ID ${id} não encontrado após atualização`,
      );
    }

    return resultado;
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
    // Retorna a idade que vai completar no ano atual (ano atual - ano nascimento)
    return hoje.getFullYear() - dataNascimento.getFullYear();
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
      .leftJoin('aluno.faixas', 'faixa', 'faixa.ativa = true')
      .leftJoin('faixa.faixaDef', 'faixaDef')
      .select('faixaDef.codigo', 'faixa')
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

    const faixaStats = await faixaQuery.groupBy('faixaDef.codigo').getRawMany();

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
    // Buscar unidade do gerente através da tabela gerente_unidades
    const result = await this.dataSource.query(
      `SELECT unidade_id FROM teamcruz.gerente_unidades
       WHERE usuario_id = $1
       LIMIT 1`,
      [user.id],
    );
    return result[0]?.unidade_id || null;
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

  // ========== TABLET CHECK-IN ==========

  async listarAlunosParaCheckin(user: any, search?: string) {
    // Buscar unidade do usuário (TABLET_CHECKIN deve estar vinculado a uma unidade)
    let unidadeId: string | null = null;

    // Para TABLET_CHECKIN, buscar via tablet_unidades
    const perfisNomes = (user?.perfis || []).map((p: any) =>
      typeof p === 'string' ? p.toUpperCase() : p.nome?.toUpperCase(),
    );

    if (perfisNomes.includes('TABLET_CHECKIN')) {
      const result = await this.dataSource.query(
        `SELECT unidade_id FROM teamcruz.tablet_unidades WHERE tablet_id = $1 AND ativo = true LIMIT 1`,
        [user.id],
      );
      unidadeId = result[0]?.unidade_id || null;
    }

    if (!unidadeId) {
      console.warn(
        '⚠️ [listarAlunosParaCheckin] Usuário não vinculado a unidade',
      );
      console.warn('⚠️ [listarAlunosParaCheckin] Perfis:', perfisNomes);
      return [];
    }

    // Buscar alunos ativos da unidade
    const query = this.alunoRepository.createQueryBuilder('aluno');

    query.leftJoinAndSelect('aluno.unidade', 'unidade');
    query.leftJoinAndSelect('aluno.faixas', 'faixas', 'faixas.ativa = :ativa', {
      ativa: true,
    });
    query.leftJoinAndSelect('faixas.faixaDef', 'faixaDef');

    query.where('aluno.unidade_id = :unidadeId', { unidadeId });
    query.andWhere('aluno.status = :status', { status: StatusAluno.ATIVO });

    if (search) {
      query.andWhere(
        '(LOWER(aluno.nome_completo) LIKE :search OR aluno.cpf LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    query.orderBy('aluno.nome_completo', 'ASC');

    const alunos = await query.getMany();

    return alunos.map((aluno) => ({
      id: aluno.id,
      nome: aluno.nome_completo,
      cpf: aluno.cpf,
      foto: aluno.foto_url,
      faixa: aluno.faixas?.[0]?.faixaDef?.nome_exibicao || 'Sem faixa',
      corFaixa: aluno.faixas?.[0]?.faixaDef?.cor_hex || '#CCCCCC',
      numeroMatricula: aluno.numero_matricula,
      unidade: aluno.unidade?.nome,
    }));
  }

  /**
   * Busca alunos (dependentes) vinculados ao responsável logado
   */
  async getMeusDependentes(user: any): Promise<any[]> {
    if (!user || !user.id) {
      return [];
    }

    // Buscar responsável na tabela responsaveis
    const responsavelData = await this.dataSource.query(
      `SELECT id FROM teamcruz.responsaveis WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );

    if (!responsavelData || responsavelData.length === 0) {
      console.warn(
        '⚠️ [GET MEUS DEPENDENTES] Responsável não encontrado na tabela responsaveis',
      );
      return [];
    }

    const responsavelId = responsavelData[0].id;

    // Primeiro, buscar TODOS os alunos vinculados ao responsavel_id (sem filtro)
    const todosAlunos = await this.dataSource.query(
      `SELECT id, nome_completo, usuario_id, responsavel_id
       FROM teamcruz.alunos
       WHERE responsavel_id = $1
       ORDER BY nome_completo ASC`,
      [responsavelId],
    );

    // Buscar alunos vinculados ao responsável (exceto o próprio responsável)
    const query = this.alunoRepository.createQueryBuilder('aluno');

    query.leftJoinAndSelect('aluno.unidade', 'unidade');
    query.leftJoinAndSelect('aluno.faixas', 'faixas', 'faixas.ativa = :ativa', {
      ativa: true,
    });
    query.leftJoinAndSelect('faixas.faixaDef', 'faixaDef');

    query.where('aluno.responsavel_id = :responsavelId', { responsavelId });
    // Excluir o próprio responsável da lista (caso ele também seja aluno)
    // Aceitar alunos com usuario_id NULL (dependentes menores) OU com usuario_id diferente do responsável
    query.andWhere(
      '(aluno.usuario_id IS NULL OR aluno.usuario_id != :usuarioId)',
      { usuarioId: user.id },
    );
    query.orderBy('aluno.nome_completo', 'ASC');

    // ⚡ CRITICAL: Desabilitar cache do TypeORM para forçar buscar dados frescos do banco
    query.cache(false);

    const alunos = await query.getMany();

    // 🔍 DEBUG: Log detalhado de cada dependente
    alunos.forEach((aluno, index) => {});

    const resultado = alunos.map((aluno) => {
      // Buscar faixa ativa da relação aluno_faixas
      const faixaAtiva = aluno.faixas?.find((f) => f.ativa);
      const faixaFinal = faixaAtiva?.faixaDef?.nome_exibicao || 'Sem faixa';
      const grausFinal = faixaAtiva?.graus_atual || 0;

      return {
        id: aluno.id,
        nome_completo: aluno.nome_completo,
        data_nascimento: aluno.data_nascimento,
        faixa_atual: faixaFinal,
        graus: grausFinal,
        status: aluno.status,
        foto_url: aluno.foto_url,
        unidade: aluno.unidade
          ? {
              id: aluno.unidade.id,
              nome: aluno.unidade.nome,
            }
          : null,
      };
    });

    return resultado;
  }

  async responsavelViraAluno(user: any): Promise<any> {
    if (!user || !user.id) {
      throw new BadRequestException('Usuário não identificado');
    }

    // Verificar se já é aluno
    const alunoExistente = await this.alunoRepository.findOne({
      where: { usuario_id: user.id },
    });

    if (alunoExistente) {
      throw new BadRequestException('Você já é um aluno cadastrado');
    }

    // Buscar dados do usuário na tabela person
    const pessoa = await this.personRepository.findOne({
      where: { id: user.id },
    });

    if (!pessoa) {
      throw new NotFoundException('Dados do usuário não encontrados');
    }

    // Buscar responsável para pegar a unidade
    const responsavel = await this.dataSource.query(
      `SELECT unidade_id FROM teamcruz.responsaveis WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );

    const unidadeId = responsavel?.[0]?.unidade_id || null;

    // Criar registro de aluno
    const novoAluno = this.alunoRepository.create({
      nome_completo: pessoa.nome_completo,
      email: pessoa.email,
      cpf: pessoa.cpf,
      data_nascimento: pessoa.data_nascimento,
      telefone: pessoa.telefone_whatsapp || '',
      unidade_id: unidadeId,
      status: StatusAluno.ATIVO,
    });

    // Atualizar usuario_id após criar
    novoAluno.usuario_id = user.id;

    await this.alunoRepository.save(novoAluno);

    return {
      success: true,
      message: 'Agora você também é um aluno! Bem-vindo aos treinos!',
      aluno: {
        id: novoAluno.id,
        nome: novoAluno.nome_completo,
      },
    };
  }
}
