import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Franqueado } from '../entities/franqueado.entity';

@Injectable()
export class FranqueadosService {
  constructor(private readonly dataSource: DataSource) {}

  async list(params: { page?: number; pageSize?: number; search?: string }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (params.search) {
      whereConditions.push(
        `(f.nome ILIKE $${paramIndex} OR f.cnpj ILIKE $${paramIndex} OR f.email ILIKE $${paramIndex})`,
      );
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    // Query para contar total
    const countQ = `SELECT COUNT(*) as total FROM teamcruz.franqueados f ${whereClause}`;
    const countRes = await this.dataSource.query(countQ, queryParams);
    const total = parseInt(countRes[0].total);

    // Query com dados
    const q = `SELECT f.*, 
        (SELECT COUNT(*) FROM teamcruz.unidades u WHERE u.franqueado_id = f.id) as total_unidades
      FROM teamcruz.franqueados f 
      ${whereClause}
      ORDER BY f.nome ASC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    queryParams.push(pageSize, offset);
    const res = await this.dataSource.query(q, queryParams);

    return {
      items: res.map(this.formatarFranqueado),
      page,
      pageSize,
      total,
      hasNextPage: offset + pageSize < total,
    };
  }

  async create(body: Partial<Franqueado> & { nome: string; cnpj: string }) {
    const q = `INSERT INTO teamcruz.franqueados 
      (nome, email, telefone, cnpj, unidades_gerencia, data_contrato, taxa_franquia, dados_bancarios, ativo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`;

    const params = [
      body.nome,
      body.email || '',
      body.telefone || '',
      body.cnpj,
      body.unidades_gerencia || [],
      body.data_contrato || new Date(),
      body.taxa_franquia || 0,
      body.dados_bancarios ? JSON.stringify(body.dados_bancarios) : null,
      body.ativo ?? true,
    ];

    const res = await this.dataSource.query(q, params);
    return this.formatarFranqueado(res[0]);
  }

  async update(id: string, body: Partial<Franqueado>) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        if (key === 'dados_bancarios') {
          fields.push(`${key} = $${idx++}`);
          values.push(value ? JSON.stringify(value) : null);
        } else if (key === 'unidades_gerencia') {
          fields.push(`${key} = $${idx++}`);
          values.push(Array.isArray(value) ? value : []);
        } else {
          fields.push(`${key} = $${idx++}`);
          values.push(value);
        }
      }
    }

    if (!fields.length) return this.get(id);

    values.push(id);
    const q = `UPDATE teamcruz.franqueados SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;

    const res = await this.dataSource.query(q, values);
    return res[0] ? this.formatarFranqueado(res[0]) : null;
  }

  async get(id: string) {
    const q = `SELECT f.*,
        (SELECT COUNT(*) FROM teamcruz.unidades u WHERE u.franqueado_id = f.id) as total_unidades
      FROM teamcruz.franqueados f 
      WHERE f.id = $1`;
    const res = await this.dataSource.query(q, [id]);
    return res[0] ? this.formatarFranqueado(res[0]) : null;
  }

  async remove(id: string) {
    const res = await this.dataSource.query(
      `DELETE FROM teamcruz.franqueados WHERE id = $1`,
      [id],
    );
    return res.affectedRows > 0 || res.rowCount > 0;
  }

  private formatarFranqueado(row: any): Franqueado {
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      telefone: row.telefone,
      cnpj: row.cnpj,
      unidades_gerencia: Array.isArray(row.unidades_gerencia)
        ? row.unidades_gerencia
        : [],
      data_contrato: new Date(row.data_contrato),
      taxa_franquia: row.taxa_franquia ? parseFloat(row.taxa_franquia) : 0,
      dados_bancarios: row.dados_bancarios,
      ativo: row.ativo,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
