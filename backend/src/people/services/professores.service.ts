import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Person,
  TipoCadastro,
  StatusCadastro,
} from '../entities/person.entity';
import { ProfessorUnidade } from '../entities/professor-unidade.entity';
import { CreateProfessorDto } from '../dto/create-professor.dto';
import { UpdateProfessorDto } from '../dto/update-professor.dto';

interface ListProfessoresParams {
  page?: number;
  pageSize?: number;
  search?: string;
  unidade_id?: string;
  status?: StatusCadastro;
}

@Injectable()
export class ProfessoresService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(ProfessorUnidade)
    private readonly professorUnidadeRepository: Repository<ProfessorUnidade>,
    private dataSource: DataSource,
  ) {}

  async list(params: ListProfessoresParams, user?: any) {
    console.log('🔍 [PROFESSORES] Iniciando listagem com params:', params);
    console.log('🔍 [PROFESSORES] User:', {
      id: user?.id,
      username: user?.username,
      perfis: user?.perfis,
    });

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));

    const query = this.personRepository.createQueryBuilder('person');

    // Filtrar apenas professores
    query.where('person.tipo_cadastro = :tipo', {
      tipo: TipoCadastro.PROFESSOR,
    });

    // Busca por nome ou CPF
    if (params.search) {
      query.andWhere(
        '(LOWER(person.nome_completo) LIKE :search OR person.cpf LIKE :search)',
        { search: `%${params.search.toLowerCase()}%` },
      );
    }

    // Aplicar filtros de segurança baseados no perfil do usuário
    // FRANQUEADO: só vê professores das suas unidades
    if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      console.log('🔒 [PROFESSORES] Usuário é FRANQUEADO - aplicando filtro');
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      console.log('🔒 [PROFESSORES] franqueadoId:', franqueadoId);

      if (franqueadoId) {
        // Se especificou unidade_id, validar que pertence ao franqueado
        if (params.unidade_id) {
          console.log(
            '🔒 [PROFESSORES] Filtrando por unidade_id:',
            params.unidade_id,
          );
          query.andWhere(
            'person.unidade_id = :unidade AND person.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = :franqueadoId)',
            { unidade: params.unidade_id, franqueadoId },
          );
        } else {
          console.log(
            '🔒 [PROFESSORES] Filtrando por todas as unidades do franqueado',
          );
          // Sem filtro de unidade: mostrar todas as unidades do franqueado
          query.andWhere(
            'person.unidade_id IN (SELECT id FROM teamcruz.unidades WHERE franqueado_id = :franqueadoId)',
            { franqueadoId },
          );
        }
      } else {
        console.log(
          '⚠️ [PROFESSORES] Franqueado sem registro - bloqueando acesso',
        );
        // Franqueado sem registro: não pode ver nenhum professor
        query.andWhere('1 = 0');
      }
    }
    // GERENTE DE UNIDADE: só vê professores da sua unidade
    else if (user && this.isGerenteUnidade(user) && !this.isMaster(user)) {
      console.log(
        '🔒 [PROFESSORES] Usuário é GERENTE_UNIDADE - aplicando filtro',
      );
      const unidadeDoGerente = await this.getUnidadeDoGerente(user);
      console.log('🔒 [PROFESSORES] unidadeDoGerente:', unidadeDoGerente);

      if (unidadeDoGerente) {
        // Forçar filtro pela unidade do gerente
        query.andWhere('person.unidade_id = :unidadeGerente', {
          unidadeGerente: unidadeDoGerente,
        });
      } else {
        console.log('⚠️ [PROFESSORES] Gerente sem unidade - bloqueando acesso');
        // Gerente sem unidade: não pode ver nenhum professor
        query.andWhere('1 = 0');
      }
    }
    // MASTER ou outros perfis: pode filtrar por qualquer unidade
    else if (params.unidade_id) {
      console.log(
        '✅ [PROFESSORES] MASTER ou admin - filtrando por unidade:',
        params.unidade_id,
      );
      query.andWhere('person.unidade_id = :unidade', {
        unidade: params.unidade_id,
      });
    } else {
      console.log(
        '✅ [PROFESSORES] MASTER ou admin - sem filtro de unidade (todos)',
      );
    }

    // Filtro por status
    if (params.status) {
      query.andWhere('person.status = :status', { status: params.status });
    }

    // Ordenar por nome
    query.orderBy('person.nome_completo', 'ASC');

    // Paginação
    console.log('📝 [PROFESSORES] SQL Query:', query.getQueryAndParameters());

    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    console.log('📊 [PROFESSORES] Resultados:', {
      total,
      items: items.length,
      professores: items.map((p) => ({
        id: p.id,
        nome: p.nome_completo,
        unidade_id: p.unidade_id,
      })),
    });

    // Buscar unidades de cada professor
    const itemsWithUnidades = await Promise.all(
      items.map(async (professor) => {
        const unidades = await this.professorUnidadeRepository
          .createQueryBuilder('pu')
          .leftJoinAndSelect('pu.unidade', 'unidade')
          .select([
            'pu.id',
            'pu.is_principal',
            'pu.data_vinculo',
            'pu.data_desvinculo',
            'pu.ativo',
            'pu.observacoes',
            'unidade.id',
            'unidade.nome',
            'unidade.cnpj',
            'unidade.telefone_fixo',
            'unidade.telefone_celular',
            'unidade.email',
          ])
          .where('pu.professor_id = :professorId', {
            professorId: professor.id,
          })
          .andWhere('pu.ativo = :ativo', { ativo: true })
          .getMany();
        return {
          ...professor,
          unidades: unidades.map((pu) => ({
            ...pu.unidade,
            is_principal: pu.is_principal,
          })),
        };
      }),
    );

    return {
      items: itemsWithUnidades,
      page,
      pageSize,
      total,
      hasNextPage: page * pageSize < total,
    };
  }

  async findById(id: string, user?: any): Promise<any> {
    const professor = await this.personRepository.findOne({
      where: { id, tipo_cadastro: TipoCadastro.PROFESSOR },
    });

    if (!professor) {
      throw new NotFoundException(`Professor com ID ${id} não encontrado`);
    }

    // Se franqueado (não master), verifica se professor pertence às suas unidades
    if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (franqueadoId) {
        const unidadesDeFranqueado =
          await this.getUnidadesDeFranqueado(franqueadoId);
        if (!unidadesDeFranqueado.includes(professor.unidade_id)) {
          throw new NotFoundException('Professor não encontrado');
        }
      }
    }

    // Buscar unidades
    const unidades = await this.professorUnidadeRepository.find({
      where: { professor_id: id, ativo: true },
      relations: ['unidade'],
    });

    return {
      ...professor,
      unidades: unidades.map((pu) => ({
        ...pu.unidade,
        is_principal: pu.is_principal,
      })),
    };
  }

  async create(dto: CreateProfessorDto): Promise<Person> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Verificar se CPF já existe
      const existingPerson = await this.personRepository.findOne({
        where: { cpf: dto.cpf },
      });

      if (existingPerson) {
        throw new ConflictException('CPF já cadastrado');
      }

      // 2. Validar faixa (apenas AZUL, ROXA, MARROM, PRETA, CORAL, VERMELHA)
      const faixasPermitidas = [
        'AZUL',
        'ROXA',
        'MARROM',
        'PRETA',
        'CORAL',
        'VERMELHA',
      ];
      if (!faixasPermitidas.includes(dto.faixa_ministrante)) {
        throw new BadRequestException(
          'Professores devem ter faixa Azul, Roxa, Marrom, Preta, Coral ou Vermelha',
        );
      }

      // 3. Criar professor
      const professorData: any = {
        ...dto,
        tipo_cadastro: TipoCadastro.PROFESSOR,
        status: dto.status || StatusCadastro.ATIVO,
        data_nascimento: new Date(dto.data_nascimento),
        data_inicio_docencia: dto.data_inicio_docencia
          ? new Date(dto.data_inicio_docencia)
          : undefined,
      };

      const professor = this.personRepository.create(professorData);
      const savedProfessor: any = await queryRunner.manager.save(professor);

      // 4. Vincular à unidade principal
      const unidadePrincipal = queryRunner.manager.create(ProfessorUnidade, {
        professor_id: savedProfessor.id,
        unidade_id: dto.unidade_id,
        is_principal: true,
        ativo: true,
      });
      await queryRunner.manager.save(ProfessorUnidade, unidadePrincipal);

      // 5. Vincular a unidades adicionais (se houver)
      if (dto.unidades_adicionais && dto.unidades_adicionais.length > 0) {
        for (const unidadeId of dto.unidades_adicionais) {
          if (unidadeId !== dto.unidade_id) {
            const unidadeAdicional = queryRunner.manager.create(
              ProfessorUnidade,
              {
                professor_id: savedProfessor.id,
                unidade_id: unidadeId,
                is_principal: false,
                ativo: true,
              },
            );
            await queryRunner.manager.save(ProfessorUnidade, unidadeAdicional);
          }
        }
      }

      await queryRunner.commitTransaction();

      return this.findById(savedProfessor.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(
    id: string,
    dto: UpdateProfessorDto,
    user?: any,
  ): Promise<Person> {
    // Validação de acesso usando findById que já tem a proteção
    await this.findById(id, user);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const professor = await this.personRepository.findOne({
        where: { id, tipo_cadastro: TipoCadastro.PROFESSOR },
      });

      if (!professor) {
        throw new NotFoundException('Professor não encontrado');
      }

      // Verificar CPF único (se estiver sendo alterado)
      if (dto.cpf && dto.cpf !== professor.cpf) {
        const existingPerson = await this.personRepository.findOne({
          where: { cpf: dto.cpf },
        });

        if (existingPerson) {
          throw new ConflictException('CPF já cadastrado');
        }
      }

      // Validar faixa (se estiver sendo alterada)
      if (dto.faixa_ministrante) {
        const faixasPermitidas = [
          'AZUL',
          'ROXA',
          'MARROM',
          'PRETA',
          'CORAL',
          'VERMELHA',
        ];
        if (!faixasPermitidas.includes(dto.faixa_ministrante)) {
          throw new BadRequestException(
            'Professores devem ter faixa Azul, Roxa, Marrom, Preta, Coral ou Vermelha',
          );
        }
      }

      // Atualizar dados do professor
      Object.assign(professor, {
        ...dto,
        data_nascimento: dto.data_nascimento
          ? new Date(dto.data_nascimento)
          : professor.data_nascimento,
        data_inicio_docencia: dto.data_inicio_docencia
          ? new Date(dto.data_inicio_docencia)
          : professor.data_inicio_docencia,
      });

      await queryRunner.manager.save(professor);

      // Atualizar unidades (se fornecidas)
      if (dto.unidade_id || dto.unidades_adicionais) {
        // Desativar todas as unidades antigas
        await queryRunner.manager.update(
          ProfessorUnidade,
          { professor_id: id },
          { ativo: false },
        );

        // Adicionar unidade principal
        if (dto.unidade_id) {
          const existing = await queryRunner.manager.findOne(ProfessorUnidade, {
            where: { professor_id: id, unidade_id: dto.unidade_id },
          });

          if (existing) {
            await queryRunner.manager.update(
              ProfessorUnidade,
              { id: existing.id },
              { ativo: true, is_principal: true },
            );
          } else {
            const unidadePrincipal = queryRunner.manager.create(
              ProfessorUnidade,
              {
                professor_id: id,
                unidade_id: dto.unidade_id,
                is_principal: true,
                ativo: true,
              },
            );
            await queryRunner.manager.save(unidadePrincipal);
          }
        }

        // Adicionar unidades adicionais
        if (dto.unidades_adicionais && dto.unidades_adicionais.length > 0) {
          for (const unidadeId of dto.unidades_adicionais) {
            if (unidadeId !== dto.unidade_id) {
              const existing = await queryRunner.manager.findOne(
                ProfessorUnidade,
                {
                  where: { professor_id: id, unidade_id: unidadeId },
                },
              );

              if (existing) {
                await queryRunner.manager.update(
                  ProfessorUnidade,
                  { id: existing.id },
                  { ativo: true, is_principal: false },
                );
              } else {
                const unidadeAdicional = queryRunner.manager.create(
                  ProfessorUnidade,
                  {
                    professor_id: id,
                    unidade_id: unidadeId,
                    is_principal: false,
                    ativo: true,
                  },
                );
                await queryRunner.manager.save(unidadeAdicional);
              }
            }
          }
        }
      }

      await queryRunner.commitTransaction();

      return this.findById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: string): Promise<void> {
    const professor = await this.personRepository.findOne({
      where: { id, tipo_cadastro: TipoCadastro.PROFESSOR },
    });

    if (!professor) {
      throw new NotFoundException('Professor não encontrado');
    }

    await this.personRepository.remove(professor);
  }

  /**
   * Busca professor por ID do usuário
   */
  async findByUsuarioId(usuarioId: string): Promise<Person | null> {
    const professor = await this.personRepository.findOne({
      where: {
        usuario_id: usuarioId,
        tipo_cadastro: TipoCadastro.PROFESSOR,
      },
    });

    if (!professor) {
      return null;
    }

    // Buscar unidades do professor
    const unidades = await this.professorUnidadeRepository.find({
      where: { professor_id: professor.id, ativo: true },
      relations: ['unidade'],
    });

    return {
      ...professor,
      unidades: unidades.map((pu) => ({
        ...pu.unidade,
        is_principal: pu.is_principal,
      })),
    } as any;
  }

  /**
   * Obtém IDs das unidades onde o professor ministra aulas
   */
  async getUnidadesDoProfessor(professorId: string): Promise<string[]> {
    const unidades = await this.professorUnidadeRepository.find({
      where: { professor_id: professorId, ativo: true },
      select: ['unidade_id'],
    });

    return unidades.map((u) => u.unidade_id);
  }

  // Métodos auxiliares para controle de acesso por perfil
  private isMaster(user: any): boolean {
    const result = user?.perfis?.some((p: any) => {
      const nome = typeof p === 'string' ? p : p?.nome;
      return nome?.toLowerCase() === 'master';
    });
    console.log(
      '🔍 [PROFESSORES] isMaster:',
      result,
      'perfis:',
      user?.perfis?.map((p: any) => (typeof p === 'string' ? p : p?.nome)),
    );
    return result;
  }

  private isFranqueado(user: any): boolean {
    const result = user?.perfis?.some((p: any) => {
      const nome = typeof p === 'string' ? p : p?.nome;
      return nome?.toLowerCase() === 'franqueado';
    });
    console.log(
      '🔍 [PROFESSORES] isFranqueado:',
      result,
      'perfis:',
      user?.perfis?.map((p: any) => (typeof p === 'string' ? p : p?.nome)),
    );
    return result;
  }

  private isGerenteUnidade(user: any): boolean {
    const result = user?.perfis?.some((p: any) => {
      const nome = typeof p === 'string' ? p : p?.nome;
      return (
        nome?.toLowerCase() === 'gerente_unidade' ||
        nome?.toLowerCase() === 'gerente'
      );
    });
    console.log(
      '🔍 [PROFESSORES] isGerenteUnidade:',
      result,
      'perfis:',
      user?.perfis?.map((p: any) => (typeof p === 'string' ? p : p?.nome)),
    );
    return result;
  }

  private async getFranqueadoIdByUser(user: any): Promise<string | null> {
    if (!user?.id) return null;
    const result = await this.dataSource.query(
      `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );
    return result[0]?.id || null;
  }

  private async getUnidadeDoGerente(user: any): Promise<string | null> {
    if (!user?.id) return null;
    // Busca a unidade onde o usuário é gerente
    const result = await this.dataSource.query(
      `SELECT unidade_id FROM teamcruz.pessoas WHERE usuario_id = $1 AND tipo_cadastro = 'GERENTE_UNIDADE' LIMIT 1`,
      [user.id],
    );
    return result[0]?.unidade_id || null;
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
