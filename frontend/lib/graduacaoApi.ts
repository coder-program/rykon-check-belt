import { http } from "./api";

export interface FaixaDef {
  id: string;
  codigo: string;
  nome_exibicao: string;
  cor_hex: string;
  ordem: number;
  graus_max: number;
  aulas_por_grau: number;
  categoria: "ADULTO" | "INFANTIL" | "MESTRE";
  ativo: boolean;
}

export interface StatusGraduacao {
  faixaAtual: string;
  corHex: string;
  grausAtual: number;
  grausMax: number;
  aulasPorGrau: number;
  presencasNoCiclo: number;
  presencasTotalFaixa: number;
  faltamAulas: number;
  prontoParaGraduar: boolean;
  progressoPercentual: number;
  proximaFaixa?: string;
  dtInicioFaixa?: Date;
  alunoFaixaId?: string;
}

export interface ProximoGraduar {
  alunoId: string;
  nomeCompleto: string;
  faixa: string;
  corHex: string;
  grausAtual: number;
  grausMax: number;
  faltamAulas: number;
  prontoParaGraduar: boolean;
  progressoPercentual: number;
  unidadeId?: string;
  unidadeNome?: string;
  ultimaPresenca?: Date;
  presencasTotalFaixa?: number;
}

export interface ListaProximosGraduar {
  items: ProximoGraduar[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// Listar todas as faixas disponíveis
export async function listarFaixas(categoria?: string): Promise<FaixaDef[]> {
  const params = categoria ? `?categoria=${categoria}` : "";
  return http(`/graduacao/faixas${params}`, { auth: true });
}

// Obter status de graduação de um aluno
export async function getStatusGraduacao(
  alunoId: string,
): Promise<StatusGraduacao> {
  return http(`/graduacao/alunos/${alunoId}/status`, { auth: true });
}

// Listar próximos alunos a graduar
export async function getProximosGraduar(params?: {
  page?: number;
  pageSize?: number;
  unidadeId?: string;
  categoria?: "adulto" | "kids" | "todos";
}): Promise<ListaProximosGraduar> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.pageSize)
    queryParams.append("pageSize", params.pageSize.toString());
  if (params?.unidadeId) queryParams.append("unidadeId", params.unidadeId);
  if (params?.categoria) queryParams.append("categoria", params.categoria);

  const queryString = queryParams.toString();
  const url = queryString
    ? `/graduacao/proximos-graduar?${queryString}`
    : "/graduacao/proximos-graduar";

  return http(url, { auth: true });
}

// Conceder grau a um aluno
export async function concederGrau(
  alunoId: string,
  data: { observacao?: string; concedidoPor?: string },
): Promise<any> {
  return http(`/graduacao/alunos/${alunoId}/graus`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

// Graduar aluno para nova faixa
export async function graduarFaixa(
  alunoId: string,
  data: { faixaDestinoId: string; observacao?: string; concedidoPor?: string },
): Promise<any> {
  return http(`/graduacao/alunos/${alunoId}/graduacoes`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

// Criar faixa para aluno (inicializar)
export async function criarFaixaAluno(
  alunoId: string,
  data: { faixaDefId: string; dtInicio?: Date; grausInicial?: number },
): Promise<any> {
  return http(`/graduacao/alunos/${alunoId}/faixas`, {
    method: "POST",
    body: data,
    auth: true,
  });
}

// Registrar presença e incrementar contadores
export async function incrementarPresenca(alunoId: string): Promise<{
  grauConcedido: boolean;
  statusAtualizado: StatusGraduacao;
}> {
  return http(`/graduacao/alunos/${alunoId}/presenca`, {
    method: "POST",
    auth: true,
  });
}

// Tipo para o histórico de graduações
export interface HistoricoGraduacao {
  id: string;
  alunoId: string;
  nomeAluno: string;
  faixaAnterior: string;
  faixaAnteriorCor: string;
  novaFaixa: string;
  novaFaixaCor: string;
  dataGraduacao: Date;
  observacao?: string;
  concedidoPor?: string;
  unidadeId?: string;
}

export interface ListaHistoricoGraduacoes {
  items: HistoricoGraduacao[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}

// Buscar histórico de graduações
export async function getHistoricoGraduacoes(params?: {
  page?: number;
  pageSize?: number;
  unidadeId?: string;
  alunoId?: string;
  categoria?: "adulto" | "kids" | "todos";
}): Promise<ListaHistoricoGraduacoes> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.pageSize)
    queryParams.append("pageSize", params.pageSize.toString());
  if (params?.unidadeId) queryParams.append("unidadeId", params.unidadeId);
  if (params?.alunoId) queryParams.append("alunoId", params.alunoId);
  if (params?.categoria) queryParams.append("categoria", params.categoria);

  const queryString = queryParams.toString();
  const url = queryString
    ? `/graduacao/historico?${queryString}`
    : "/graduacao/historico";

  return http(url, { auth: true });
}
