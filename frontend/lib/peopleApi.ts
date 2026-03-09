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
  unidade_id?: string; // 🔥 Corrigido: backend espera unidade_id (snake_case) e string
  status?: string;
  ativo?: boolean;
  perfil_id?: number;
  modalidade_id?: string;
  faixa?: string;
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

export async function getFranqueadoById(id: string) {
  return http(`/franqueados/${id}`, { auth: true });
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

// ── Franqueado Contratos ──────────────────────────────────────

export interface ModuloContratadoPayload {
  codigo: string;
  nome_comercial: string;
  tipo?: string;
  valor_mensal_contratado?: number;
  valor_setup_contratado?: number;
  data_inicio?: string;
  observacoes?: string;
}

export interface CreateFranqueadoContratoPayload {
  franqueado_id: string;
  // 6.1
  codigo?: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  razao_social?: string;
  segmento?: string;
  status_comercial?: string;
  // 6.2
  contato_nome?: string;
  contato_cargo?: string;
  contato_email?: string;
  contato_telefone?: string;
  financeiro_nome?: string;
  financeiro_email?: string;
  financeiro_whatsapp?: string;
  // 6.3
  data_implantacao?: string;
  data_go_live?: string;
  data_inicio_cobranca?: string;
  carencia_meses?: number;
  responsavel_comercial?: string;
  responsavel_implantacao?: string;
  mensalidade_base?: number;
  desconto_mensal?: number;
  desconto_motivo?: string;
  setup_valor_total?: number;
  setup_parcelas?: number;
  setup_cobrar_durante_carencia?: boolean;
  tipo_cobranca?: string;
  dia_vencimento?: number;
  forma_reajuste?: string;
  // 6.5
  usuarios_ativos_esperados?: number;
  unidades_esperadas?: number;
  familiaridade_tecnologia?: string;
  status_implantacao?: string;
  integracao_externa?: boolean;
  integracoes_previstas?: string;
  observacoes?: string;
  // módulos
  modulos?: ModuloContratadoPayload[];
}

export async function createFranqueadoContrato(data: CreateFranqueadoContratoPayload) {
  return http("/franqueado-contratos", { method: "POST", body: data, auth: true });
}

export async function listFranqueadoContratos(
  params: { franqueado_id?: string; status_contrato?: string; status_implantacao?: string } = {}
) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")) as Record<string, string>
  ).toString();
  return http(`/franqueado-contratos${qs ? `?${qs}` : ""}`, { auth: true });
}

export async function getFranqueadoContratoById(id: string) {
  return http(`/franqueado-contratos/${id}`, { auth: true });
}

export async function getContratosByFranqueado(franqueadoId: string) {
  return http(`/franqueado-contratos/franqueado/${franqueadoId}`, { auth: true });
}

