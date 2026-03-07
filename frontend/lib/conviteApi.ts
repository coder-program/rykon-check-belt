import { http } from "./api";

export interface CriarConviteDto {
  tipo_cadastro: "ALUNO" | "RESPONSAVEL";
  unidade_id?: string;
  email?: string;
  telefone?: string;
  nome_pre_cadastro?: string;
  cpf?: string;
  observacoes?: string;
  /** Se preenchido, cria agend. de aula experimental junto com o convite (atomicamente) */
  agendamento?: {
    modalidade_id: string;
    data_aula: string;  // YYYY-MM-DD
    horario: string;    // HH:mm
    observacoes?: string;
  };
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

export interface AgendamentoAulaExperimental {
  id: string;
  unidade_id: string;
  modalidade_id: string;
  modalidade?: { id: string; nome: string };
  convite_id?: string;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  data_aula: string;
  horario: string;
  status: "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "REALIZADO";
  observacoes?: string;
  criado_em: string;
  unidade?: { id: string; nome: string };
  criador?: { id: string; nome_completo?: string; nome?: string };
}

export interface ConfigAulaExperimental {
  id?: string;
  unidade_id: string;
  modalidade_id: string;
  ativo: boolean;
  max_aulas: number;
  duracao_minutos: number;
}

export interface CriarAgendamentoDto {
  unidade_id: string;
  modalidade_id: string;
  convite_id?: string;
  nome: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  data_aula: string;
  horario: string;
  observacoes?: string;
}

export const aulaExperimentalApi = {
  async getConfig(unidadeId: string, modalidadeId: string): Promise<ConfigAulaExperimental> {
    return http(`/aula-experimental/config/${unidadeId}/${modalidadeId}`) as Promise<ConfigAulaExperimental>;
  },

  async upsertConfig(unidadeId: string, modalidadeId: string, data: Omit<ConfigAulaExperimental, 'id' | 'unidade_id' | 'modalidade_id'>): Promise<ConfigAulaExperimental> {
    return http(`/aula-experimental/config/${unidadeId}/${modalidadeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }) as Promise<ConfigAulaExperimental>;
  },

  async listar(unidadeId?: string, modalidadeId?: string): Promise<AgendamentoAulaExperimental[]> {
    const params = new URLSearchParams();
    if (unidadeId) params.set('unidadeId', unidadeId);
    if (modalidadeId) params.set('modalidadeId', modalidadeId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return http(`/aula-experimental${qs}`) as Promise<AgendamentoAulaExperimental[]>;
  },

  async criar(data: CriarAgendamentoDto): Promise<AgendamentoAulaExperimental> {
    return http("/aula-experimental", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }) as Promise<AgendamentoAulaExperimental>;
  },

  async atualizarStatus(id: string, status: string, observacoes?: string): Promise<AgendamentoAulaExperimental> {
    return http(`/aula-experimental/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, observacoes }),
    }) as Promise<AgendamentoAulaExperimental>;
  },

  async remover(id: string): Promise<void> {
    return http(`/aula-experimental/${id}`, { method: "DELETE" }) as Promise<void>;
  },
};

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
