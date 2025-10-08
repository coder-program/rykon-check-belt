import { http } from "./api";

export type PageResp<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

export async function listAlunos(params: any): Promise<PageResp<any>> {
  // Filtrar valores undefined/null antes de criar URLSearchParams
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(filteredParams).toString();
  return http(`/alunos?${qs}`);
}

export async function approveAluno(id: string, professor_id: string) {
  return http(`/alunos/${id}/approve`, {
    method: "PATCH",
    body: { professor_id },
    auth: true,
  });
}
export async function createAluno(data: any) {
  // Garantir que tipo_cadastro seja ALUNO
  const alunoData = {
    ...data,
    tipo_cadastro: "ALUNO",
  };
  return http("/alunos", { method: "POST", body: alunoData, auth: true });
}

export async function listProfessores(params: any): Promise<PageResp<any>> {
  const qs = new URLSearchParams(params).toString();
  return http(`/professores?${qs}`);
}
export async function createProfessor(data: any) {
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

export async function listFranqueados(params: any): Promise<PageResp<any>> {
  const qs = new URLSearchParams(params).toString();
  return http(`/franqueados?${qs}`);
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
  const qs = new URLSearchParams(params).toString();
  return http(`/unidades?${qs}`);
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
