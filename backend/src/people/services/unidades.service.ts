import {
  BadRequestException,
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
      (franqueado_id, nome, cnpj, razao_social, nome_fantasia, inscricao_estadual, inscricao_municipal,
       telefone_fixo, telefone_celular, email, website, redes_sociais,
       status, horarios_funcionamento, endereco_id, requer_aprovacao_checkin, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,'HOMOLOGACAO')::teamcruz.status_unidade_enum,
              $14,$15,COALESCE($16,FALSE),NOW(),NOW())
      RETURNING *`;

    const params = [
      dto.franqueado_id,
      dto.nome,
      dto.cnpj,
      dto.razao_social ?? null,
      dto.nome_fantasia ?? null,
      dto.inscricao_estadual ?? null,
      dto.inscricao_municipal ?? null,
      dto.telefone_fixo ?? null,
      dto.telefone_celular ?? null,
      dto.email ?? null,
      dto.website ?? null,
      dto.redes_sociais ? JSON.stringify(dto.redes_sociais) : null,
      dto.status ?? 'HOMOLOGACAO',
      dto.horarios_funcionamento
        ? JSON.stringify(dto.horarios_funcionamento)
        : null,
      dto.endereco_id ?? null,
      dto.requer_aprovacao_checkin ?? false,
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

      // Se usuário NÃO é MASTER, força status HOMOLOGACAO
      if (user && !this.isMaster(user)) {
        params[12] = 'HOMOLOGACAO'; // índice 12 é o status na query (posição $13)
      }

      // Validar CNPJ duplicado apenas quando CNPJ for informado
      if (dto.cnpj && dto.cnpj.trim() !== '') {
        const cnpjExistente = await this.dataSource.query(
          'SELECT id FROM teamcruz.unidades WHERE cnpj = $1',
          [dto.cnpj],
        );
        if (cnpjExistente && cnpjExistente.length > 0) {
          throw new ConflictException('CNPJ já cadastrado para outra unidade.');
        }
      }

      const res = await this.dataSource.query(q, params);
      // Ao criar, retornar também o endereço populado (quando houver)
      return await this.formatarUnidadeComEndereco(res[0]);
    } catch (e: any) {
      // Se já tratamos o erro de CNPJ duplicado acima, não precisa verificar novamente
      // Apenas propagar outros erros
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
      franqueado_id?: string;
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

    // Filtrar por franqueado_id se fornecido explicitamente na query
    if (params.franqueado_id) {
      whereConditions.push(`u.franqueado_id = $${paramIndex}`);
      queryParams.push(params.franqueado_id);
      paramIndex++;
      // Se o franqueado está filtrando suas unidades explicitamente, mostrar TODAS (incluindo inativas)
      // Não adicionar filtro de status aqui
    }
    // Se gerente de unidade, filtra pela unidade que ele gerencia
    else if (user && this.isGerenteUnidade(user) && !this.isMaster(user)) {
      const unidadeId = await this.getUnidadeIdByGerente(user);
      if (unidadeId) {
        whereConditions.push(`u.id = $${paramIndex}`);
        queryParams.push(unidadeId);
        paramIndex++;
      } else {
        console.warn(
          '⚠️ [UnidadesService.listar] Gerente sem unidade vinculada!',
        );
      }
    }
    // Se recepcionista, filtra pelas unidades que ele trabalha
    else if (user && this.isRecepcionista(user) && !this.isMaster(user)) {
      const unidadeIds = await this.getUnidadesIdsByRecepcionista(user);
      if (unidadeIds && unidadeIds.length > 0) {
        const placeholders = unidadeIds
          .map((_, i) => `$${paramIndex + i}`)
          .join(',');
        whereConditions.push(`u.id IN (${placeholders})`);
        queryParams.push(...unidadeIds);
        paramIndex += unidadeIds.length;
      }
    }
    // Se franqueado (não master), filtra por sua franquia
    else if (user && this.isFranqueado(user) && !this.isMaster(user)) {
      const franqueadoId = await this.getFranqueadoIdByUser(user);
      if (franqueadoId) {
        whereConditions.push(`u.franqueado_id = $${paramIndex}`);
        queryParams.push(franqueadoId);
        paramIndex++;
        // Franqueado vendo suas próprias unidades: mostrar TODAS (incluindo inativas)
      }
    }
    // Se não foi especificado franqueado_id e não tem filtro de status,
    // e não é franqueado logado NEM master, excluir inativas por padrão
    else if (
      !params.franqueado_id &&
      (!params.status || params.status === 'todos') &&
      user &&
      !this.isMaster(user)
    ) {
      whereConditions.push(`u.status != 'INATIVA'`);
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

  // Método PÚBLICO para listagem de unidades ativas (cadastro público)
  async listarPublicasAtivas(): Promise<any[]> {
    console.log(
      '🔍 [UNIDADES SERVICE] Executando query listarPublicasAtivas...',
    );
    const q = `
      SELECT u.id, u.nome, u.status, u.endereco_id,
             e.cidade, e.estado, e.bairro
      FROM teamcruz.unidades u
      LEFT JOIN teamcruz.enderecos e ON e.id = u.endereco_id
      WHERE u.status = 'ATIVA'
      ORDER BY u.nome ASC
    `;
    const res = await this.dataSource.query(q);
    console.log(`✅ [UNIDADES SERVICE] Query retornou ${res.length} registros`);
    console.log('📋 [UNIDADES SERVICE] Primeiras 3 unidades:', res.slice(0, 3));
    console.log('📋 [UNIDADES SERVICE] Últimas 3 unidades:', res.slice(-3));
    return res;
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
    // Validar CNPJ duplicado apenas quando CNPJ for informado e diferente de vazio
    if (dto.cnpj !== undefined && dto.cnpj && dto.cnpj.trim() !== '') {
      const cnpjExistente = await this.dataSource.query(
        'SELECT id FROM teamcruz.unidades WHERE cnpj = $1 AND id != $2',
        [dto.cnpj, id],
      );
      if (cnpjExistente && cnpjExistente.length > 0) {
        throw new ConflictException('CNPJ já cadastrado para outra unidade.');
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        // Se não for MASTER, não permitir alteração de status
        if (key === 'status' && user && !this.isMaster(user)) {
          continue; // pula este campo
        }

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

    // valida escopo quando for gerente de unidade (pode editar apenas SUA unidade)
    if (user && this.isGerenteUnidade(user) && !this.isMaster(user)) {
      const unidadeDoGerente = await this.getUnidadeIdByGerente(user);
      if (!unidadeDoGerente || unidadeDoGerente !== id) {
        throw new ForbiddenException(
          'Gerente só pode editar sua própria unidade',
        );
      }
    }

    if (!fields.length) return this.obter(id, user);

    values.push(id);
    const q = `UPDATE teamcruz.unidades SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;

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

    // Verificar se há professores vinculados à unidade
    const professoresVinculados = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM teamcruz.professor_unidades
       WHERE unidade_id = $1 AND ativo = TRUE`,
      [id],
    );

    if (professoresVinculados[0]?.total > 0) {
      throw new BadRequestException(
        `Não é possível excluir esta unidade pois há ${professoresVinculados[0].total} professor(es) vinculado(s). Remova os vínculos primeiro.`,
      );
    }

    // Verificar se há alunos vinculados à unidade
    const alunosVinculados = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM teamcruz.alunos
       WHERE unidade_id = $1`,
      [id],
    );

    if (alunosVinculados[0]?.total > 0) {
      throw new BadRequestException(
        `Não é possível excluir esta unidade pois há ${alunosVinculados[0].total} aluno(s) vinculado(s). Remova os vínculos primeiro.`,
      );
    }

    // Verificar se há recepcionistas vinculados à unidade
    const recepcionistasVinculados = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM teamcruz.recepcionista_unidades
       WHERE unidade_id = $1 AND ativo = TRUE`,
      [id],
    );

    if (recepcionistasVinculados[0]?.total > 0) {
      throw new BadRequestException(
        `Não é possível excluir esta unidade pois há ${recepcionistasVinculados[0].total} recepcionista(s) vinculado(s). Remova os vínculos primeiro.`,
      );
    }

    // Verificar se há gerentes vinculados à unidade
    const gerentesVinculados = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM teamcruz.gerente_unidades
       WHERE unidade_id = $1 AND ativo = TRUE`,
      [id],
    );

    if (gerentesVinculados[0]?.total > 0) {
      throw new BadRequestException(
        `Não é possível excluir esta unidade pois há ${gerentesVinculados[0].total} gerente(s) vinculado(s). Remova os vínculos primeiro.`,
      );
    }

    // Soft delete - marca como INATIVA em vez de deletar
    const res = await this.dataSource.query(
      `UPDATE teamcruz.unidades SET status = 'INATIVA', updated_at = NOW() WHERE id = $1 RETURNING id, nome, status`,
      [id],
    );

    return res.length > 0;
  }

  async obterEstatisticas(user?: any): Promise<{
    total: number;
    ativas: number;
    inativas: number;
    homologacao: number;
  }> {
    let whereClause = '';
    let queryParams: any[] = [];

    // Se gerente de unidade, filtra pela unidade que ele gerencia
    if (user && this.isGerenteUnidade(user) && !this.isMaster(user)) {
      const unidadeId = await this.getUnidadeIdByGerente(user);
      if (unidadeId) {
        whereClause = 'WHERE id = $1';
        queryParams.push(unidadeId);
      }
    }
    // Se recepcionista, filtra pelas unidades que ele trabalha
    else if (user && this.isRecepcionista(user) && !this.isMaster(user)) {
      const unidadeIds = await this.getUnidadesIdsByRecepcionista(user);
      if (unidadeIds && unidadeIds.length > 0) {
        const placeholders = unidadeIds.map((_, i) => `$${i + 1}`).join(',');
        whereClause = `WHERE id IN (${placeholders})`;
        queryParams.push(...unidadeIds);
      }
    }
    // Se franqueado (não master), filtra por sua franquia
    else if (user && this.isFranqueado(user) && !this.isMaster(user)) {
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

  private isGerenteUnidade(user: any): boolean {
    const perfis = (user?.perfis || []).map((p: any) =>
      (p.nome || '').toLowerCase(),
    );
    return perfis.includes('gerente_unidade') || perfis.includes('gerente');
  }

  private isRecepcionista(user: any): boolean {
    const perfis = (user?.perfis || []).map((p: any) =>
      (p.nome || '').toLowerCase(),
    );
    return perfis.includes('recepcionista');
  }

  private async getFranqueadoIdByUser(user: any): Promise<string | null> {
    if (!user?.id) return null;
    const res = await this.dataSource.query(
      `SELECT id FROM teamcruz.franqueados WHERE usuario_id = $1 LIMIT 1`,
      [user.id],
    );
    return res[0]?.id || null;
  }

  async findUnidadesByFranqueado(userId: string): Promise<Unidade[]> {
    const franqueadoId = await this.getFranqueadoIdByUser({ id: userId });
    if (!franqueadoId) return [];

    const res = await this.dataSource.query(
      `SELECT * FROM teamcruz.unidades WHERE franqueado_id = $1`,
      [franqueadoId],
    );

    return res.map((row: any) => this.formatarUnidade(row));
  }

  private async getUnidadeIdByGerente(user: any): Promise<string | null> {
    if (!user?.id) return null;

    // Buscar unidade vinculada ao gerente através da tabela gerente_unidades
    const result = await this.dataSource.query(
      `SELECT gu.unidade_id
       FROM teamcruz.gerente_unidades gu
       WHERE gu.usuario_id = $1
         AND gu.ativo = true
       LIMIT 1`,
      [user.id],
    );

    const unidadeId = result.length > 0 ? result[0].unidade_id : null;
    return unidadeId;
  }

  private async getUnidadeIdByRecepcionista(user: any): Promise<string | null> {
    // MÉTODO ANTIGO - mantido para compatibilidade
    // Por enquanto retorna null - usar getUnidadesIdsByRecepcionista
    return null;
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
      // Contato
      telefone_fixo: row.telefone_fixo,
      telefone_celular: row.telefone_celular,
      email: row.email,
      website: row.website,
      redes_sociais: row.redes_sociais,
      // Status
      status: row.status,
      requer_aprovacao_checkin: row.requer_aprovacao_checkin || false,
      // Geolocalização
      latitude: row.latitude ? parseFloat(row.latitude) : null,
      longitude: row.longitude ? parseFloat(row.longitude) : null,
      // Dados estruturais
      horarios_funcionamento: row.horarios_funcionamento,
      // Endereço
      endereco_id: row.endereco_id || null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    } as Unidade;
  }
}
