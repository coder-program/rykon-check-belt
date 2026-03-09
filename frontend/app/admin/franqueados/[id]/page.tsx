"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useQuery } from "@tanstack/react-query";
import {
  getFranqueadoById,
  listUnidades,
  listAlunos,
  getContratosByFranqueado,
  getCobrancasByContrato,
  getSetupParcelasByContrato,
  registrarPagamentoCobranca,
  registrarPagamentoParcela,
  getEventosByFranqueado,
  type FranqueadoCobranca as FranqueadoCobrancaType,
  type SetupParcela,
  type FranqueadoEvento,
} from "@/lib/peopleApi";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Users, Building2, CheckCircle2, Clock, XCircle,
  Loader2, MapPin, Phone, Mail, User, FileText, DollarSign,
  Package, Wrench, CreditCard, History, AlertCircle, ChevronRight, ChevronLeft,
  BarChart3, BadgeCheck, Zap, X, TrendingUp, TrendingDown, Minus,
  CalendarClock, Puzzle, Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// ── Types ─────────────────────────────────────────────────────
interface FranqueadoDetail {
  id: string;
  nome?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  situacao?: string;
  ativo?: boolean;
}

interface FranqueadoContrato {
  id: string;
  franqueado_id?: string;
  codigo?: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  razao_social?: string;
  segmento?: string;
  status_comercial?: string;
  contato_nome?: string;
  contato_email?: string;
  contato_telefone?: string;
  financeiro_nome?: string;
  financeiro_email?: string;
  financeiro_whatsapp?: string;
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
  usuarios_ativos_esperados?: number;
  unidades_esperadas?: number;
  familiaridade_tecnologia?: string;
  status_implantacao?: string;
  integracao_externa?: boolean;
  integracoes_previstas?: string;
  observacoes?: string;
  status_contrato?: string;
  modulos?: Array<{
    id: string;
    codigo: string;
    nome_comercial: string;
    tipo?: string;
    valor_mensal_contratado?: number;
    status?: string;
  }>;
}

interface UnidadeRow {
  id: string;
  nome?: string;
  franqueado_id?: string;
  status?: string;
  endereco?: { cidade_nome?: string; logradouro?: string };
}

const SITUACAO_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ATIVA:         { label: "Ativa",          dot: "bg-green-500",  badge: "bg-green-100 text-green-700 border border-green-200" },
  INATIVA:       { label: "Inativa",        dot: "bg-red-400",    badge: "bg-red-100 text-red-700 border border-red-200" },
  EM_HOMOLOGACAO:{ label: "Em Homologação", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 border border-yellow-200" },
};

const UNIDADE_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  ATIVA:       { label: "Ativa",       badge: "bg-green-100 text-green-700" },
  INATIVA:     { label: "Inativa",     badge: "bg-red-100 text-red-700" },
  HOMOLOGACAO: { label: "Homologação", badge: "bg-yellow-100 text-yellow-700" },
};

const EVENTO_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; pill: string }> = {
  CONTRATO_CRIADO:      { label: "Contrato criado",      icon: FileText,    color: "text-green-600",  bg: "bg-green-50",  pill: "bg-green-100 text-green-700" },
  CONTRATO_ATUALIZADO:  { label: "Contrato atualizado",  icon: FileText,    color: "text-blue-600",   bg: "bg-blue-50",   pill: "bg-blue-100 text-blue-700" },
  STATUS_ALTERADO:      { label: "Status alterado",      icon: AlertCircle, color: "text-amber-600",  bg: "bg-amber-50",  pill: "bg-amber-100 text-amber-700" },
  MODULO_ATIVADO:       { label: "Módulo ativado",       icon: BadgeCheck,  color: "text-violet-600", bg: "bg-violet-50", pill: "bg-violet-100 text-violet-700" },
  MODULO_CANCELADO:     { label: "Módulo cancelado",     icon: XCircle,     color: "text-red-600",    bg: "bg-red-50",    pill: "bg-red-100 text-red-700" },
  COBRANCA_GERADA:      { label: "Cobrança gerada",      icon: CreditCard,  color: "text-blue-600",   bg: "bg-blue-50",   pill: "bg-blue-100 text-blue-700" },
  PAGAMENTO_REGISTRADO: { label: "Pagamento registrado", icon: CheckCircle2,color: "text-green-600",  bg: "bg-green-50",  pill: "bg-green-100 text-green-700" },
  PARCELA_PAGA:         { label: "Parcela paga",         icon: CheckCircle2,color: "text-teal-600",   bg: "bg-teal-50",   pill: "bg-teal-100 text-teal-700" },
  CARENCIA_ENCERRADA:   { label: "Carência encerrada",   icon: Clock,       color: "text-amber-600",  bg: "bg-amber-50",  pill: "bg-amber-100 text-amber-700" },
  OBSERVACAO:           { label: "Observação",           icon: History,     color: "text-gray-500",   bg: "bg-gray-100",  pill: "bg-gray-100 text-gray-600" },
  OUTRO:                { label: "Evento",               icon: Zap,         color: "text-gray-500",   bg: "bg-gray-100",  pill: "bg-gray-100 text-gray-600" },
};

