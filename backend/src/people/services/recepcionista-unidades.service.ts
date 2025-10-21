import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RecepcionistaUnidade } from '../entities/recepcionista-unidade.entity';
import {
  CreateRecepcionistaUnidadeDto,
  UpdateRecepcionistaUnidadeDto,
} from '../dto/recepcionista-unidade.dto';

@Injectable()
export class RecepcionistaUnidadesService {
  constructor(
    @InjectRepository(RecepcionistaUnidade)
    private readonly recepcionistaUnidadeRepository: Repository<RecepcionistaUnidade>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Criar vínculo entre recepcionista e unidade
   */
  async create(
    dto: CreateRecepcionistaUnidadeDto,
    user?: any,
  ): Promise<RecepcionistaUnidade> {
    // Verificar se já existe vínculo ativo
    const existente = await this.recepcionistaUnidadeRepository.findOne({
      where: {
        usuario_id: dto.usuario_id,
        unidade_id: dto.unidade_id,
      },
    });

    if (existente) {
      throw new ConflictException(
        'Já existe um vínculo entre este recepcionista e esta unidade',
      );
    }

    const vinculo = this.recepcionistaUnidadeRepository.create({
      ...dto,
      created_by: user?.id,
    });

    return await this.recepcionistaUnidadeRepository.save(vinculo);
  }

  /**
   * Listar todos os vínculos (com filtros opcionais)
   */
  async list(filters?: {
    usuario_id?: string;
    unidade_id?: string;
    ativo?: boolean;
  }): Promise<RecepcionistaUnidade[]> {
    const query = this.recepcionistaUnidadeRepository
      .createQueryBuilder('ru')
      .leftJoinAndSelect('ru.usuario', 'usuario')
      .leftJoinAndSelect('ru.unidade', 'unidade');

    if (filters?.usuario_id) {
      query.andWhere('ru.usuario_id = :usuario_id', {
        usuario_id: filters.usuario_id,
      });
    }

    if (filters?.unidade_id) {
      query.andWhere('ru.unidade_id = :unidade_id', {
        unidade_id: filters.unidade_id,
      });
    }

    if (filters?.ativo !== undefined) {
      query.andWhere('ru.ativo = :ativo', { ativo: filters.ativo });
    }

    query.orderBy('ru.created_at', 'DESC');

    return await query.getMany();
  }

  /**
   * Buscar um vínculo específico por ID
   */
  async findOne(id: string): Promise<RecepcionistaUnidade> {
    const vinculo = await this.recepcionistaUnidadeRepository.findOne({
      where: { id },
      relations: ['usuario', 'unidade'],
    });

    if (!vinculo) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    return vinculo;
  }

  /**
   * Atualizar vínculo
   */
  async update(
    id: string,
    dto: UpdateRecepcionistaUnidadeDto,
    user?: any,
  ): Promise<RecepcionistaUnidade> {
    const vinculo = await this.findOne(id);

    Object.assign(vinculo, dto);
    vinculo.updated_by = user?.id;

    return await this.recepcionistaUnidadeRepository.save(vinculo);
  }

  /**
   * Remover vínculo (soft delete - apenas desativa)
   */
  async remove(id: string, user?: any): Promise<void> {
    const vinculo = await this.findOne(id);

    vinculo.ativo = false;
    vinculo.data_fim = new Date();
    vinculo.updated_by = user?.id;

    await this.recepcionistaUnidadeRepository.save(vinculo);
  }

  /**
   * Deletar vínculo permanentemente
   */
  async delete(id: string): Promise<void> {
    const vinculo = await this.findOne(id);
    await this.recepcionistaUnidadeRepository.remove(vinculo);
  }

  /**
   * Obter todas as unidades de um recepcionista
   */
  async getUnidadesByRecepcionista(usuario_id: string): Promise<any[]> {
    const result = await this.dataSource.query(
      `SELECT
        ru.id as vinculo_id,
        ru.cargo,
        ru.turno,
        ru.horario_entrada,
        ru.horario_saida,
        ru.dias_semana,
        ru.ativo as vinculo_ativo,
        ru.data_inicio,
        u.id as unidade_id,
        u.nome as unidade_nome,
        u.cnpj as unidade_cnpj,
        u.status as unidade_status,
        u.telefone_celular as unidade_telefone,
        u.email as unidade_email,
        u.capacidade_max_alunos,
        COUNT(a.id) FILTER (WHERE a.status = 'ATIVO') as total_alunos_ativos
      FROM teamcruz.recepcionista_unidades ru
      INNER JOIN teamcruz.unidades u ON u.id = ru.unidade_id
      LEFT JOIN teamcruz.alunos a ON a.unidade_id = u.id
      WHERE ru.usuario_id = $1
        AND ru.ativo = true
      GROUP BY
        ru.id, ru.cargo, ru.turno, ru.horario_entrada, ru.horario_saida,
        ru.dias_semana, ru.ativo, ru.data_inicio,
        u.id, u.nome, u.cnpj, u.status, u.telefone_celular, u.email, u.capacidade_max_alunos
      ORDER BY u.nome`,
      [usuario_id],
    );

    return result;
  }

  /**
   * Obter todos os recepcionistas de uma unidade
   */
  async getRecepcionistasByUnidade(unidade_id: string): Promise<any[]> {
    const result = await this.dataSource.query(
      `SELECT
        ru.id as vinculo_id,
        ru.cargo,
        ru.turno,
        ru.horario_entrada,
        ru.horario_saida,
        ru.dias_semana,
        ru.ativo as vinculo_ativo,
        ru.data_inicio,
        u.id as usuario_id,
        u.nome as recepcionista_nome,
        u.email as recepcionista_email,
        u.cpf as recepcionista_cpf,
        u.telefone as recepcionista_telefone
      FROM teamcruz.recepcionista_unidades ru
      INNER JOIN teamcruz.usuarios u ON u.id = ru.usuario_id
      WHERE ru.unidade_id = $1
        AND ru.ativo = true
      ORDER BY ru.turno, u.nome`,
      [unidade_id],
    );

    return result;
  }

  /**
   * Verificar se usuário é recepcionista de determinada unidade
   */
  async isRecepcionistaOfUnidade(
    usuario_id: string,
    unidade_id: string,
  ): Promise<boolean> {
    const count = await this.recepcionistaUnidadeRepository.count({
      where: {
        usuario_id,
        unidade_id,
        ativo: true,
      },
    });

    return count > 0;
  }

  /**
   * Obter IDs das unidades de um recepcionista (para filtros)
   */
  async getUnidadeIds(usuario_id: string): Promise<string[]> {
    const result = await this.dataSource.query(
      `SELECT unidade_id
       FROM teamcruz.recepcionista_unidades
       WHERE usuario_id = $1
         AND ativo = true`,
      [usuario_id],
    );

    return result.map((row: any) => row.unidade_id);
  }
}
