import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Professor } from '../entities/professor.entity';

@Injectable()
export class ProfessoresService {
  private store = new Map<string, Professor>();

  list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    unidade?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const search = (params.search || '').toLowerCase();
    const unidade = (params.unidade || '').toLowerCase();

    let items = Array.from(this.store.values());
    if (search)
      items = items.filter((p) => p.nome.toLowerCase().includes(search));
    if (unidade)
      items = items.filter((p) =>
        p.unidades_atua.some((u) => u.toLowerCase().includes(unidade)),
      );

    const total = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
      items: items.slice(start, end),
      page,
      pageSize,
      total,
      hasNextPage: end < total,
    };
  }

  create(body: Partial<Professor> & { nome: string }) {
    const id = randomUUID();
    const now = new Date();
    const p: Professor = {
      id,
      nome: body.nome!,
      email: body.email || '',
      telefone: body.telefone || '',
      cpf: body.cpf || '',
      data_nascimento: body.data_nascimento
        ? new Date(body.data_nascimento)
        : now,
      genero: (body.genero as any) || 'masculino',
      faixa: body.faixa || 'Preta',
      certificacoes: body.certificacoes || [],
      unidades_atua: body.unidades_atua || [],
      data_contratacao: body.data_contratacao
        ? new Date(body.data_contratacao)
        : now,
      salario_base: Number(body.salario_base || 0),
      carga_horaria_semana: Number(body.carga_horaria_semana || 0),
      especialidades: (body.especialidades as any) || [],
      ativo: body.ativo ?? true,
      created_at: now,
      updated_at: now,
    };
    this.store.set(id, p);
    return p;
  }

  update(id: string, body: Partial<Professor>) {
    const p = this.store.get(id);
    if (!p) return null;
    const updated = { ...p, ...body, updated_at: new Date() } as Professor;
    this.store.set(id, updated);
    return updated;
  }

  get(id: string) {
    return this.store.get(id) || null;
  }
  remove(id: string) {
    return this.store.delete(id);
  }
}
