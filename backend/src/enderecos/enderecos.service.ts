import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import axios from 'axios';

export type TipoDonoEndereco =
  | 'ALUNO'
  | 'PROFESSOR'
  | 'UNIDADE'
  | 'FRANQUEADO'
  | 'FUNCIONARIO';
export type FinalidadeEndereco =
  | 'RESIDENCIAL'
  | 'COMERCIAL'
  | 'COBRANCA'
  | 'ENTREGA'
  | 'OUTRO';

export interface CreateEnderecoDTO {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro?: string | null;
  cidade_nome?: string | null;
  estado?: string | null;
  codigo_pais?: string; // default 'BR'
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateEnderecoDTO extends Partial<CreateEnderecoDTO> {}

export interface VincularEnderecoDTO {
  tipo_dono: TipoDonoEndereco;
  dono_id: string;
  endereco_id: string;
  finalidade?: FinalidadeEndereco; // default RESIDENCIAL
  principal?: boolean; // default false
  valido_de?: string | null; // ISO date
  valido_ate?: string | null; // ISO date
}

@Injectable()
export class EnderecosService {
  constructor(private readonly dataSource: DataSource) {}

  async criarEndereco(dto: CreateEnderecoDTO) {
    const q = `INSERT INTO teamcruz.enderecos
      (id, cep, logradouro, numero, complemento, bairro, cidade_nome, estado, codigo_pais, latitude, longitude, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1,$2,$3,$4,$5,$6,$7,COALESCE($8,'BR'),$9,$10, now(), now())
      RETURNING *`;
    const params = [
      dto.cep,
      dto.logradouro,
      dto.numero,
      dto.complemento ?? null,
      dto.bairro ?? null,
      dto.cidade_nome ?? null,
      dto.estado ?? null,
      dto.codigo_pais ?? 'BR',
      dto.latitude ?? null,
      dto.longitude ?? null,
    ];
    const res = await this.dataSource.query(q, params);
    return res[0];
  }

  async obterEndereco(id: string) {
    const res = await this.dataSource.query(
      `SELECT * FROM teamcruz.enderecos WHERE id = $1`,
      [id],
    );
    return res[0] || null;
  }

  async atualizarEndereco(id: string, dto: UpdateEnderecoDTO) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(dto)) {
      fields.push(`${k} = $${idx++}`);
      values.push(v);
    }
    if (!fields.length) return this.obterEndereco(id);
    values.push(id);
    const q = `UPDATE teamcruz.enderecos SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`;
    const res = await this.dataSource.query(q, values);
    return res[0] || null;
  }

  async removerEndereco(id: string) {
    await this.dataSource.query(`DELETE FROM teamcruz.enderecos WHERE id = $1`, [id]);
    return true;
  }

  async vincularEndereco(dto: VincularEnderecoDTO) {
    const q = `INSERT INTO teamcruz.vinculos_endereco
      (id, tipo_dono, dono_id, endereco_id, finalidade, principal, valido_de, valido_ate, created_at, updated_at)
      VALUES (uuid_generate_v4(), $1,$2,$3, COALESCE($4,'RESIDENCIAL'), COALESCE($5,false), $6, $7, now(), now())
      RETURNING *`;
    const res = await this.dataSource.query(q, [
      dto.tipo_dono,
      dto.dono_id,
      dto.endereco_id,
      dto.finalidade ?? 'RESIDENCIAL',
      dto.principal ?? false,
      dto.valido_de ?? null,
      dto.valido_ate ?? null,
    ]);
    return res[0];
  }

  async listarPorDono(tipo_dono: TipoDonoEndereco, dono_id: string) {
    const q = `SELECT ve.*, e.*
      FROM teamcruz.vinculos_endereco ve
      JOIN teamcruz.enderecos e ON e.id = ve.endereco_id
      WHERE ve.tipo_dono = $1 AND ve.dono_id = $2
      ORDER BY ve.principal DESC, ve.created_at DESC`;
    return this.dataSource.query(q, [tipo_dono, dono_id]);
  }

  async definirPrincipal(
    tipo_dono: TipoDonoEndereco,
    dono_id: string,
    finalidade: FinalidadeEndereco,
    endereco_id: string,
  ) {
    await this.dataSource.query(
      `UPDATE teamcruz.vinculos_endereco SET principal = false, updated_at = now()
       WHERE tipo_dono = $1 AND dono_id = $2 AND finalidade = $3 AND principal = true`,
      [tipo_dono, dono_id, finalidade],
    );
    const res = await this.dataSource.query(
      `UPDATE teamcruz.vinculos_endereco SET principal = true, updated_at = now()
       WHERE tipo_dono = $1 AND dono_id = $2 AND finalidade = $3 AND endereco_id = $4
       RETURNING *`,
      [tipo_dono, dono_id, finalidade, endereco_id],
    );
    return res[0] || null;
  }

  async viaCep(cep: string) {
    const onlyDigits = cep.replace(/\D/g, '');
    const url = `https://viacep.com.br/ws/${onlyDigits}/json/`;
    const resp = await axios.get(url);
    if (resp.data && !resp.data.erro) {
      return {
        cep: resp.data.cep?.replace(/\D/g, ''),
        logradouro: resp.data.logradouro,
        complemento: resp.data.complemento || null,
        bairro: resp.data.bairro,
        cidade_nome: resp.data.localidade,
        estado: resp.data.uf,
        codigo_pais: 'BR',
      };
    }
    return null;
  }
}
