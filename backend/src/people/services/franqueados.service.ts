import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Franqueado } from '../entities/franqueado-simplified.entity';
import {
  CreateFranqueadoSimplifiedDto,
  UpdateFranqueadoSimplifiedDto,
} from '../dto/franqueado-simplified.dto';

@Injectable()
export class FranqueadosService {
  constructor(private readonly dataSource: DataSource) {}

  async list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    situacao?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      whereConditions.push(
        `(f.nome ILIKE $${paramIndex} OR f.cpf ILIKE $${paramIndex} OR f.email ILIKE $${paramIndex})`,
      );
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.situacao) {
      whereConditions.push(`f.situacao = $${paramIndex}`);
      queryParams.push(params.situacao);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Query para buscar franqueados com informações do usuário
    const itemsQuery = `
      SELECT
        f.*,
        u.nome as usuario_nome,
        u.email as usuario_email,
        COALESCE(array_length(f.unidades_gerencia, 1), 0) as total_unidades
      FROM teamcruz.franqueados f
      LEFT JOIN teamcruz.usuarios u ON f.usuario_id = u.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM teamcruz.franqueados f
      ${whereClause}
    `;

    queryParams.push(pageSize, offset);

    const [items, countResult] = await Promise.all([
      this.dataSource.query(
        itemsQuery,
        queryParams.slice(0, -2).concat([pageSize, offset]),
      ),
      this.dataSource.query(countQuery, queryParams.slice(0, -2)),
    ]);

    const total = parseInt(countResult[0]?.total || '0');

    return {
      items,
      page,
      pageSize,
      total,
      hasNextPage: offset + pageSize < total,
    };
  }

  async get(id: string): Promise<Franqueado | null> {
    const query = `
      SELECT
        f.*,
        u.nome as usuario_nome,
        u.email as usuario_email,
        COALESCE(array_length(f.unidades_gerencia, 1), 0) as total_unidades
      FROM teamcruz.franqueados f
      LEFT JOIN teamcruz.usuarios u ON f.usuario_id = u.id
      WHERE f.id = $1 AND f.ativo = true
    `;

    const result = await this.dataSource.query(query, [id]);
    return result[0] || null;
  }

  async getByUsuarioId(usuarioId: string): Promise<Franqueado | null> {
    const query = `
      SELECT
        f.*,
        u.nome as usuario_nome,
        u.email as usuario_email,
        COALESCE(array_length(f.unidades_gerencia, 1), 0) as total_unidades
      FROM teamcruz.franqueados f
      LEFT JOIN teamcruz.usuarios u ON f.usuario_id = u.id
      WHERE f.usuario_id = $1 AND f.ativo = true
    `;

    const result = await this.dataSource.query(query, [usuarioId]);
    return result[0] || null;
  }

  async create(body: CreateFranqueadoSimplifiedDto): Promise<Franqueado> {
    const query = `
      INSERT INTO teamcruz.franqueados (
        nome, cpf, email, telefone, usuario_id,
        endereco_id, unidades_gerencia, situacao, ativo,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        NOW(), NOW()
      ) RETURNING *
    `;

    const params = [
      body.nome,
      body.cpf,
      body.email,
      body.telefone,
      body.usuario_id || null,
      body.endereco_id || null,
      body.unidades_gerencia || [],
      body.situacao || 'EM_HOMOLOGACAO',
      body.ativo ?? true,
    ];

    console.log('🔍 [Service] Executando query:', query);
    console.log('🔍 [Service] Parâmetros:', params);

    const result = await this.dataSource.query(query, params);

    // Se tem usuario_id, atualizar o campo cadastro_completo do usuário
    if (body.usuario_id) {
      await this.dataSource.query(
        `UPDATE teamcruz.usuarios SET cadastro_completo = true WHERE id = $1`,
        [body.usuario_id],
      );
      console.log(
        '✅ [Service] Campo cadastro_completo atualizado para usuario_id:',
        body.usuario_id,
      );
    }

    return result[0];
  }

  async update(
    id: string,
    body: UpdateFranqueadoSimplifiedDto,
  ): Promise<Franqueado> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (body.nome !== undefined) {
      fields.push(`nome = $${paramIndex++}`);
      params.push(body.nome);
    }
    if (body.cpf !== undefined) {
      fields.push(`cpf = $${paramIndex++}`);
      params.push(body.cpf);
    }
    if (body.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      params.push(body.email);
    }
    if (body.telefone !== undefined) {
      fields.push(`telefone = $${paramIndex++}`);
      params.push(body.telefone);
    }
    if (body.usuario_id !== undefined) {
      fields.push(`usuario_id = $${paramIndex++}`);
      params.push(body.usuario_id);
    }
    if (body.endereco_id !== undefined) {
      fields.push(`endereco_id = $${paramIndex++}`);
      params.push(body.endereco_id);
    }
    if (body.unidades_gerencia !== undefined) {
      fields.push(`unidades_gerencia = $${paramIndex++}`);
      params.push(body.unidades_gerencia);
    }
    if (body.situacao !== undefined) {
      fields.push(`situacao = $${paramIndex++}`);
      params.push(body.situacao);
    }
    if (body.ativo !== undefined) {
      fields.push(`ativo = $${paramIndex++}`);
      params.push(body.ativo);
    }

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE teamcruz.franqueados
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.dataSource.query(query, params);

    // Se tem usuario_id, garantir que cadastro_completo seja true
    if (result[0]?.usuario_id) {
      await this.dataSource.query(
        `UPDATE teamcruz.usuarios SET cadastro_completo = true WHERE id = $1`,
        [result[0].usuario_id],
      );
      console.log(
        '✅ [Service] Campo cadastro_completo atualizado para usuario_id:',
        result[0].usuario_id,
      );
    }

    return result[0];
  }

  async remove(id: string): Promise<void> {
    // Soft delete para evitar problemas de constraint com unidades/professores
    const query = `
      UPDATE teamcruz.franqueados
      SET ativo = false, updated_at = NOW()
      WHERE id = $1
    `;
    await this.dataSource.query(query, [id]);
  }

  // Método para vincular/desvincular unidades
  async updateUnidadesGerencia(
    franqueadoId: string,
    unidadeIds: string[],
  ): Promise<Franqueado> {
    const query = `
      UPDATE teamcruz.franqueados
      SET unidades_gerencia = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await this.dataSource.query(query, [
      unidadeIds,
      franqueadoId,
    ]);
    return result[0];
  }

  // Método para buscar franqueados por unidade
  async getByUnidade(unidadeId: string): Promise<Franqueado[]> {
    const query = `
      SELECT
        f.*,
        u.nome as usuario_nome,
        u.email as usuario_email,
        COALESCE(array_length(f.unidades_gerencia, 1), 0) as total_unidades
      FROM teamcruz.franqueados f
      LEFT JOIN teamcruz.usuarios u ON f.usuario_id = u.id
      WHERE $1 = ANY(f.unidades_gerencia)
      AND f.ativo = true
    `;

    return this.dataSource.query(query, [unidadeId]);
  }
}
