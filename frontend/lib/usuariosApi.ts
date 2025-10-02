import { http as api } from "./api";

// ============ USUÁRIOS ============

export interface Usuario {
  id: string;
  username: string;
  email: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  ativo: boolean;
  perfis?: Perfil[];
  ultimo_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUsuarioDto {
  username: string;
  email: string;
  password: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  ativo?: boolean;
  perfil_ids?: string[];
}

export interface UpdateUsuarioDto {
  email?: string;
  nome?: string;
  cpf?: string;
  telefone?: string;
  ativo?: boolean;
  perfil_ids?: string[];
}

export const getUsuarios = async (): Promise<Usuario[]> => {
  const response = await api("/usuarios");
  return response;
};

export const getUsuario = async (id: string): Promise<Usuario> => {
  const response = await api(`/usuarios/${id}`);
  return response;
};

export const updateUsuario = async (
  id: string,
  data: UpdateUsuarioDto
): Promise<Usuario> => {
  const response = await api(`/usuarios/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return response;
};

export const deleteUsuario = async (id: string): Promise<void> => {
  await api(`/usuarios/${id}`, {
    method: "DELETE",
  });
};

export const getUserPermissions = async (id: string): Promise<any> => {
  const response = await api(`/usuarios/${id}/permissions`);
  return response;
};

// ============ PERFIS ============

export interface Perfil {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  permissoes?: Permissao[];
  created_at: string;
  updated_at: string;
}

export interface CreatePerfilDto {
  nome: string;
  descricao?: string;
  ativo?: boolean;
  permissao_ids?: string[];
}

export interface UpdatePerfilDto {
  nome?: string;
  descricao?: string;
  ativo?: boolean;
  permissao_ids?: string[];
}

export const getPerfis = async (): Promise<Perfil[]> => {
  const response = await api("/perfis");
  return response;
};

export const getPerfil = async (id: string): Promise<Perfil> => {
  const response = await api(`/perfis/${id}`);
  return response;
};

export const createPerfil = async (data: CreatePerfilDto): Promise<Perfil> => {
  const response = await api("/perfis", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response;
};

export const updatePerfil = async (
  id: string,
  data: UpdatePerfilDto
): Promise<Perfil> => {
  const response = await api(`/perfis/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return response;
};

export const deletePerfil = async (id: string): Promise<void> => {
  await api(`/perfis/${id}`, {
    method: "DELETE",
  });
};

export const addPermissaoToPerfil = async (
  perfilId: string,
  permissaoId: string
): Promise<void> => {
  await api(`/perfis/${perfilId}/permissoes/${permissaoId}`, {
    method: "POST",
  });
};

export const removePermissaoFromPerfil = async (
  perfilId: string,
  permissaoId: string
): Promise<void> => {
  await api(`/perfis/${perfilId}/permissoes/${permissaoId}`, {
    method: "DELETE",
  });
};

// ============ PERMISSÕES ============

export interface Permissao {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  modulo: string;
  ativo: boolean;
  nivel?: NivelPermissao;
  tipo?: TipoPermissao;
  created_at?: string;
  updated_at?: string;
}

export interface NivelPermissao {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  cor?: string;
  ordem: number;
}

export interface TipoPermissao {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  ordem: number;
}

export const getPermissoes = async (): Promise<Permissao[]> => {
  const response = await api("/permissoes");
  return response;
};

export const getPermissoesByModulo = async (
  modulo: string
): Promise<Permissao[]> => {
  const response = await api(`/permissoes/modulo/${modulo}`);
  return response;
};

export const getPermissao = async (id: string): Promise<Permissao> => {
  const response = await api(`/permissoes/${id}`);
  return response;
};
