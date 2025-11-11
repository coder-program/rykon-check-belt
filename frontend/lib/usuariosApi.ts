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
  cadastro_completo?: boolean;
  perfis?: Perfil[];
  ultimo_login?: string;
  foto?: string;
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
  cadastro_completo?: boolean;
  perfil_ids?: string[];
  foto?: string;
}

export interface UpdateUsuarioDto {
  email?: string;
  nome?: string;
  cpf?: string;
  telefone?: string;
  ativo?: boolean;
  cadastro_completo?: boolean;
  perfil_ids?: string[];
  foto?: string;
}

export const getUsuarios = async (): Promise<Usuario[]> => {
  try {
    const response = await api("/usuarios");
    return response;
  } catch (error) {
    console.error("getUsuarios: Erro na requisição:", error);
    throw error;
  }
};

export const getUsuariosByPerfil = async (
  perfil: string
): Promise<Usuario[]> => {
  try {
    const response = await api(`/usuarios?perfil=${perfil}`);
    return response;
  } catch (error) {
    console.error(`getUsuariosByPerfil(${perfil}): Erro na requisição:`, error);
    throw error;
  }
};

export const getUsuario = async (id: string): Promise<Usuario> => {
  const response = await api(`/usuarios/${id}`);
  return response;
};

export const createUsuario = async (
  data: CreateUsuarioDto
): Promise<Usuario> => {
  const response = await api("/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
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

// ============ UNIDADES ============

export interface Unidade {
  id: string;
  nome: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  status?: string; // ATIVA, INATIVA, HOMOLOGACAO
  ativo?: boolean; // Para compatibilidade com código antigo
  created_at: string;
  updated_at: string;
}

export const getUnidades = async (): Promise<Unidade[]> => {
  const response = await api("/unidades");
  // Se a resposta é paginada, retornar apenas os items
  if (response && response.items && Array.isArray(response.items)) {
    return response.items;
  }
  // Se já é um array, retornar direto
  if (Array.isArray(response)) {
    return response;
  }
  // Caso contrário, retornar array vazio
  return [];
};

export const getUnidadesAtivas = async (): Promise<Unidade[]> => {
  // Usar endpoint público que não requer autenticação
  const response = await api("/unidades/public/ativas");

  // O endpoint já retorna apenas unidades ativas/homologação
  if (Array.isArray(response)) {
    return response;
  }

  return [];
};
