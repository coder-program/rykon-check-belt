import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Aluno } from '../entities/aluno.entity';
import { UsuariosService } from '../../usuarios/services/usuarios.service';
import { PerfisService } from '../../usuarios/services/perfis.service';

export type AlunoCreate = Partial<Aluno> & { nome: string };

@Injectable()
export class AlunosService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly perfisService: PerfisService,
  ) {}
  private store = new Map<string, Aluno>();

  list(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    faixa?: string;
    unidade?: string;
    status?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const search = (params.search || '').toLowerCase();
    const faixa = params.faixa || 'todos';
    const unidade = (params.unidade || '').toLowerCase();
    const status = params.status || '';

    let items = Array.from(this.store.values());
    if (search)
      items = items.filter(
        (a) =>
          a.nome.toLowerCase().includes(search) ||
          (a.matricula || '').toLowerCase().includes(search),
      );
    if (faixa !== 'todos')
      items = items.filter((a) =>
        faixa === 'kids' ? this.isKids(a.faixa) : !this.isKids(a.faixa),
      );
    if (unidade)
      items = items.filter((a) =>
        (a.academia_unidade || '').toLowerCase().includes(unidade),
      );
    if (status) items = items.filter((a) => a.status_validacao === status);

    const total = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);
    return {
      items: pageItems,
      page,
      pageSize,
      total,
      hasNextPage: end < total,
    };
  }

  async create(body: AlunoCreate) {
    const id = randomUUID();
    const now = new Date();
    // Se marcado para login próprio e não houver usuario_id, cria usuário com perfil aluno
    let usuario_id: string | null = (body as any).usuario_id || null;
    if ((body as any).tem_login_proprio && !usuario_id) {
      let perfilAluno = await this.perfisService.findByName('aluno');
      if (!perfilAluno) {
        perfilAluno = await this.perfisService.create({
          nome: 'aluno',
          descricao: 'Perfil de aluno',
          permissao_ids: [],
        } as any);
      }
      const password =
        (body as any).password || (body as any).usuario_password || 'Aluno@123';
      const user = await this.usuariosService.create({
        username: (body as any).email || `aluno_${Date.now()}`,
        email: (body as any).email,
        nome: body.nome,
        password,
        ativo: true,
        perfil_ids: [perfilAluno.id],
      } as any);
      usuario_id = user.id;
    }

    const a: any = {
      id,
      nome: body.nome,
      email: body.email || '',
      telefone: body.telefone || '',
      cpf: body.cpf || '',
      data_nascimento: body.data_nascimento
        ? new Date(body.data_nascimento)
        : now,
      genero: (body.genero as any) || 'masculino',
      peso: Number(body.peso || 0),
      altura: Number(body.altura || 0),
      contato_emergencia_nome: body.contato_emergencia_nome || '',
      contato_emergencia_telefone: body.contato_emergencia_telefone || '',
      matricula:
        body.matricula ||
        `AL${now.getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      faixa: body.faixa || 'Branca',
      graus: Number(body.graus || 0),
      data_inicio_jiu_jitsu: body.data_inicio_jiu_jitsu
        ? new Date(body.data_inicio_jiu_jitsu)
        : now,
      academia_unidade: body.academia_unidade || '',
      turma: body.turma || '',
      categoria_peso: this.categoriaPeso(Number(body.peso || 0)),
      objetivo: body.objetivo || 'Saúde',
      categoria_ibjjf: (body as any).categoria_ibjjf || null,
      dias_ausentes: Number(body.dias_ausentes || 0),
      dias_consecutivos: Number(body.dias_consecutivos || 0),
      ultima_presenca: body.ultima_presenca
        ? new Date(body.ultima_presenca)
        : null,
      total_aulas_mes: Number(body.total_aulas_mes || 0),
      percentual_frequencia: Number(body.percentual_frequencia || 0),
      professor_id: (body as any).professor_id || null,
      status_validacao: (body as any).status_validacao || 'pendente',
      responsavel_id: (body as any).responsavel_id || null,
      usuario_id: usuario_id,
      tem_login_proprio: (body as any).tem_login_proprio ?? false,
      plano: (body.plano as any) || 'mensal',
      valor_mensalidade: Number(body.valor_mensalidade || 0),
      status_pagamento: (body.status_pagamento as any) || 'em_dia',
      data_vencimento: body.data_vencimento
        ? new Date(body.data_vencimento)
        : now,
      restricoes_medicas: body.restricoes_medicas || null,
      observacoes: body.observacoes || null,
      liberacao_imagem: body.liberacao_imagem ?? true,
      ativo: body.ativo ?? true,
      data_matricula: now,
      data_inativacao: null,
      motivo_inativacao: null,
      created_at: now,
      updated_at: now,
      idade: this.calculaIdade(
        body.data_nascimento ? new Date(body.data_nascimento) : now,
      ),
    };
    this.store.set(id, a as Aluno);
    return a as Aluno;
  }

  update(id: string, body: Partial<Aluno>) {
    const a = this.store.get(id);
    if (!a) return null;
    const updated = { ...a, ...body, updated_at: new Date() } as Aluno;
    this.store.set(id, updated);
    return updated;
  }

  get(id: string) {
    return this.store.get(id) || null;
  }

  remove(id: string) {
    return this.store.delete(id);
  }

  private calculaIdade(dt: Date) {
    const d = new Date(dt);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }
  private isKids(faixa: string) {
    const lower = (faixa || '').toLowerCase();
    return ['cinza', 'amarela', 'laranja', 'verde'].some((c) =>
      lower.includes(c),
    );
  }
  private categoriaPeso(kg: number) {
    if (!kg) return 'N/A';
    if (kg < 57) return 'Galo';
    if (kg < 64) return 'Pluma';
    if (kg < 70) return 'Pena';
    if (kg < 76) return 'Leve';
    if (kg < 82) return 'Médio';
    if (kg < 88) return 'Meio-Pesado';
    if (kg < 94) return 'Pesado';
    if (kg < 100) return 'Super-Pesado';
    return 'Pesadíssimo';
  }
}
