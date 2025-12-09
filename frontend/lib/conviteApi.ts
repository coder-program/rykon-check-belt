import { http } from "./api";

export interface CriarConviteDto {
  tipo_cadastro: "ALUNO" | "RESPONSAVEL";
  unidade_id?: string;
  email?: string;
  telefone?: string;
  nome_pre_cadastro?: string;
  cpf?: string;
  observacoes?: string;
}

export interface CompletarCadastroDto {
  token: string;
  nome_completo: string;
  cpf: string;
  email?: string;
  telefone?: string;
  data_nascimento: string;
  genero?: "MASCULINO" | "FEMININO" | "OUTRO";
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  senha?: string;
  faixa_atual?: string;
  grau_atual?: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_telefone?: string;
}

export interface ConviteCadastro {
  id: string;
  token: string;
  tipo_cadastro: "ALUNO" | "RESPONSAVEL";
  unidade_id: string;
  email?: string;
  telefone?: string;
  nome_pre_cadastro?: string;
  cpf?: string;
  usado: boolean;
  usuario_criado_id?: string;
  data_expiracao: string;
  criado_por: string;
  criado_em: string;
  usado_em?: string;
  observacoes?: string;
  unidade?: {
    id: string;
    nome: string;
  };
  usuarioCriado?: {
    id: string;
    nome: string;
  };
}

export interface CriarConviteResponse {
  success: boolean;
  convite: ConviteCadastro;
  link: string;
  linkWhatsApp: string;
}

export interface ValidarTokenResponse {
  valido: boolean;
  mensagem: string;
  convite?: {
    tipo_cadastro: string;
    nome_pre_cadastro?: string;
    email?: string;
    telefone?: string;
    cpf?: string;
  };
}

export interface CompletarCadastroResponse {
  success: boolean;
  message: string;
  pessoa_id: string;
  usuario_id?: string;
}

export const conviteApi = {
  async criarConvite(data: CriarConviteDto): Promise<CriarConviteResponse> {
    return http("/convites-cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }) as Promise<CriarConviteResponse>;
  },

  async listarConvites(unidadeId?: string): Promise<ConviteCadastro[]> {
    const url = unidadeId
      ? `/convites-cadastro?unidadeId=${unidadeId}`
      : "/convites-cadastro";
    return http(url) as Promise<ConviteCadastro[]>;
  },

  async validarToken(token: string): Promise<ValidarTokenResponse> {
    return http(
      `/convites-cadastro/validar/${token}`
    ) as Promise<ValidarTokenResponse>;
  },

  async completarCadastro(
    data: CompletarCadastroDto
  ): Promise<CompletarCadastroResponse> {
    return http("/convites-cadastro/completar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }) as Promise<CompletarCadastroResponse>;
  },

  async reenviarConvite(id: string): Promise<CriarConviteResponse> {
    return http(`/convites-cadastro/${id}/reenviar`, {
      method: "POST",
    }) as Promise<CriarConviteResponse>;
  },

  async cancelarConvite(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    return http(`/convites-cadastro/${id}`, {
      method: "DELETE",
    }) as Promise<{ success: boolean; message: string }>;
  },
};
