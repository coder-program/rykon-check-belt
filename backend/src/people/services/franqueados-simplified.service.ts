import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Franqueado } from '../entities/franqueado-simplified.entity';
import {
  CreateFranqueadoSimplifiedDto,
  UpdateFranqueadoSimplifiedDto,
} from '../dto/franqueado-simplified.dto';

@Injectable()
export class FranqueadosServiceSimplified {
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
        u.email as usuario_email
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
        u.email as usuario_email
      FROM teamcruz.franqueados f
      LEFT JOIN teamcruz.usuarios u ON f.usuario_id = u.id
      WHERE f.id = $1
    `;

    const result = await this.dataSource.query(query, [id]);
    return result[0] || null;
  }

  async getByUsuarioId(usuarioId: string): Promise<Franqueado | null> {
    const query = `
      SELECT
        f.*,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM teamcruz.franqueados f
      LEFT JOIN teamcruz.usuarios u ON f.usuario_id = u.id
      WHERE f.usuario_id = $1
    `;

    const result = await this.dataSource.query(query, [usuarioId]);
    return result[0] || null;
  }

  async create(body: CreateFranqueadoSimplifiedDto): Promise<Franqueado> {
    // Verificar se CPF já existe
    const checkCpfQuery = `
      SELECT id, nome FROM teamcruz.franqueados
      WHERE cpf = $1
      LIMIT 1
    `;

    const existingFranqueado = await this.dataSource.query(checkCpfQuery, [
      body.cpf,
    ]);

    if (existingFranqueado && existingFranqueado.length > 0) {
      throw new Error(
        `CPF ${body.cpf} já está cadastrado para o franqueado "${existingFranqueado[0].nome}"`,
      );
    }

    const query = `
      INSERT INTO teamcruz.franqueados (
        nome, cpf, email, telefone, usuario_id,
        endereco_id, situacao, ativo,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8,
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
      body.situacao || 'EM_HOMOLOGACAO',
      body.ativo ?? true, // ✅ Por padrão, franqueados são criados como ativos
    ];

    const result = await this.dataSource.query(query, params);

    // ✅ Atualizar usuário para cadastro_completo = true se situação for ATIVA
    if (body.usuario_id && result[0].situacao === 'ATIVA') {
      try {
        await this.dataSource.query(
          `UPDATE teamcruz.usuarios SET cadastro_completo = true WHERE id = $1`,
          [body.usuario_id],
        );
      } catch (error) {
        console.error('Erro ao atualizar cadastro_completo do usuário:', error);
      }
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

    // ✅ Atualizar usuário para cadastro_completo = true se situação mudou para ATIVA
    if (result[0] && result[0].usuario_id && result[0].situacao === 'ATIVA') {
      try {
        await this.dataSource.query(
          `UPDATE teamcruz.usuarios SET cadastro_completo = true WHERE id = $1`,
          [result[0].usuario_id],
        );
      } catch (error) {
        console.error('Erro ao atualizar cadastro_completo do usuário:', error);
      }
    }

    return result[0];
  }

  async remove(id: string): Promise<void> {
    const query = `DELETE FROM teamcruz.franqueados WHERE id = $1`;
    await this.dataSource.query(query, [id]);
  }

  // Método para buscar franqueados por unidade
  async getByUnidade(unidadeId: string): Promise<Franqueado[]> {
    const query = `
      SELECT
        f.*,
        u.nome as usuario_nome,
        u.email as usuario_email
      FROM teamcruz.franqueados f
      LEFT JOIN teamcruz.usuarios u ON f.usuario_id = u.id
      WHERE EXISTS (
        SELECT 1 FROM teamcruz.unidades un
        WHERE un.id = $1 AND un.franqueado_id = f.id
      )
      AND f.ativo = true
    `;

    return this.dataSource.query(query, [unidadeId]);
  }
}
