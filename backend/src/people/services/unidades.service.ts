import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Unidade, StatusUnidade } from '../entities/unidade.entity';
import { CreateUnidadeDto, UpdateUnidadeDto } from '../dto/unidades.dto';
import { EnderecosService } from '../../enderecos/enderecos.service';

@Injectable()
export class UnidadesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly enderecosService: EnderecosService,
  ) {}

  async criar(dto: CreateUnidadeDto, user?: any): Promise<Unidade> {
    const q = `INSERT INTO teamcruz.unidades
      (franqueado_id, nome, cnpj, status, responsavel_nome, responsavel_cpf, responsavel_papel,
       responsavel_contato, qtde_tatames, capacidade_max_alunos, valor_plano_padrao,
       horarios_funcionamento, modalidades, endereco_id, criado_em, atualizado_em)
      VALUES ($1,$2,$3,COALESCE($4,'HOMOLOGACAO')::status_unidade_enum,$5,$6,$7::papel_responsavel_enum,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
      RETURNING *`;

    const params = [
      dto.franqueado_id,
      dto.nome,
      dto.cnpj,
      dto.status ?? 'HOMOLOGACAO',
      dto.responsavel_nome,
      dto.responsavel_cpf,
      dto.responsavel_papel,
      dto.responsavel_contato,
      dto.qtde_tatames ?? null,
      dto.capacidade_max_alunos ?? null,
      dto.valor_plano_padrao ?? null,
      dto.horarios_funcionamento
        ? JSON.stringify(dto.horarios_funcionamento)
        : null,
      dto.modalidades ? JSON.stringify(dto.modalidades) : null,
      dto.endereco_id ?? null,
    ];

    try {
      // Se usuário é franqueado (e não master), força vincular à sua franquia
      if (user && this.isFranqueado(user) && !this.isMaster(user)) {
        const franqueadoId = await this.getFranqueadoIdByUser(user);
        if (!franqueadoId) {
          throw new ForbiddenException(
            'Usuário franqueado sem franquia associada',
          );
        }
        params[0] = franqueadoId; // sobrescreve franqueado_id informado
      }

      const res = await this.dataSource.query(q, params);
      // Ao criar, retornar também o endereço populado (quando houver)
      return await this.formatarUnidadeComEndereco(res[0]);
    } catch (e: any) {
      // 23505 -> duplicate_key_violation (cnpj único)
      if (e?.code === '23505') {
        throw new ConflictException('CNPJ já cadastrado para outra unidade.');
      }
      throw e;
    }
  }

  private async formatarUnidadeComEndereco(row: any): Promise<any> {
    const unidade: any = this.formatarUnidade(row);
    if (unidade.endereco_id) {
      unidade.endereco = await this.enderecosService.obterEndereco(
        unidade.endereco_id,
      );
    } else {
      unidade.endereco = null;
    }
    return unidade;
  }

  async listar(
    params: {
      page?: string;
      pageSize?: string;
      search?: string;
      status?: StatusUnidade | string;
    },
    user?: any,
  ) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      whereConditions.push(
        `(u.nome ILIKE $${paramIndex} OR u.cnpj ILIKE $${paramIndex} OR u.responsavel_nome ILIKE $${paramIndex})`,
      );
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (
      params.status &&
      params.status !== 'undefined' &&
      params.status !== 'todos'
    ) {
      whereConditions.push(`u.status = $${paramIndex}`);
      queryParams.push(params.status);
      paramIndex++;
    }

    // Se franqueado (não master), filtra por sua franquia
    if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (franqueadoId) {
        whereConditions.push(`u.franqueado_id = $${paramIndex}`);
        queryParams.push(franqueadoId);
        paramIndex++;
      }
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Query para contar total
    const countQ = `SELECT COUNT(*) as total FROM teamcruz.unidades u ${whereClause}`;
    const countRes = await this.dataSource.query(countQ, queryParams);
    const total = parseInt(countRes[0].total);

    // Query com dados
    const q = `SELECT u.*, f.nome as franqueado_nome
      FROM teamcruz.unidades u
      LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
      ${whereClause}
      ORDER BY u.nome ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    queryParams.push(pageSize, offset);
    const res = await this.dataSource.query(q, queryParams);
    const items = await Promise.all(
      res.map((row: any) => this.formatarUnidadeComEndereco(row)),
    );
    return {
      items,
      page,
      pageSize,
      total,
      hasNextPage: offset + pageSize < total,
    };
  }

  async obter(id: string, user?: any): Promise<any> {
    const q = `SELECT u.*, f.nome as franqueado_nome
      FROM teamcruz.unidades u
      LEFT JOIN teamcruz.franqueados f ON f.id = u.franqueado_id
      WHERE u.id = $1`;
    const res = await this.dataSource.query(q, [id]);
    if (!res[0]) return null;
    // se franqueado (não master), verifica se unidade pertence à sua franquia
    if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (res[0].franqueado_id !== franqueadoId) {
        throw new ForbiddenException('Acesso negado à unidade');
      }
    }
    return this.formatarUnidadeComEndereco(res[0]);
  }

  async atualizar(
    id: string,
    dto: UpdateUnidadeDto,
    user?: any,
  ): Promise<Unidade | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        if (key === 'horarios_funcionamento' || key === 'modalidades') {
          fields.push(`${key} = $${idx++}`);
          values.push(value ? JSON.stringify(value) : null);
        } else {
          fields.push(`${key} = $${idx++}`);
          values.push(value);
        }
      }
    }

    // valida escopo quando for franqueado (não master)
    if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const current = await this.dataSource.query(
        `SELECT franqueado_id FROM teamcruz.unidades WHERE id = $1`,
        [id],
      );
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (!current[0] || current[0].franqueado_id !== franqueadoId) {
        throw new ForbiddenException('Não é permitido editar esta unidade');
      }
      // impedir troca de franqueado_id para outro que não o dele
      const idxFranq = fields.findIndex((f) =>
        f.startsWith('franqueado_id = '),
      );
      if (idxFranq >= 0) {
        values[idxFranq] = franqueadoId;
      }
    }

    if (!fields.length) return this.obter(id, user);

    values.push(id);
    const q = `UPDATE teamcruz.unidades SET ${fields.join(', ')}, atualizado_em = NOW() WHERE id = $${idx} RETURNING *`;

    const res = await this.dataSource.query(q, values);
    // Após atualizar, retornar também o endereço populado (quando houver)
    return res[0] ? await this.formatarUnidadeComEndereco(res[0]) : null;
  }

  async remover(id: string, user?: any): Promise<boolean> {
    // valida escopo quando for franqueado (não master)
    if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      const current = await this.dataSource.query(
        `SELECT franqueado_id FROM teamcruz.unidades WHERE id = $1`,
        [id],
      );
      if (!current[0] || current[0].franqueado_id !== franqueadoId) {
        throw new ForbiddenException('Não é permitido remover esta unidade');
      }
    }

    const res = await this.dataSource.query(
      `DELETE FROM teamcruz.unidades WHERE id = $1`,
      [id],
    );
    return res.affectedRows > 0 || res.rowCount > 0;
  }

  async obterEstatisticas(user?: any): Promise<{
    total: number;
    ativas: number;
    inativas: number;
    homologacao: number;
  }> {
    let whereClause = '';
    let queryParams: any[] = [];

    // Se franqueado (não master), filtra por sua franquia
    if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (franqueadoId) {
        whereClause = 'WHERE franqueado_id = $1';
        queryParams.push(franqueadoId);
      }
    }

    const q = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ATIVA') as ativas,
        COUNT(*) FILTER (WHERE status = 'INATIVA') as inativas,
        COUNT(*) FILTER (WHERE status = 'HOMOLOGACAO') as homologacao
      FROM teamcruz.unidades
      ${whereClause}
    `;

    const res = await this.dataSource.query(q, queryParams);
    const stats = res[0];

    return {
      total: parseInt(stats.total) || 0,
      ativas: parseInt(stats.ativas) || 0,
      inativas: parseInt(stats.inativas) || 0,
      homologacao: parseInt(stats.homologacao) || 0,
    };
  }

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

  private async getFranqueadoIdByUser(user: any): Promise<string | null> {
    if (!user?.email) return null;
    const res = await this.dataSource.query(
      `SELECT id FROM teamcruz.franqueados WHERE lower(email) = lower($1) LIMIT 1`,
      [user.email],
    );
    return res[0]?.id || null;
  }

  private formatarUnidade(row: any): Unidade {
    return {
      id: row.id,
      franqueado_id: row.franqueado_id,
      franqueado: null, // Será populado se necessário
      // Identificação
      nome: row.nome,
      cnpj: row.cnpj,
      razao_social: row.razao_social,
      nome_fantasia: row.nome_fantasia,
      inscricao_estadual: row.inscricao_estadual,
      inscricao_municipal: row.inscricao_municipal,
      codigo_interno: row.codigo_interno,
      // Contato
      telefone_fixo: row.telefone_fixo,
      telefone_celular: row.telefone_celular,
      email: row.email,
      website: row.website,
      redes_sociais: row.redes_sociais,
      // Status
      status: row.status,
      // Responsável da Unidade (diferente do instrutor principal)
      responsavel_nome: row.responsavel_nome,
      responsavel_cpf: row.responsavel_cpf,
      responsavel_papel: row.responsavel_papel,
      responsavel_contato: row.responsavel_contato,
      // Estrutura
      qtde_tatames: row.qtde_tatames,
      area_tatame_m2: row.area_tatame_m2 ? parseFloat(row.area_tatame_m2) : null,
      capacidade_max_alunos: row.capacidade_max_alunos,
      qtde_instrutores: row.qtde_instrutores || 0,
      valor_plano_padrao: row.valor_plano_padrao
        ? parseFloat(row.valor_plano_padrao)
        : null,
      horarios_funcionamento: row.horarios_funcionamento,
      modalidades: row.modalidades,
      // Responsável Técnico
      instrutor_principal_id: row.instrutor_principal_id,
      // Endereço
      endereco_id: row.endereco_id || null,
      criado_em: new Date(row.criado_em),
      atualizado_em: new Date(row.atualizado_em),
    } as Unidade;
  }
}
