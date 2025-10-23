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

// =============== GRADUAÇÃO MANUAL ===============

export interface GraduarManualDto {
  faixaDestinoId: string;
  observacao?: string;
}

// Graduar aluno automaticamente (próxima faixa na ordem sequencial)
export async function graduarAlunoAutomatico(
  alunoId: string,
  observacao?: string
): Promise<any> {
  console.log("🎯 Iniciando graduação automática para aluno:", alunoId);

  try {
    // Buscar a próxima faixa baseada na ordem sequencial
    const proximaFaixa = await buscarProximaFaixa(alunoId, "ADULTO");

    if (!proximaFaixa) {
      throw new Error(
        "Não foi possível determinar a próxima faixa na sequência. O aluno pode já estar na faixa máxima ou ocorreu um erro."
      );
    }

    console.log(
      "📈 Próxima faixa determinada:",
      proximaFaixa.nome_exibicao,
      "- Ordem:",
      proximaFaixa.ordem
    );

    // Usar graduação manual com a faixa determinada automaticamente
    return await graduarAlunoManual(alunoId, {
      faixaDestinoId: proximaFaixa.id,
      observacao:
        observacao || `Graduação automática para ${proximaFaixa.nome_exibicao}`,
    });
  } catch (error) {
    console.error("❌ Erro na graduação automática:", error);
    throw error;
  }
}

// Graduar aluno manualmente (escolher faixa específica)
export async function graduarAlunoManual(
  alunoId: string,
  data: GraduarManualDto
): Promise<any> {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${API_URL}/graduacao/alunos/${alunoId}/graduacoes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        faixaDestinoId: data.faixaDestinoId,
        observacao: data.observacao,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Erro ao graduar aluno");
  }

  return response.json();
}

// Listar todas as faixas disponíveis
export async function listarFaixas(categoria?: string): Promise<any[]> {
  const token = localStorage.getItem("token");

  // Usar o endpoint faixas-definicao que retorna todas as definições de faixas
  const response = await fetch(`${API_URL}/graduacao/faixas-definicao`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Erro ao buscar faixas");
  }

  const faixas = await response.json();

  // Filtrar por categoria se especificada e ordenar por ordem
  let faixasFiltradas = faixas;
  if (categoria) {
    faixasFiltradas = faixas.filter(
      (faixa: any) => faixa.categoria?.toUpperCase() === categoria.toUpperCase()
    );
  }

  // Ordenar por ordem
  return faixasFiltradas.sort(
    (a: any, b: any) => (a.ordem || 0) - (b.ordem || 0)
  );
}

// Listar faixas válidas para graduação baseado na faixa atual do aluno
export async function listarFaixasValidasParaGraduacao(
  alunoId: string,
  categoria?: string
): Promise<any[]> {
  const token = localStorage.getItem("token");

  try {
    // 1. Buscar a faixa atual do aluno
    const statusResponse = await fetch(
      `${API_URL}/graduacao/alunos/${alunoId}/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error("Não foi possível obter status do aluno");
    }

    const status = await statusResponse.json();
    const faixaAtualOrdem = status.faixaAtual?.ordem || 0;

    // 2. Buscar todas as faixas disponíveis
    const todasFaixas = await listarFaixas(categoria);

    // 3. Filtrar apenas as faixas com ordem SUPERIOR à atual
    // Se o aluno está na ordem 2, só pode graduar para ordem 3, 4, 5, etc.
    const faixasValidas = todasFaixas.filter(
      (faixa: any) => (faixa.ordem || 0) > faixaAtualOrdem
    );

    console.log(
      `Aluno na faixa ordem ${faixaAtualOrdem}, faixas válidas:`,
      faixasValidas.map((f) => `${f.nome_exibicao} (ordem: ${f.ordem})`)
    );

    return faixasValidas;
  } catch (error) {
    console.error("Erro ao buscar faixas válidas para graduação:", error);
    // Fallback: retorna todas as faixas se não conseguir determinar a atual
    return await listarFaixas(categoria);
  }
}

// Buscar próxima faixa automaticamente baseado na ordem
export async function buscarProximaFaixa(
  alunoId: string,
  categoria?: string
): Promise<any | null> {
  const token = localStorage.getItem("token");

  try {
    // 1. Buscar a faixa atual do aluno
    const statusResponse = await fetch(
      `${API_URL}/graduacao/alunos/${alunoId}/status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error("Não foi possível obter status do aluno");
    }

    const status = await statusResponse.json();
    const faixaAtualOrdem = status.faixaAtual?.ordem || 0;

    // 2. Buscar todas as faixas disponíveis
    const todasFaixas = await listarFaixas(categoria);

    // 3. Encontrar a próxima faixa na sequência (ordem + 1)
    const proximaFaixa = todasFaixas.find(
      (faixa: any) => (faixa.ordem || 0) === faixaAtualOrdem + 1
    );

    console.log(
      `Aluno na faixa ordem ${faixaAtualOrdem}, próxima faixa:`,
      proximaFaixa
        ? `${proximaFaixa.nome_exibicao} (ordem: ${proximaFaixa.ordem})`
        : "Não encontrada"
    );

    return proximaFaixa || null;
  } catch (error) {
    console.error("Erro ao buscar próxima faixa:", error);
    return null;
  }
}
