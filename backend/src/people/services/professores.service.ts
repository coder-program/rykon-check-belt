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

  async list(params: ListProfessoresParams) {
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

    // Ordenar por nome
    query.orderBy('person.nome_completo', 'ASC');

    // Paginação
    const [items, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

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

  async findById(id: string): Promise<any> {
    const professor = await this.personRepository.findOne({
      where: { id, tipo_cadastro: TipoCadastro.PROFESSOR },
    });

    if (!professor) {
      throw new NotFoundException(`Professor com ID ${id} não encontrado`);
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

  async update(id: string, dto: UpdateProfessorDto): Promise<Person> {
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
}
