import { http } from "./api";

export type PageResp<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

interface ListAlunosParams {
  page?: number;
  pageSize?: number;
  search?: string;
  unidadeId?: number;
  status?: string;
  ativo?: boolean;
  perfil_id?: number;
}

interface Aluno {
  id: number;
  nome: string;
  nome_completo?: string;
  email: string;
  cpf?: string;
  telefone?: string;
  data_nascimento?: string;
  ativo: boolean;
  unidade?: { id: number; nome: string };
  perfis?: Array<{ nome: string }>;
}

export async function listAlunos(params: ListAlunosParams): Promise<PageResp<Aluno>> {
  // Filtrar valores undefined/null antes de criar URLSearchParams
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  return http(`/alunos?${qs}`, { auth: true });
}

export async function approveAluno(id: string, professor_id: string) {
  return http(`/alunos/${id}/approve`, {
    method: "PATCH",
    body: { professor_id },
    auth: true,
  });
}
export async function createAluno(data: {
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  data_nascimento?: string;
  unidade_id?: number;
  perfil_id?: number;
  ativo?: boolean;
}) {
  // Garantir que tipo_cadastro seja ALUNO
  const alunoData = {
    ...data,
    tipo_cadastro: "ALUNO",
  };
  return http("/alunos", { method: "POST", body: alunoData, auth: true });
}

export async function updateAluno(id: string, data: {
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  data_nascimento?: string;
  unidade_id?: number;
  ativo?: boolean;
}) {
  return http(`/alunos/${id}`, {
    method: "PATCH",
    body: data,
    auth: true,
  });
}

interface Professor {
  id: number;
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  especialidades?: string[];
  unidade_id?: number;
  ativo: boolean;
}

interface ListProfessoresParams {
  page?: number;
  pageSize?: number;
  search?: string;
  unidadeId?: number;
  status?: string;
  ativo?: boolean;
}

export async function listProfessores(params: ListProfessoresParams): Promise<PageResp<Professor>> {
  // Filtrar valores undefined/null antes de criar URLSearchParams
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  return http(`/professores?${qs}`, { auth: true });
}
export async function createProfessor(data: {
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  especialidades?: string[];
  unidade_id?: number;
  ativo?: boolean;
}) {
  // Garantir que tipo_cadastro seja PROFESSOR
  const professorData = {
    ...data,
    tipo_cadastro: "PROFESSOR",
  };
  return http("/professores", {
    method: "POST",
    body: professorData,
    auth: true,
  });
}

export async function updateProfessor(id: string, data: {
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  especialidades?: string[];
  unidade_id?: number;
  ativo?: boolean;
}) {
  return http(`/professores/${id}`, {
    method: "PATCH",
    body: data,
    auth: true,
  });
}

export async function updateProfessorStatus(id: string, status: string) {
  return http(`/professores/${id}`, {
    method: "PATCH",
    body: { status },
    auth: true,
  });
}

export async function deleteProfessor(id: string) {
  return http(`/professores/${id}`, { method: "DELETE", auth: true });
}

export async function listFranqueados(params: any): Promise<PageResp<any>> {
  // Filtrar valores undefined/null/empty antes de criar URLSearchParams
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  return http(`/franqueados?${qs}`);
}

export async function getMyFranqueado() {
  return http("/franqueados/me", { auth: true });
}

export async function createFranqueado(data: any) {
  return http("/franqueados", { method: "POST", body: data, auth: true });
}

export async function updateFranqueado(id: string, data: any) {
  return http(`/franqueados/${id}`, {
    method: "PATCH",
    body: data,
    auth: true,
  });
}

export async function deleteFranqueado(id: string) {
  return http(`/franqueados/${id}`, { method: "DELETE", auth: true });
}

// Instrutores
export async function listInstrutores(params: any): Promise<PageResp<any>> {
  const qs = new URLSearchParams(params).toString();
  return http(`/instrutores?${qs}`);
}

// Unidades
export async function listUnidades(params: any): Promise<PageResp<any>> {
  // Filtrar valores undefined/null antes de criar URLSearchParams
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  return http(`/unidades?${qs}`, { auth: true });
}

export async function createUnidade(data: any) {
  return http("/unidades", { method: "POST", body: data, auth: true });
}

export async function updateUnidade(id: string, data: any) {
  return http(`/unidades/${id}`, { method: "PATCH", body: data, auth: true });
}

export async function deleteUnidade(id: string) {
  return http(`/unidades/${id}`, { method: "DELETE", auth: true });
}

// Endereços
export async function buscarViaCep(cep: string) {
  return http(`/enderecos/viacep/buscar?cep=${cep}`);
}

export async function getEndereco(id: string) {
  return http(`/enderecos/${id}`, { auth: true });
}

export async function createEndereco(data: any) {
  return http("/enderecos", { method: "POST", body: data, auth: true });
}

export async function updateEndereco(id: string, data: any) {
  return http(`/enderecos/${id}`, { method: "PATCH", body: data, auth: true });
}

export async function vincularEndereco(enderecoId: string, data: any) {
  return http(`/enderecos/${enderecoId}/vinculos`, {
    method: "POST",
    body: data,
    auth: true,
  });
}