// ── Lazy unit aluno detail ────────────────────────────────────
function UnitAlunoDetail({ unidadeId }: { unidadeId: string }) {
  const { data: totalResp, isLoading: l1 } = useQuery({
    queryKey: ["unit-alunos-total", unidadeId],
    queryFn: () => listAlunos({ unidade_id: unidadeId, pageSize: 1 }),
    staleTime: 120_000,
  });
  const { data: ativosResp, isLoading: l2 } = useQuery({
    queryKey: ["unit-alunos-ativos", unidadeId],
    queryFn: () => listAlunos({ unidade_id: unidadeId, ativo: true, pageSize: 1 }),
    staleTime: 120_000,
  });

  if (l1 || l2) return <Loader2 className="w-4 h-4 animate-spin text-violet-300" />;

  const total = totalResp?.total ?? 0;
  const ativos = ativosResp?.total ?? 0;
  const inativos = Math.max(0, total - ativos);

  return (
    <div className="flex items-center gap-3 text-sm tabular-nums">
      <span className="font-bold text-gray-800">{total}</span>
      <span className="text-green-600 text-xs font-medium">{ativos} ativos</span>
      <span className="text-gray-400 text-xs">{inativos} inativos</span>
    </div>
  );
}

// ── Stub tab helper ───────────────────────────────────────────
function StubTab({ icon: Icon, tituloPendente, descricao, fase }: {
  icon: React.ElementType;
  tituloPendente: string;
  descricao: string;
  fase: string;
}) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-violet-400" />
      </div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{tituloPendente}</p>
      <p className="text-xs text-gray-400 max-w-xs leading-relaxed mb-3">{descricao}</p>
      <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-600 text-xs font-medium">{fase}</span>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────