export async function updateFranqueadoContrato(id: string, data: Partial<CreateFranqueadoContratoPayload>) {
  return http(`/franqueado-contratos/${id}`, { method: "PUT", body: data, auth: true });
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

// ---------------------------------------------------------------------------
// Modalidades
// ---------------------------------------------------------------------------

export interface Modalidade {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  icone?: string;
  tipo_graduacao?: string;
  ativo: boolean;
  totalAlunos?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UnidadeModalidade {
  id: string;
  unidade_id: string;
  modalidade_id: string;
  ativa: boolean;
  modalidade?: Modalidade;
  created_at?: string;
}

export interface CreateModalidadeData {
  nome: string;
  descricao?: string;
  cor?: string;
  icone?: string;
  tipo_graduacao?: string;
}

export const TIPOS_GRADUACAO = [
  { value: "NENHUM", label: "Sem graduação" },
  { value: "FAIXA", label: "Faixa (cores)" },
  { value: "GRAU", label: "Graus numéricos" },
  { value: "KYU_DAN", label: "Kyu/Dan" },
  { value: "CORDAO", label: "Cordão (cores)" },
  { value: "LIVRE", label: "Personalizado" },
] as const;

export async function listModalidades(params: {
  unidade_id?: string;
  apenasAtivas?: boolean;
}): Promise<Modalidade[]> {
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
  const qs = new URLSearchParams(
    filteredParams as Record<string, string>
  ).toString();
  const result = await http(`/modalidades${qs ? `?${qs}` : ""}`, { auth: true });
  return Array.isArray(result) ? result : (result?.items ?? []);
}

export async function listUnidadeModalidades(params: {
  unidade_id?: string;
} = {}): Promise<UnidadeModalidade[]> {
  const qs = params.unidade_id ? `?unidade_id=${params.unidade_id}` : "";
  const result = await http(`/modalidades/unidade-modalidades${qs}`, { auth: true });
  return Array.isArray(result) ? result : (result?.items ?? []);
}

export async function createModalidade(data: CreateModalidadeData): Promise<Modalidade> {
  return http("/modalidades", { method: "POST", body: data, auth: true });
}

export async function updateModalidade(id: string, data: Partial<CreateModalidadeData>): Promise<Modalidade> {
  return http(`/modalidades/${id}`, { method: "PATCH", body: data, auth: true });
}

export async function vincularModalidade(modalidade_id: string, unidade_id: string): Promise<UnidadeModalidade> {
  return http(`/modalidades/${modalidade_id}/vincular`, { method: "POST", body: { unidade_id }, auth: true });
}

export async function desvincularModalidade(modalidade_id: string, unidade_id: string): Promise<void> {
  return http(`/modalidades/${modalidade_id}/vincular/${unidade_id}`, { method: "DELETE", auth: true });
}

export async function ativarModalidade(id: string): Promise<Modalidade> {
  return http(`/modalidades/${id}/ativar`, { method: "PATCH", auth: true });
}

export async function desativarModalidade(id: string): Promise<{ modalidade: Modalidade; totalAlunos: number }> {
  return http(`/modalidades/${id}/desativar`, { method: "PATCH", auth: true });
}

export async function deleteModalidade(id: string): Promise<{ message: string }> {
  return http(`/modalidades/${id}`, { method: "DELETE", auth: true });
}

export async function getModalidadeById(id: string): Promise<Modalidade> {
  return http(`/modalidades/${id}`, { auth: true });
}

export async function getModalidadeAlunos(id: string): Promise<{
  id: string;
  aluno_id: string;
  nome: string;
  email: string;
  telefone?: string;
  data_matricula: string;
  valor_praticado?: number;
  ativo: boolean;
  aluno_ativo: boolean;
}[]> {
  return http(`/modalidades/${id}/alunos`, { auth: true });
}

export async function getModalidadeEstatisticas(id: string): Promise<{
  totalAlunos: number;
  faturamentoPotencial: number;
  faturamentoReal: number;
  modalidade: { id: string; nome: string; cor: string; valor_mensalidade: number };
}> {
  return http(`/modalidades/${id}/estatisticas`, { auth: true });
}
// ===== ALUNO MODALIDADES =====

export interface AlunoModalidadeItem {
  id: string;
  nome: string;
  descricao?: string;
  valor_praticado?: number;
  cor?: string;
  data_matricula?: string;
}

export async function getModalidadesAluno(alunoId: string): Promise<AlunoModalidadeItem[]> {
  return http(`/alunos/${alunoId}/modalidades`, { auth: true });
}

export async function matricularAlunoModalidade(
  alunoId: string,
  modalidadeId: string,
  valorPraticado?: number,
) {
  return http(`/alunos/${alunoId}/matricular-modalidade`, {
    method: "POST",
    body: { modalidade_id: modalidadeId, valor_praticado: valorPraticado },
    auth: true,
  });
}

export async function cancelarAlunoModalidade(
  alunoId: string,
  modalidadeId: string,
) {
  return http(`/alunos/${alunoId}/modalidades/${modalidadeId}`, {
    method: "DELETE",
    auth: true,
  });
}

// ===== FRANQUEADO COBRANÇAS (Fase 2) =====

export interface CobrancaItemPayload {
  tipo_item?: "MENSALIDADE_BASE" | "MODULO_EXTRA" | "SETUP" | "DESCONTO" | "AJUSTE";
  descricao?: string;
  referencia_id?: string;
  quantidade?: number;
  valor_unitario: number;
  valor_total: number;
}

export interface CreateCobrancaPayload {
  contrato_id: string;
  competencia?: string;
  data_emissao?: string;
  data_vencimento?: string;
  valor_total: number;
  status?: string;
  origem?: string;
  carencia_aplicada?: boolean;
  observacao?: string;
  itens?: CobrancaItemPayload[];
}

export interface RegistrarPagamentoPayload {
  status: string;
  data_pagamento?: string;
  forma_pagamento?: string;
  observacao?: string;
}

export interface FranqueadoCobranca {
  id: string;
  contrato_id: string;
  competencia: string | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  valor_total: number;
  status: "PENDENTE" | "PAGA" | "ATRASADA" | "NEGOCIADA" | "ISENTA" | "CANCELADA" | null;
  origem: "AUTOMATICA" | "MANUAL" | null;
  carencia_aplicada: boolean;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
  itens?: {
    id: string;
    tipo_item: string | null;
    descricao: string | null;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
  }[];
}

export interface SetupParcela {
  id: string;
  contrato_id: string;
  numero_parcela: number;
  total_parcelas: number | null;
  data_vencimento: string | null;
  valor_parcela: number;
  status: "PENDENTE" | "PAGA" | "ATRASADA" | "NEGOCIADA" | "ISENTA" | "CANCELADA" | null;
  data_pagamento: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface CobrancaKpis {
  mrr: number;
  setupPendente: number;
  cobrancasAtrasadas: number;
  cobrancasVencendo7dias: number;
  totalCobrancasMes: number;
}

// Cobranças
export async function createCobranca(data: CreateCobrancaPayload): Promise<FranqueadoCobranca> {
  return http("/franqueado-cobrancas", { method: "POST", body: data, auth: true });
}

export async function gerarCobrancas(competencia: string, contratoIds?: string[]) {
  return http("/franqueado-cobrancas/gerar", {
    method: "POST",
    body: { competencia, contrato_ids: contratoIds },
    auth: true,
  });
}

export async function listCobrancas(
  params: { contrato_id?: string; status?: string; competencia?: string; page?: number; pageSize?: number } = {}
): Promise<{ items: FranqueadoCobranca[]; total: number; page: number; pageSize: number }> {
  const qs = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ) as Record<string, string>
  ).toString();
  return http(`/franqueado-cobrancas${qs ? `?${qs}` : ""}`, { auth: true });
}

export async function getCobrancasByContrato(contratoId: string): Promise<FranqueadoCobranca[]> {
  return http(`/franqueado-cobrancas/contrato/${contratoId}`, { auth: true });
}

export async function getCobrancaById(id: string): Promise<FranqueadoCobranca> {
  return http(`/franqueado-cobrancas/${id}`, { auth: true });
}

export async function registrarPagamentoCobranca(
  id: string,
  data: RegistrarPagamentoPayload
): Promise<FranqueadoCobranca> {
  return http(`/franqueado-cobrancas/${id}/pagamento`, { method: "PATCH", body: data, auth: true });
}

export async function updateCobranca(
  id: string,
  data: Partial<CreateCobrancaPayload>
): Promise<FranqueadoCobranca> {
  return http(`/franqueado-cobrancas/${id}`, { method: "PUT", body: data, auth: true });
}

export async function deleteCobranca(id: string): Promise<void> {
  return http(`/franqueado-cobrancas/${id}`, { method: "DELETE", auth: true });
}

export async function getCobrancaKpis(): Promise<CobrancaKpis> {
  return http("/franqueado-cobrancas/kpis", { auth: true });
}

// Setup Parcelas
export async function gerarSetupParcelas(contratoId: string): Promise<SetupParcela[]> {
  return http(`/franqueado-cobrancas/setup-parcelas/gerar/${contratoId}`, { method: "POST", auth: true });
}

export async function getSetupParcelasByContrato(contratoId: string): Promise<SetupParcela[]> {
  return http(`/franqueado-cobrancas/setup-parcelas/contrato/${contratoId}`, { auth: true });
}

export async function registrarPagamentoParcela(
  id: string,
  data: { status: string; data_pagamento?: string; observacao?: string }
): Promise<SetupParcela> {
  return http(`/franqueado-cobrancas/setup-parcelas/${id}/pagamento`, {
    method: "PATCH",
    body: data,
    auth: true,
  });
}

// ─────────────────────────────────────────────────────────────
// FASE 3 — Histórico de Eventos & Snapshots de Alunos
// ─────────────────────────────────────────────────────────────

export interface FranqueadoEvento {
  id: string;
  franqueado_id: string;
  contrato_id: string | null;
  tipo_evento: string;
  descricao: string;
  usuario_responsavel: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UnidadeSnapshot {
  id: string;
  unidade_id: string;
  franqueado_id: string | null;
  contrato_id: string | null;
  data_referencia: string;
  competencia: string | null;
  total_alunos: number;
  total_alunos_ativos: number;
  total_alunos_inativos: number;
  total_professores: number;
  total_checkins_mes: number;
  usuarios_esperados: number | null;
  percentual_ocupacao: number | null;
  receita_estimativa: number | null;
  origem: string | null;
  observacao: string | null;
  created_at: string;
}

export interface EvolucaoAlunos {
  competencia: string;
  ativos: number;
  inativos: number;
  total: number;
}

// ── Eventos ──────────────────────────────────────────────────

export async function registrarEvento(data: {
  franqueado_id: string;
  contrato_id?: string;
  tipo_evento: string;
  descricao: string;
  usuario_responsavel?: string;
  metadata?: Record<string, unknown>;
}): Promise<FranqueadoEvento> {
  return http("/franqueado-historico/eventos", { method: "POST", body: data, auth: true });
}

export async function getEventosByFranqueado(
  franqueadoId: string,
  limit = 50
): Promise<FranqueadoEvento[]> {
  return http(`/franqueado-historico/franqueado/${franqueadoId}?limit=${limit}`, { auth: true });
}

export async function getEventosByContrato(contratoId: string): Promise<FranqueadoEvento[]> {
  return http(`/franqueado-historico/contrato/${contratoId}`, { auth: true });
}

// ── Snapshots ────────────────────────────────────────────────

export async function gerarSnapshotUnidade(
  unidadeId: string,
  body: { franqueado_id?: string; contrato_id?: string }
): Promise<UnidadeSnapshot> {
  return http(`/unidade-snapshots/gerar/${unidadeId}`, { method: "POST", body, auth: true });
}

export async function gerarSnapshotsPorContrato(
  contratoId: string
): Promise<{ gerados: number; erros: string[] }> {
  return http(`/unidade-snapshots/gerar-contrato/${contratoId}`, { method: "POST", auth: true });
}

export async function getSnapshotsByUnidade(
  unidadeId: string,
  limit = 12
): Promise<UnidadeSnapshot[]> {
  return http(`/unidade-snapshots/unidade/${unidadeId}?limit=${limit}`, { auth: true });
}

export async function getEvolucaoAlunos(
  unidadeId: string,
  meses = 12
): Promise<EvolucaoAlunos[]> {
  return http(`/unidade-snapshots/evolucao/${unidadeId}?meses=${meses}`, { auth: true });
}

export async function getSnapshotsByFranqueado(
  franqueadoId: string
): Promise<UnidadeSnapshot[]> {
  return http(`/unidade-snapshots/franqueado/${franqueadoId}`, { auth: true });
}