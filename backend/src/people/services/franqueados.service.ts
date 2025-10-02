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

  async create(body: Partial<Franqueado> & { nome: string; cnpj: string; razao_social: string }) {
    const q = `INSERT INTO teamcruz.franqueados 
      (nome, cnpj, razao_social, nome_fantasia, inscricao_estadual, inscricao_municipal,
       email, telefone, telefone_fixo, telefone_celular, website, redes_sociais,
       endereco_id, responsavel_nome, responsavel_cpf, responsavel_cargo, 
       responsavel_email, responsavel_telefone, ano_fundacao, missao, visao, valores,
       historico, logotipo_url, situacao, id_matriz, unidades_gerencia, data_contrato, 
       taxa_franquia, dados_bancarios, ativo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
      RETURNING *`;

    const params = [
      body.nome,
      body.cnpj,
      body.razao_social,
      body.nome_fantasia || null,
      body.inscricao_estadual || null,
      body.inscricao_municipal || null,
      body.email || null,
      body.telefone || null,
      body.telefone_fixo || null,
      body.telefone_celular || null,
      body.website || null,
      body.redes_sociais ? JSON.stringify(body.redes_sociais) : null,
      body.endereco_id || null,
      body.responsavel_nome || null,
      body.responsavel_cpf || null,
      body.responsavel_cargo || null,
      body.responsavel_email || null,
      body.responsavel_telefone || null,
      body.ano_fundacao || null,
      body.missao || null,
      body.visao || null,
      body.valores || null,
      body.historico || null,
      body.logotipo_url || null,
      body.situacao || 'EM_HOMOLOGACAO',
      body.id_matriz || null,
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
        if (key === 'dados_bancarios' || key === 'redes_sociais') {
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
      // Identificação
      nome: row.nome,
      cnpj: row.cnpj,
      razao_social: row.razao_social,
      nome_fantasia: row.nome_fantasia,
      inscricao_estadual: row.inscricao_estadual,
      inscricao_municipal: row.inscricao_municipal,
      // Contato
      email: row.email,
      telefone: row.telefone,
      telefone_fixo: row.telefone_fixo,
      telefone_celular: row.telefone_celular,
      website: row.website,
      redes_sociais: row.redes_sociais,
      // Endereço
      endereco_id: row.endereco_id,
      // Responsável Legal
      responsavel_nome: row.responsavel_nome,
      responsavel_cpf: row.responsavel_cpf,
      responsavel_cargo: row.responsavel_cargo,
      responsavel_email: row.responsavel_email,
      responsavel_telefone: row.responsavel_telefone,
      // Informações
      ano_fundacao: row.ano_fundacao,
      total_unidades: row.total_unidades ? parseInt(row.total_unidades) : 0,
      missao: row.missao,
      visao: row.visao,
      valores: row.valores,
      historico: row.historico,
      logotipo_url: row.logotipo_url,
      // Relacionamento Hierárquico
      id_matriz: row.id_matriz,
      // Gestão
      unidades_gerencia: Array.isArray(row.unidades_gerencia)
        ? row.unidades_gerencia
        : [],
      data_contrato: row.data_contrato ? new Date(row.data_contrato) : null,
      taxa_franquia: row.taxa_franquia ? parseFloat(row.taxa_franquia) : 0,
      dados_bancarios: row.dados_bancarios,
      // Status
      situacao: row.situacao || 'EM_HOMOLOGACAO',
      ativo: row.ativo,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    } as Franqueado;
  }
}