const TABS = [
  { id: "resumo",    label: "Resumo",            icon: BarChart3    },
  { id: "contato",   label: "Contato",            icon: User         },
  { id: "comercial", label: "Comercial",          icon: DollarSign   },
  { id: "modulos",   label: "Módulos",            icon: Package      },
  { id: "implant",   label: "Implantação",        icon: Wrench       },
  { id: "cobrancas", label: "Cobranças",          icon: CreditCard   },
  { id: "setup",     label: "Setup",              icon: FileText     },
  { id: "unidades",  label: "Unidades & Alunos",  icon: Building2    },
  { id: "historico", label: "Histórico",          icon: History      },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Unidade Detail Modal ─────────────────────────────────────
function UnidadeDetailModal({
  unidade,
  contrato,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  total: totalUnidades,
}: {
  unidade: UnidadeRow;
  contrato: FranqueadoContrato | undefined;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  currentIndex: number;
  total: number;
}) {
  const { data: totalResp, isLoading: l1 } = useQuery({
    queryKey: ["unit-alunos-total", unidade.id],
    queryFn: () => listAlunos({ unidade_id: unidade.id, pageSize: 1 }),
    staleTime: 120_000,
  });
  const { data: ativosResp, isLoading: l2 } = useQuery({
    queryKey: ["unit-alunos-ativos", unidade.id],
    queryFn: () => listAlunos({ unidade_id: unidade.id, ativo: true, pageSize: 1 }),
    staleTime: 120_000,
  });

  const loading = l1 || l2;
  const total = totalResp?.total ?? 0;
  const ativos = ativosResp?.total ?? 0;
  const inativos = Math.max(0, total - ativos);
  const esperados = contrato?.usuarios_ativos_esperados ?? 0;
  const pctOcupacao = esperados > 0 ? Math.round((ativos / esperados) * 100) : null;

  const st = UNIDADE_STATUS_CONFIG[unidade.status ?? "HOMOLOGACAO"] ?? UNIDADE_STATUS_CONFIG.HOMOLOGACAO;

  function fmtDataModal(d: string | null | undefined) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  function carenciaRestante() {
    if (!contrato?.data_implantacao || !contrato?.carencia_meses) return null;
    const implantacao = new Date(contrato.data_implantacao);
    const fimCarencia = new Date(implantacao);
    fimCarencia.setMonth(fimCarencia.getMonth() + contrato.carencia_meses);
    const hoje = new Date();
    if (fimCarencia <= hoje) return { encerrada: true, label: "Encerrada" };
    const diffMs = fimCarencia.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const meses = Math.floor(diffDias / 30);
    const dias = diffDias % 30;
    return { encerrada: false, label: meses > 0 ? `${meses}m ${dias}d restantes` : `${diffDias}d restantes` };
  }

  const carencia = carenciaRestante();
  const modulosAtivos = (contrato?.modulos ?? []).filter((m) => m.status !== "CANCELADO" && m.status !== "INATIVO");
  const valorMensal = contrato
    ? (contrato.mensalidade_base ?? 0) + modulosAtivos.reduce((acc, m) => acc + (m.valor_mensal_contratado ?? 0), 0) - (contrato.desconto_mensal ?? 0)
    : 0;

  function fmtMoedaModal(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-violet-600 to-violet-500 rounded-t-2xl px-6 py-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{unidade.nome || "Unidade"}</h2>
              {unidade.endereco?.cidade_nome && (
                <p className="text-xs text-violet-200 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />{unidade.endereco.cidade_nome}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/30")}>{st.label}</span>
            <span className="text-white/50 text-xs">{currentIndex + 1}/{totalUnidades}</span>
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
              title="Unidade anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors"
              title="Próxima unidade"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* Alunos */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />Alunos
            </h3>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{total}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{ativos}</p>
                  <p className="text-xs text-green-600 mt-0.5">Ativos</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{inativos}</p>
                  <p className="text-xs text-red-500 mt-0.5">Inativos</p>
                </div>
              </div>
            )}
          </div>

          {/* Ocupação vs Esperado */}
          {esperados > 0 && !loading && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />Ocupação vs. Esperado
              </h3>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{ativos} ativos de {esperados} esperados</span>
                  <span className={cn(
                    "text-sm font-bold",
                    pctOcupacao !== null && pctOcupacao >= 80 ? "text-green-600" :
                    pctOcupacao !== null && pctOcupacao >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {pctOcupacao !== null ? `${pctOcupacao}%` : "—"}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      pctOcupacao !== null && pctOcupacao >= 80 ? "bg-green-500" :
                      pctOcupacao !== null && pctOcupacao >= 50 ? "bg-amber-400" : "bg-red-400"
                    )}
                    style={{ width: `${Math.min(pctOcupacao ?? 0, 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {pctOcupacao !== null && pctOcupacao >= 80 ? (
                    <><TrendingUp className="w-3.5 h-3.5 text-green-500" /><span className="text-xs text-green-600">Dentro da expectativa</span></>
                  ) : pctOcupacao !== null && pctOcupacao >= 50 ? (
                    <><Minus className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-amber-600">Abaixo do esperado</span></>
                  ) : (
                    <><TrendingDown className="w-3.5 h-3.5 text-red-500" /><span className="text-xs text-red-600">Muito abaixo do esperado</span></>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contrato info */}
          {contrato && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5" />Implantação & Carência
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Implantação</span>
                    <span className="font-medium text-gray-800">{fmtDataModal(contrato.data_implantacao)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Início cobrança</span>
                    <span className="font-medium text-gray-800">{fmtDataModal(contrato.data_inicio_cobranca)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Carência</span>
                    {carencia ? (
                      <span className={cn(
                        "font-medium text-xs px-2 py-0.5 rounded-full",
                        carencia.encerrada ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"
                      )}>{carencia.label}</span>
                    ) : (
                      <span className="font-medium text-gray-800">{contrato.carencia_meses ?? 0} meses</span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />Financeiro
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Mensalidade base</span>
                    <span className="font-medium text-gray-800">{fmtMoedaModal(contrato.mensalidade_base ?? 0)}</span>
                  </div>
                  {(contrato.desconto_mensal ?? 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Desconto</span>
                      <span className="font-medium text-red-600">-{fmtMoedaModal(contrato.desconto_mensal ?? 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-700 font-semibold">Total mensal</span>
                    <span className="font-bold text-violet-700">{fmtMoedaModal(valorMensal)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Módulos ativos */}
          {modulosAtivos.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Puzzle className="w-3.5 h-3.5" />Módulos ativos ({modulosAtivos.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {modulosAtivos.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                    <BadgeCheck className="w-3 h-3" />{m.nome_comercial || m.codigo}
                    {(m.valor_mensal_contratado ?? 0) > 0 && (
                      <span className="text-violet-400">+{fmtMoedaModal(m.valor_mensal_contratado!)}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {contrato?.observacoes && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />Observações
              </h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">{contrato.observacoes}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function FranqueadoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<TabId>("resumo");
  const [selectedUnidadeIdx, setSelectedUnidadeIdx] = useState<number | null>(null);

  const { data: franqueadoRaw, isLoading } = useQuery({
    queryKey: ["franqueado-detail", id],
    queryFn: () => getFranqueadoById(id),
    enabled: !!id,
  });
  const franqueado = franqueadoRaw as FranqueadoDetail | undefined;

  const { data: unidadesResp } = useQuery({
    queryKey: ["franqueado-unidades", id],
    queryFn: () => listUnidades({ franqueado_id: id, limit: 100 }),
    enabled: !!id,
    staleTime: 60_000,
  });

  const unidades = (unidadesResp?.items ?? []) as UnidadeRow[];

  const { data: contratosRaw, isLoading: loadContratos } = useQuery({
    queryKey: ["franqueado-contratos", id],
    queryFn: () => getContratosByFranqueado(id),
    enabled: !!id,
    staleTime: 60_000,
  });
  const contratos = (contratosRaw ?? []) as FranqueadoContrato[];
  const contrato = contratos[0] as FranqueadoContrato | undefined;
  const sit = SITUACAO_CONFIG[franqueado?.situacao ?? "INATIVA"] ?? SITUACAO_CONFIG.INATIVA;

  const qc = useQueryClient();

  const { data: cobrancasRaw, isLoading: loadCobrancas } = useQuery({
    queryKey: ["franqueado-cobrancas-detail", contrato?.id],
    queryFn: () => getCobrancasByContrato(contrato!.id),
    enabled: !!contrato?.id && activeTab === "cobrancas",
    staleTime: 30_000,
  });
  const cobrancas = (cobrancasRaw ?? []) as FranqueadoCobrancaType[];

  const { data: parcelasRaw, isLoading: loadParcelas } = useQuery({
    queryKey: ["franqueado-parcelas-detail", contrato?.id],
    queryFn: () => getSetupParcelasByContrato(contrato!.id),
    enabled: !!contrato?.id && activeTab === "setup",
    staleTime: 30_000,
  });
  const parcelas = (parcelasRaw ?? []) as SetupParcela[];

  const { data: eventosRaw, isLoading: loadEventos } = useQuery({
    queryKey: ["franqueado-eventos", id],
    queryFn: () => getEventosByFranqueado(id, 100),
    enabled: !!id && activeTab === "historico",
    staleTime: 60_000,
  });
  const eventos = (eventosRaw ?? []) as FranqueadoEvento[];

  // cobrança status helpers
  const CobStatusColor: Record<string, string> = {
    PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
    PAGA: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ATRASADA: "bg-red-50 text-red-700 border-red-200",
    NEGOCIADA: "bg-blue-50 text-blue-700 border-blue-200",
    ISENTA: "bg-gray-50 text-gray-400 border-gray-200",
    CANCELADA: "bg-gray-50 text-gray-300 border-gray-200",
  };
  const CobStatusLabel: Record<string, string> = {
    PENDENTE: "Pendente", PAGA: "Paga", ATRASADA: "Atrasada",
    NEGOCIADA: "Negociada", ISENTA: "Isenta", CANCELADA: "Cancelada",
  };
  function fmtMoeda(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  }
  function fmtData(d: string | null | undefined) {
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }
  function competenciaLabel(c: string | null | undefined) {
    if (!c) return "—";
    const [y, m] = c.split("-");
    const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    return `${meses[parseInt(m) - 1]}/${y}`;
  }

  async function handleRegistrarPagCobranca(cob: FranqueadoCobrancaType, novoStatus: string) {
    try {
      await registrarPagamentoCobranca(cob.id, {
        status: novoStatus,
        data_pagamento: new Date().toISOString().split("T")[0],
      });
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["franqueado-cobrancas-detail", contrato?.id] });
    } catch {
      toast.error("Erro ao atualizar cobrança");
    }
  }

  async function handleRegistrarPagParcela(p: SetupParcela, novoStatus: string) {
    try {
      await registrarPagamentoParcela(p.id, {
        status: novoStatus,
        data_pagamento: new Date().toISOString().split("T")[0],
      });
      toast.success("Parcela atualizada");
      qc.invalidateQueries({ queryKey: ["franqueado-parcelas-detail", contrato?.id] });
    } catch {
      toast.error("Erro ao atualizar parcela");
    }
  }

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #ede9fe 30%, #f3f4f6 100%)" }}>

        {/* ── Header ── */}
        <div className="bg-linear-to-r from-[#1e1b4b] via-[#312e81] to-[#4c1d95] shadow-xl">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/admin/franqueados")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white rounded-lg text-sm transition-all shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-white">
                        {(franqueado?.nome || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">{franqueado?.nome || "Franqueado"}</h1>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full", sit.badge)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", sit.dot)} />
                          {sit.label}
                        </span>
                        {franqueado?.cpf && (
                          <span className="text-violet-300 text-xs">{franqueado.cpf}</span>
                        )}
                        <span className="text-violet-400 text-xs">{unidades.length} unidade{unidades.length !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => toast("Edição de franqueado em desenvolvimento", { icon: "🚧" })}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm rounded-xl transition-all shrink-0"
              >
                Editar
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

          {/* ── Tab navigation ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 shrink-0 transition-all",
                    activeTab === tab.id
                      ? "border-violet-600 text-violet-700 bg-violet-50/60"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="p-6">

              {/* ── RESUMO ── */}
              {activeTab === "resumo" && (
                <div className="space-y-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    </div>
                  ) : (
                    <>
                      {/* KPI row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: "Unidades",   value: unidades.length,                              icon: Building2,    color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-100" },
                          { label: "Ativas",     value: unidades.filter(u => u.status === "ATIVA").length,  icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",   border: "border-green-100"  },
                          { label: "Homologação",value: unidades.filter(u => u.status === "HOMOLOGACAO").length, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-yellow-100" },
                          { label: "Inativas",   value: unidades.filter(u => u.status === "INATIVA").length, icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
                        ].map((kpi) => (
                          <Card key={kpi.label} className={cn("border", kpi.border)}>
                            <CardContent className="p-5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
                                  <p className={cn("text-3xl font-bold mt-1", kpi.color)}>{kpi.value}</p>
                                </div>
                                <div className={cn("p-2.5 rounded-xl", kpi.bg)}>
                                  <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Franqueado info card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dados cadastrais</p>
                          {[
                            { label: "Nome",    value: franqueado?.nome },
                            { label: "CPF/CNPJ",value: franqueado?.cpf },
                            { label: "E-mail",  value: franqueado?.email },
                            { label: "Telefone",value: franqueado?.telefone },
                            { label: "Situação",value: sit.label },
                          ].filter(f => f.value).map((f) => (
                            <div key={f.label} className="flex items-start justify-between text-sm gap-4">
                              <span className="text-gray-400 shrink-0">{f.label}</span>
                              <span className="font-medium text-gray-800 text-right">{f.value}</span>
                            </div>
                          ))}
                        </div>

                        {/* Unidades preview */}
                        <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidades</p>
                          {unidades.length === 0 ? (
                            <div className="flex items-center gap-2 text-xs text-gray-400 italic"><AlertCircle className="w-3.5 h-3.5" />Nenhuma unidade vinculada</div>
                          ) : (
                            unidades.slice(0, 4).map((u) => {
                              const st = UNIDADE_STATUS_CONFIG[u.status ?? "HOMOLOGACAO"] ?? UNIDADE_STATUS_CONFIG.HOMOLOGACAO;
                              return (
                                <div key={u.id} className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                                    <Building2 className="w-3.5 h-3.5 text-violet-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{u.nome || "Unidade"}</p>
                                    {u.endereco?.cidade_nome && <p className="text-xs text-gray-400">{u.endereco.cidade_nome}</p>}
                                  </div>
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", st.badge)}>{st.label}</span>
                                </div>
                              );
                            })
                          )}
                          {unidades.length > 4 && (
                            <button onClick={() => setActiveTab("unidades")} className="text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1">
                              +{unidades.length - 4} mais <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── CONTATO ── */}
              {activeTab === "contato" && (
                <div className="space-y-4 max-w-xl">
                  {[
                    { icon: User,  label: "Nome",     value: franqueado?.nome },
                    { icon: Mail,  label: "E-mail",   value: franqueado?.email },
                    { icon: Phone, label: "Telefone", value: franqueado?.telefone },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="text-sm font-semibold text-gray-800">{value || "—"}</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-2 mt-4 p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                    <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-yellow-700">Dados complementares de contato (gestor financeiro, WhatsApp) serão disponíveis após integração com a tabela de contratos.</p>
                  </div>
                </div>
              )}

              {/* ── COMERCIAL ── */}
              {activeTab === "comercial" && (
                <div className="space-y-5">
                  {loadContratos ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    </div>
                  ) : !contrato ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-amber-800">Nenhum contrato cadastrado</p>
                          <p className="text-xs text-amber-600 mt-0.5">Crie o contrato comercial no formulário de 5 etapas para visualizar os dados aqui.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push("/admin/franqueados/contratos")}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        Cadastrar Contrato
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Identificação */}
                      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Identificação Comercial</p>
                        {[
                          { label: "Código",        value: contrato.codigo },
                          { label: "Nome Fantasia",  value: contrato.nome_fantasia },
                          { label: "CNPJ/CPF",       value: contrato.cnpj_cpf },
                          { label: "Razão Social",   value: contrato.razao_social },
                          { label: "Segmento",       value: contrato.segmento },
                          { label: "Status Comercial", value: contrato.status_comercial },
                        ].filter(f => f.value).map((f) => (
                          <div key={f.label} className="flex items-start justify-between text-sm gap-4">
                            <span className="text-gray-400 shrink-0">{f.label}</span>
                            <span className="font-medium text-gray-800 text-right">{f.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Valores */}
                      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valores e Cobrança</p>
                        {[
                          { label: "Mensalidade Base", value: contrato.mensalidade_base != null ? `R$ ${Number(contrato.mensalidade_base).toFixed(2)}` : undefined },
                          { label: "Desconto",         value: contrato.desconto_mensal ? `R$ ${Number(contrato.desconto_mensal).toFixed(2)} — ${contrato.desconto_motivo ?? ""}` : undefined },
                          { label: "Setup Total",      value: contrato.setup_valor_total != null ? `R$ ${Number(contrato.setup_valor_total).toFixed(2)} (${contrato.setup_parcelas}x)` : undefined },
                          { label: "Tipo de Cobrança", value: contrato.tipo_cobranca },
                          { label: "Dia Vencimento",   value: contrato.dia_vencimento != null ? `Dia ${contrato.dia_vencimento}` : undefined },
                          { label: "Carência",         value: contrato.carencia_meses != null ? `${contrato.carencia_meses} meses` : undefined },
                        ].filter(f => f.value).map((f) => (
                          <div key={f.label} className="flex items-start justify-between text-sm gap-4">
                            <span className="text-gray-400 shrink-0">{f.label}</span>
                            <span className="font-medium text-gray-800 text-right">{f.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Datas */}
                      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datas</p>
                        {[
                          { label: "Implantação",      value: contrato.data_implantacao },
                          { label: "Go-Live",          value: contrato.data_go_live },
                          { label: "Início Cobrança",  value: contrato.data_inicio_cobranca },
                        ].filter(f => f.value).map((f) => (
                          <div key={f.label} className="flex items-start justify-between text-sm gap-4">
                            <span className="text-gray-400 shrink-0">{f.label}</span>
                            <span className="font-medium text-gray-800 text-right">{f.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Responsáveis */}
                      <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsáveis</p>
                        {[
                          { label: "Comercial",    value: contrato.responsavel_comercial },
                          { label: "Implantação", value: contrato.responsavel_implantacao },
                        ].filter(f => f.value).map((f) => (
                          <div key={f.label} className="flex items-start justify-between text-sm gap-4">
                            <span className="text-gray-400 shrink-0">{f.label}</span>
                            <span className="font-medium text-gray-800 text-right">{f.value}</span>
                          </div>
                        ))}
                        {contrato.observacoes && (
                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-400 mb-1">Observações</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{contrato.observacoes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── MÓDULOS ── */}
              {activeTab === "modulos" && (
                <div className="space-y-4">
                  {loadContratos ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
                  ) : !contrato ? (
                    <StubTab icon={Package} tituloPendente="Módulos contratados" descricao="Crie o contrato comercial para visualizar os módulos ativos deste franqueado." fase="Aguardando contrato" />
                  ) : !contrato.modulos || contrato.modulos.length === 0 ? (
                    <StubTab icon={Package} tituloPendente="Nenhum módulo cadastrado" descricao="Edite o contrato e inclua os módulos contratados para vê-los aqui." fase="Editar contrato" />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {contrato.modulos.map((m) => (
                        <div key={m.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-violet-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-800 truncate">{m.nome_comercial}</p>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
                                m.status === "ATIVO" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                              )}>{m.status ?? "ATIVO"}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span className="uppercase tracking-wide font-mono">{m.codigo}</span>
                              <span className="capitalize">{m.tipo}</span>
                              {m.valor_mensal_contratado != null && m.valor_mensal_contratado > 0 && (
                                <span className="font-medium text-violet-600">R$ {Number(m.valor_mensal_contratado).toFixed(2)}/mês</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── IMPLANTAÇÃO ── */}
              {activeTab === "implant" && (
                <div className="space-y-6">
                  {!contrato ? (
                    <StubTab icon={Wrench} tituloPendente="Dados de implantação" descricao="Crie o contrato comercial para visualizar os dados de implantação." fase="Aguardando contrato" />
                  ) : (
                    <>
                      {/* Status geral */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[{
                          label: "Status",
                          value: ({ NAO_INICIADA: "Não iniciada", EM_ANDAMENTO: "Em andamento", HOMOLOGACAO: "Homologação", CONCLUIDA: "Concluída" } as Record<string,string>)[contrato.status_implantacao ?? ""] ?? (contrato.status_implantacao ?? "—"),
                          color: contrato.status_implantacao === "CONCLUIDA" ? "text-green-600" : contrato.status_implantacao === "EM_ANDAMENTO" ? "text-blue-600" : contrato.status_implantacao === "HOMOLOGACAO" ? "text-amber-600" : "text-gray-500",
                          bg: contrato.status_implantacao === "CONCLUIDA" ? "bg-green-50" : contrato.status_implantacao === "EM_ANDAMENTO" ? "bg-blue-50" : contrato.status_implantacao === "HOMOLOGACAO" ? "bg-amber-50" : "bg-gray-50",
                        }, {
                          label: "Familiaridade",
                          value: ({ baixa: "Baixa ⚠️", media: "Média ↗️", alta: "Alta ✅" } as Record<string,string>)[contrato.familiaridade_tecnologia ?? ""] ?? (contrato.familiaridade_tecnologia ?? "—"),
                          color: "text-gray-700", bg: "bg-gray-50",
                        }, {
                          label: "Integração externa",
                          value: contrato.integracao_externa ? "Sim" : "Não",
                          color: contrato.integracao_externa ? "text-violet-600" : "text-gray-400",
                          bg: contrato.integracao_externa ? "bg-violet-50" : "bg-gray-50",
                        }].map(k => (
                          <div key={k.label} className={`${k.bg} rounded-xl p-4 text-center`}>
                            <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Datas */}
                      <div className="bg-white border border-gray-100 rounded-xl p-5">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />Cronograma
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {[
                            { label: "Data de implantação", value: fmtData(contrato.data_implantacao) },
                            { label: "Previsão de go-live",   value: fmtData(contrato.data_go_live) },
                            { label: "Início de cobrança",   value: fmtData(contrato.data_inicio_cobranca) },
                            { label: "Carência (meses)",      value: contrato.carencia_meses != null ? `${contrato.carencia_meses} meses` : "—" },
                            { label: "Unidades esperadas",    value: contrato.unidades_esperadas != null ? String(contrato.unidades_esperadas) : "—" },
                            { label: "Usuários esperados",    value: contrato.usuarios_ativos_esperados != null ? String(contrato.usuarios_ativos_esperados) : "—" },
                          ].map(r => (
                            <div key={r.label}>
                              <p className="text-xs text-gray-400">{r.label}</p>
                              <p className="text-sm font-semibold text-gray-800 mt-0.5">{r.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Responsaveis */}
                      <div className="bg-white border border-gray-100 rounded-xl p-5">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />Responsáveis
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { label: "Responsável comercial",    value: contrato.responsavel_comercial },
                            { label: "Responsável implantação", value: contrato.responsavel_implantacao },
                          ].map(r => (
                            <div key={r.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                                <User className="w-3.5 h-3.5 text-violet-500" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">{r.label}</p>
                                <p className="text-sm font-medium text-gray-800">{r.value ?? "—"}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Integrações */}
                      {contrato.integracoes_previstas && (
                        <div className="bg-white border border-gray-100 rounded-xl p-5">
                          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5" />Integrações previstas
                          </h3>
                          <p className="text-sm text-gray-700">{contrato.integracoes_previstas}</p>
                        </div>
                      )}

                      {/* Observacoes */}
                      {contrato.observacoes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
                          <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />Observações
                          </h3>
                          <p className="text-sm text-gray-700 leading-relaxed">{contrato.observacoes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── COBRANÇAS ── */}
              {activeTab === "cobrancas" && (
                <div className="space-y-4">
                  {!contrato ? (
                    <StubTab icon={CreditCard} tituloPendente="Cobranças mensais" descricao="Crie o contrato comercial para gerar e acompanhar cobranças." fase="Aguardando contrato" />
                  ) : loadCobrancas ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
                  ) : cobrancas.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                      <CreditCard className="w-10 h-10 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-500 mb-1">Nenhuma cobrança gerada</p>
                      <p className="text-xs text-gray-400 mb-4">Use &ldquo;Gerar Cobranças&rdquo; na página de cobranças para criar faturas mensais.</p>
                      <button
                        onClick={() => router.push("/admin/franqueados/cobrancas")}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition"
                      >
                        <Zap className="w-4 h-4" />
                        Ir para Cobranças
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* KPIs */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                        {[
                          { label: "Total", v: cobrancas.length, color: "text-violet-600" },
                          { label: "Pendentes", v: cobrancas.filter(c => c.status === "PENDENTE").length, color: "text-amber-600" },
                          { label: "Atrasadas", v: cobrancas.filter(c => c.status === "ATRASADA").length, color: "text-red-600" },
                          { label: "Pagas", v: cobrancas.filter(c => c.status === "PAGA").length, color: "text-emerald-600" },
                        ].map(k => (
                          <div key={k.label} className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className={`text-2xl font-bold ${k.color}`}>{k.v}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Table */}
                      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Competência</th>
                              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Vencimento</th>
                              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Valor</th>
                              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {cobrancas.map(c => (
                              <tr key={c.id} className="hover:bg-violet-50/20 transition">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {competenciaLabel(c.competencia)}
                                  {c.carencia_aplicada && <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">cariência</span>}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{fmtData(c.data_vencimento)}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fmtMoeda(Number(c.valor_total))}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${CobStatusColor[c.status ?? "PENDENTE"] ?? ""}`}>
                                    {CobStatusLabel[c.status ?? "PENDENTE"]}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {c.status === "PENDENTE" && (
                                    <button
                                      onClick={() => void handleRegistrarPagCobranca(c, "PAGA")}
                                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition"
                                    >
                                      <BadgeCheck className="w-3.5 h-3.5" />
                                      Pagar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── SETUP ── */}
              {activeTab === "setup" && (
                <div className="space-y-4">
                  {!contrato ? (
                    <StubTab icon={FileText} tituloPendente="Parcelas de setup" descricao="Crie o contrato comercial com valor de setup para gerar parcelas." fase="Aguardando contrato" />
                  ) : loadParcelas ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
                  ) : parcelas.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                      <FileText className="w-10 h-10 text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-500 mb-1">Nenhuma parcela de setup</p>
                      <p className="text-xs text-gray-400">
                        {contrato.setup_valor_total && Number(contrato.setup_valor_total) > 0
                          ? `Setup de ${fmtMoeda(Number(contrato.setup_valor_total))} em ${contrato.setup_parcelas ?? 1}x — use a API para gerar as parcelas.`
                          : "Nenhum valor de setup definido no contrato."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Resumo */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                        {[
                          { label: "Total parcelas", v: parcelas.length, color: "text-violet-600" },
                          { label: "Pagas", v: parcelas.filter(p => p.status === "PAGA").length, color: "text-emerald-600" },
                          { label: "Pendentes", v: parcelas.filter(p => p.status === "PENDENTE" || p.status === "ATRASADA").length, color: "text-amber-600" },
                        ].map(k => (
                          <div key={k.label} className="bg-gray-50 rounded-xl p-3 text-center">
                            <p className={`text-2xl font-bold ${k.color}`}>{k.v}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">Total setup: <strong className="text-gray-900">{fmtMoeda(parcelas.reduce((s, p) => s + Number(p.valor_parcela), 0))}</strong></p>

                      {/* Parcelas */}
                      <div className="space-y-3">
                        {parcelas.map(p => (
                          <div key={p.id} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-violet-600">{p.numero_parcela}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">
                                Parcela {p.numero_parcela}{p.total_parcelas ? `/${p.total_parcelas}` : ""}
                                <span className="ml-2 font-bold text-gray-900">{fmtMoeda(Number(p.valor_parcela))}</span>
                              </p>
                              <p className="text-xs text-gray-400">
                                Vencimento: {fmtData(p.data_vencimento)}
                                {p.data_pagamento && ` • Pago em: ${fmtData(p.data_pagamento)}`}
                              </p>
                            </div>
                            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${CobStatusColor[p.status ?? "PENDENTE"] ?? ""}  shrink-0`}>
                              {CobStatusLabel[p.status ?? "PENDENTE"]}
                            </span>
                            {(p.status === "PENDENTE" || p.status === "ATRASADA") && (
                              <button
                                onClick={() => void handleRegistrarPagParcela(p, "PAGA")}
                                className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition"
                              >
                                <BadgeCheck className="w-3.5 h-3.5" />
                                Pagar
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── UNIDADES & ALUNOS ── */}
              {activeTab === "unidades" && (
                <div className="space-y-4">
                  {unidades.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                      <Building2 className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">Nenhuma unidade vinculada a este franqueado.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-500">{unidades.length} unidade{unidades.length !== 1 ? "s" : ""} vinculada{unidades.length !== 1 ? "s" : ""}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {unidades.map((u, idx) => {
                          const st = UNIDADE_STATUS_CONFIG[u.status ?? "HOMOLOGACAO"] ?? UNIDADE_STATUS_CONFIG.HOMOLOGACAO;
                          return (
                            <div
                              key={u.id}
                              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition-all cursor-pointer"
                              onClick={() => setSelectedUnidadeIdx(idx)}
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                                    <Building2 className="w-5 h-5 text-violet-500" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{u.nome || "Unidade"}</p>
                                    {u.endereco?.cidade_nome && (
                                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" />{u.endereco.cidade_nome}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", st.badge)}>{st.label}</span>
                              </div>
                              <div className="pt-3 border-t border-gray-100">
                                <div className="flex items-center justify-between gap-2 text-xs text-gray-500 mb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="font-medium">Alunos</span>
                                  </div>
                                  <span className="text-xs text-violet-400 flex items-center gap-0.5">Ver detalhes <ChevronRight className="w-3 h-3" /></span>
                                </div>
                                <UnitAlunoDetail unidadeId={u.id} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── HISTÓRICO ── */}
              {activeTab === "historico" && (
                <div className="space-y-6">

                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-gray-800">Histórico de Eventos</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Auditoria de alterações contratuais, cobranças e módulos</p>
                    </div>
                    <span className="text-xs text-gray-400">{eventos.length} evento(s)</span>
                  </div>

                  {/* Timeline */}
                  {loadEventos ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                    </div>
                  ) : eventos.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-center">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                        <History className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium mb-1">Nenhum evento registrado</p>
                      <p className="text-xs text-gray-400 max-w-xs">
                        Os eventos são registrados automaticamente ao criar contratos, gerar cobranças e registrar pagamentos.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* vertical line */}
                      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100" />

                      <div className="space-y-1">
                        {eventos.map((ev) => {
                          const cfg = EVENTO_CONFIG[ev.tipo_evento as keyof typeof EVENTO_CONFIG] ?? EVENTO_CONFIG.OUTRO;
                          return (
                            <div key={ev.id} className="flex gap-4 relative">
                              {/* dot */}
                              <div className={cn("w-10 h-10 shrink-0 rounded-full flex items-center justify-center z-10", cfg.bg)}>
                                <cfg.icon className={cn("w-4 h-4", cfg.color)} />
                              </div>
                              <div className="flex-1 pb-5">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className={cn("text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full", cfg.pill)}>
                                    {cfg.label}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(ev.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {ev.usuario_responsavel && (
                                    <span className="text-xs text-gray-400">&bull; {ev.usuario_responsavel}</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{ev.descricao}</p>
                                {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                                  <details className="mt-1.5">
                                    <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Ver detalhes</summary>
                                    <pre className="mt-1 text-xs text-gray-500 bg-gray-50 rounded p-2 overflow-x-auto">{JSON.stringify(ev.metadata, null, 2)}</pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      {/* ── Unidade Detail Modal ── */}
      {selectedUnidadeIdx !== null && unidades[selectedUnidadeIdx] && (
        <UnidadeDetailModal
          unidade={unidades[selectedUnidadeIdx]}
          contrato={contrato}
          onClose={() => setSelectedUnidadeIdx(null)}
          onPrev={() => setSelectedUnidadeIdx(i => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setSelectedUnidadeIdx(i => (i !== null && i < unidades.length - 1 ? i + 1 : i))}
          hasPrev={selectedUnidadeIdx > 0}
          hasNext={selectedUnidadeIdx < unidades.length - 1}
          currentIndex={selectedUnidadeIdx}
          total={unidades.length}
        />
      )}
    </ProtectedRoute>
  );
}
