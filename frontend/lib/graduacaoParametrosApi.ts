// API functions for Graduação Parâmetros

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export interface GraduacaoParametro {
  id: string;
  nome: string;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
  tipo_periodo: "MEIO_ANO" | "FIM_ANO" | "ESPECIAL";
  graus_minimos: number;
  presencas_minimas: number;
  ativo: boolean;
  unidade_id?: string;
  unidade?: {
    id: string;
    nome: string;
  };
  created_at: string;
  updated_at: string;
}

export interface AlunoAptoGraduacao {
  aluno_id: string;
  aluno_nome: string;
  aluno_cpf: string;
  unidade_id: string;
  unidade_nome: string;

  // Faixa atual
  faixa_atual_id: string;
  faixa_atual_codigo: string;
  faixa_atual_nome: string;
  faixa_atual_cor: string;
  graus_atual: number;
  presencas_total: number;
  data_inicio_faixa: string;

  // Próxima faixa
  proxima_faixa_id?: string;
  proxima_faixa_codigo?: string;
  proxima_faixa_nome?: string;
  proxima_faixa_cor?: string;

  // Status graduação
  graduacao_id?: string;
  graduacao_aprovada: boolean;
  graduacao_aprovado_por_id?: string;
  graduacao_data_aprovacao?: string;
  solicitado_em?: string;
  observacao?: string;
  observacao_aprovacao?: string;

  // Verificações
  graus_suficientes: boolean;
  presencas_suficientes: boolean;
  apto_graduar: boolean;
}

export interface CreateGraduacaoParametroDto {
  nome: string;
  descricao?: string;
  data_inicio: string;
  data_fim: string;
  tipo_periodo: "MEIO_ANO" | "FIM_ANO" | "ESPECIAL";
  graus_minimos: number;
  presencas_minimas: number;
  ativo: boolean;
  unidade_id?: string;
}

export interface AprovarGraduacaoDto {
  aluno_id: string;
  faixa_origem_id: string;
  faixa_destino_id: string;
  parametro_id?: string;
  observacao_aprovacao?: string;
}

// Listar parâmetros
export async function listarParametros(
  unidadeId?: string
): Promise<GraduacaoParametro[]> {
  const token = localStorage.getItem("token");
  const params = new URLSearchParams();
  if (unidadeId) params.append("unidade_id", unidadeId);

  const response = await fetch(`${API_URL}/graduacao-parametros?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Erro ao buscar parâmetros de graduação");
  }

  return response.json();
}

// Criar parâmetro
export async function criarParametro(
  data: CreateGraduacaoParametroDto
): Promise<GraduacaoParametro> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/graduacao-parametros`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao criar parâmetro");
  }

  return response.json();
}

// Atualizar parâmetro
export async function atualizarParametro(
  id: string,
  data: Partial<CreateGraduacaoParametroDto>
): Promise<GraduacaoParametro> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/graduacao-parametros/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao atualizar parâmetro");
  }

  return response.json();
}

// Desativar parâmetro
export async function desativarParametro(
  id: string
): Promise<GraduacaoParametro> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/graduacao-parametros/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao desativar parâmetro");
  }

  return response.json();
}

// Listar alunos aptos para graduação
export async function listarAlunosAptos(
  parametroId?: string
): Promise<AlunoAptoGraduacao[]> {
  const token = localStorage.getItem("token");
  const endpoint = parametroId
    ? `${API_URL}/graduacao-parametros/alunos-aptos/${parametroId}`
    : `${API_URL}/graduacao-parametros/alunos-aptos`;

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Erro ao buscar alunos aptos para graduação");
  }

  return response.json();
}

// Aprovar graduação
export async function aprovarGraduacao(
  data: AprovarGraduacaoDto
): Promise<any> {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}/graduacao-parametros/aprovar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao aprovar graduação");
  }

  return response.json();
}

// Reprovar graduação
export async function reprovarGraduacao(
  id: string,
  observacao: string
): Promise<any> {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${API_URL}/graduacao-parametros/reprovar/${id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ observacao }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao reprovar graduação");
  }

  return response.json();
}
