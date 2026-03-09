"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useQuery } from "@tanstack/react-query";
import { listFranqueados, listUnidades, listAlunos, getCobrancaKpis } from "@/lib/peopleApi";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Search,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  Loader2,
  Filter,
  MapPin,
  AlertCircle,
  LayoutDashboard,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────
interface FranqueadoRow {
  id: string;
  nome?: string;
  cpf?: string;
  email?: string;
  telefone?: string;
  situacao?: string;
  ativo?: boolean;
}

interface UnidadeRow {
  id: string;
  nome?: string;
  franqueado_id?: string;
  status?: string;
  endereco?: { cidade_nome?: string; logradouro?: string };
}

const UNIDADE_STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  ATIVA:       { label: "Ativa",       badge: "bg-green-100 text-green-700" },
  INATIVA:     { label: "Inativa",     badge: "bg-red-100 text-red-700" },
  HOMOLOGACAO: { label: "Homologação", badge: "bg-yellow-100 text-yellow-700" },
};

// ── Aluno count lazy component ─────────────────────────────────
function UnitAlunoCount({ unidadeId }: { unidadeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["unit-alunos-count", unidadeId],
    queryFn: () => listAlunos({ unidade_id: unidadeId, pageSize: 1 }),
    staleTime: 120_000,
  });
  if (isLoading) return <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-300" />;
  const total = data?.total ?? 0;
  return (
    <span className="text-sm tabular-nums font-semibold text-gray-800">
      {total}
      <span className="text-gray-400 text-xs font-normal ml-1">aluno{total !== 1 ? "s" : ""}</span>
    </span>
  );
}

// ── Expanded units row ─────────────────────────────────────────
function UnidadesRow({ franqueado, unidades }: { franqueado: FranqueadoRow; unidades: UnidadeRow[] }) {
  const myUnidades = unidades.filter((u) => u.franqueado_id === franqueado.id);
  if (myUnidades.length === 0) {
    return (
      <tr className="bg-violet-50/30">
        <td colSpan={6} className="px-10 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 italic">
            <AlertCircle className="w-3.5 h-3.5" />
            Nenhuma unidade vinculada.
          </div>
        </td>
      </tr>
    );
  }
  return (
    <tr className="bg-violet-50/30">
      <td colSpan={6} className="px-8 pb-4 pt-1">
        <div className="bg-white border border-violet-100 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs font-semibold text-violet-700">
              {myUnidades.length} unidade{myUnidades.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {myUnidades.map((u) => {
              const st = UNIDADE_STATUS_CONFIG[u.status ?? "HOMOLOGACAO"] ?? UNIDADE_STATUS_CONFIG.HOMOLOGACAO;
              return (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-violet-50/40 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{u.nome || "Unidade"}</p>
                    {u.endereco?.cidade_nome && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{u.endereco.cidade_nome}
                      </p>
                    )}
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0", st.badge)}>
                    {st.label}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <UnitAlunoCount unidadeId={u.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Unidades & Alunos tab ──────────────────────────────────────
function UnidadesAlunosTab({ unidades, franqueados }: { unidades: UnidadeRow[]; franqueados: FranqueadoRow[] }) {
  const [filtroFranqueado, setFiltroFranqueado] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");

  const filtered = unidades.filter((u) => {
    if (filtroFranqueado && u.franqueado_id !== filtroFranqueado) return false;
    if (filtroStatus && u.status !== filtroStatus) return false;
    if (busca && !u.nome?.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const getFranqueadoNome = (id?: string) =>
    franqueados.find((f) => f.id === id)?.nome ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar unidade…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <select
          value={filtroFranqueado}
          onChange={(e) => setFiltroFranqueado(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
        >
          <option value="">Todos os franqueados</option>
          {franqueados.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
        >
          <option value="">Todos os status</option>
          <option value="ATIVA">Ativa</option>
          <option value="HOMOLOGACAO">Homologação</option>
          <option value="INATIVA">Inativa</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} unidade{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Unidade</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Franqueado</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Cidade</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">
                  <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Alunos</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Building2 className="w-10 h-10 text-gray-200 mx-auto" />
                    <p className="text-sm text-gray-400 mt-2">Nenhuma unidade encontrada</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const st = UNIDADE_STATUS_CONFIG[u.status ?? "HOMOLOGACAO"] ?? UNIDADE_STATUS_CONFIG.HOMOLOGACAO;
                  return (
                    <tr key={u.id} className="hover:bg-violet-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-violet-500" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 transition-colors">
                            {u.nome || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getFranqueadoNome(u.franqueado_id)}</td>
                      <td className="px-6 py-4">
                        <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", st.badge)}>{st.label}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{u.endereco?.cidade_nome ?? "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <UnitAlunoCount unidadeId={u.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Static configs ─────────────────────────────────────────────
const SITUACAO_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  ATIVA:         { label: "Ativa",          dot: "bg-green-500",  badge: "bg-green-100 text-green-700" },
  INATIVA:       { label: "Inativa",        dot: "bg-red-400",    badge: "bg-red-100 text-red-700" },
  EM_HOMOLOGACAO:{ label: "Em Homologação", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700" },
};

const LIMIT = 15;

// ── Main page ──────────────────────────────────────────────────
export default function AdminFranqueadosPage() {
  const router = useRouter();

  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("");
  const [pagina, setPagina] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"franqueados" | "unidades">("franqueados");

  // Paged list (for table)
  const { data: franqueadosResp, isLoading } = useQuery({
    queryKey: ["admin-franqueados", busca, filtroSituacao, pagina],
    queryFn: () => listFranqueados({ busca: busca || undefined, situacao: filtroSituacao || undefined, page: pagina, limit: LIMIT }),
  });

  // Full list (for UnidadesAlunosTab franqueado filter)
  const { data: allFranqueadosResp } = useQuery({
    queryKey: ["admin-franqueados-all"],
    queryFn: () => listFranqueados({ limit: 500 }),
    staleTime: 120_000,
  });

  const { data: unidadesResp } = useQuery({
    queryKey: ["admin-todas-unidades"],
    queryFn: () => listUnidades({ limit: 500 }),
    staleTime: 60_000,
  });

  const franqueados = (franqueadosResp?.items ?? []) as FranqueadoRow[];
  const allFranqueados = (allFranqueadosResp?.items ?? []) as FranqueadoRow[];
  const totalPages = franqueadosResp ? Math.ceil((franqueadosResp.total || 0) / (franqueadosResp.pageSize || LIMIT)) : 1;
  const totalRegistros = franqueadosResp?.total ?? franqueados.length;
  const unidades = (unidadesResp?.items ?? []) as UnidadeRow[];
  const totalUnidades = unidadesResp?.total ?? unidades.length;

  const unidadesPorFranqueado = (id: string) => unidades.filter((u) => u.franqueado_id === id).length;
  const totalAtivos      = (allFranqueadosResp?.total != null ? allFranqueados : franqueados).filter((f) => f.situacao === "ATIVA").length;
  const totalHomologacao = (allFranqueadosResp?.total != null ? allFranqueados : franqueados).filter((f) => f.situacao === "EM_HOMOLOGACAO").length;
  const totalInativos    = (allFranqueadosResp?.total != null ? allFranqueados : franqueados).filter((f) => f.situacao === "INATIVA").length;

  const { data: cobKpisRaw } = useQuery({
    queryKey: ["cobranca-kpis"],
    queryFn: () => getCobrancaKpis(),
    staleTime: 60_000,
  });
  const cobKpis = cobKpisRaw as { mrr: number; setupPendente: number; cobrancasAtrasadas: number; cobrancasVencendo7dias: number } | undefined;

  function fmtMoeda(v: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
  }

  const kpis = [
    { label: "Franqueados",     value: String(totalRegistros),  icon: Users,        color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-100" },
    { label: "Ativos",          value: String(totalAtivos),     icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",   border: "border-green-100"  },
    { label: "Em Homologação",  value: String(totalHomologacao),icon: Clock,        color: "text-yellow-600", bg: "bg-yellow-50",  border: "border-yellow-100" },
    { label: "Inativos",        value: String(totalInativos),   icon: XCircle,      color: "text-red-500",    bg: "bg-red-50",     border: "border-red-100"    },
    { label: "Total Unidades",  value: String(totalUnidades),   icon: Building2,    color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-100"   },
    { label: "MRR Contratado",  value: cobKpis ? fmtMoeda(cobKpis.mrr) : "—",                    icon: TrendingUp,    color: "text-violet-600", bg: "bg-violet-50",  border: "border-violet-100" },
    { label: "Cob. Atrasadas",  value: cobKpis ? String(cobKpis.cobrancasAtrasadas) : "—",        icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50",     border: "border-red-100"    },
    { label: "Vence em 7 dias", value: cobKpis ? String(cobKpis.cobrancasVencendo7dias) : "—",   icon: DollarSign,    color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-100"  },
  ];

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));
  const handleBuscaChange = (v: string) => { setBusca(v); setPagina(1); };
  const handleFiltroSituacao = (v: string) => { setFiltroSituacao(v); setPagina(1); };

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #ede9fe 30%, #f3f4f6 100%)" }}>

        {/* ── Header ── */}
        <div className="bg-linear-to-r from-[#1e1b4b] via-[#312e81] to-[#4c1d95] shadow-xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/admin/sistema")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white rounded-lg text-sm transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Gestão de Franqueados</h1>
                  <p className="text-violet-200 text-sm mt-0.5">Controle comercial, implantação e cobrança B2B</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/admin/franqueados/contratos")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-800 rounded-xl font-semibold text-sm hover:bg-violet-50 transition-all shadow"
                >
                  <FileText className="w-4 h-4" />
                  Novo Contrato
                </button>
                <button
                  onClick={() => toast("Cadastro de franqueado em desenvolvimento", { icon: "🚧" })}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold text-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Novo Franqueado
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

          {/* KPIs — Operacionais */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {kpis.slice(0, 5).map((kpi) => (
              <Card key={kpi.label} className={cn("border", kpi.border)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 font-medium leading-tight">{kpi.label}</p>
                      <p className={cn("text-3xl font-bold mt-1 tabular-nums", kpi.color)}>
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin opacity-40 mt-1" /> : kpi.value}
                      </p>
                    </div>
                    <div className={cn("p-2.5 rounded-xl", kpi.bg)}>
                      <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* KPIs — Financeiros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {kpis.slice(5).map((kpi) => (
              <Card key={kpi.label} className={cn("border", kpi.border)}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{kpi.label}</p>
                      <p className={cn("text-2xl font-bold tabular-nums", kpi.color)}>
                        {kpi.value}
                      </p>
                    </div>
                    <div className={cn("p-2.5 rounded-xl", kpi.bg)}>
                      <kpi.icon className={cn("w-5 h-5", kpi.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {(["franqueados", "unidades"] as const).map((tab) => {
              const labels: Record<string, string> = { franqueados: "Franqueados", unidades: "Unidades & Alunos" };
              const icons: Record<string, React.ReactNode> = {
                franqueados: <Users className="w-4 h-4" />,
                unidades:    <Building2 className="w-4 h-4" />,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    activeTab === tab
                      ? "bg-white text-violet-700 shadow-sm border border-violet-100"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {icons[tab]}
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* ── Franqueados tab ── */}
          {activeTab === "franqueados" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Filter bar */}
              <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={busca}
                      onChange={(e) => handleBuscaChange(e.target.value)}
                      placeholder="Buscar por nome ou e-mail…"
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={filtroSituacao}
                      onChange={(e) => handleFiltroSituacao(e.target.value)}
                      className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-white appearance-none cursor-pointer"
                    >
                      <option value="">Todas as situações</option>
                      <option value="ATIVA">Ativa</option>
                      <option value="EM_HOMOLOGACAO">Em Homologação</option>
                      <option value="INATIVA">Inativa</option>
                    </select>
                  </div>
                </div>
                <p className="text-sm text-gray-400 shrink-0">
                  {totalRegistros} franqueado{totalRegistros !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="w-8 px-4 py-3" />
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Franqueado</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Situação</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">E-mail</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Unidades</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Contrato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto" />
                          <p className="text-sm text-gray-400 mt-2">Carregando franqueados…</p>
                        </td>
                      </tr>
                    ) : franqueados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <Users className="w-10 h-10 text-gray-200 mx-auto" />
                          <p className="text-sm text-gray-400 mt-2">Nenhum franqueado encontrado</p>
                        </td>
                      </tr>
                    ) : (
                      franqueados.map((f) => {
                        const sit = SITUACAO_CONFIG[f.situacao ?? "INATIVA"] ?? SITUACAO_CONFIG["INATIVA"];
                        const numUnidades = unidadesPorFranqueado(f.id);
                        const isExpanded = expandedId === f.id;
                        return (
                          <React.Fragment key={f.id}>
                            <tr
                              className={cn(
                                "transition-colors group cursor-pointer",
                                isExpanded ? "bg-violet-50/60" : "hover:bg-violet-50/30"
                              )}
                              onClick={() => router.push(`/admin/franqueados/${f.id}`)}
                            >
                              <td className="pl-4 py-4">
                                <button
                                  className="w-6 h-6 flex items-center justify-center text-gray-400 group-hover:text-violet-500 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(f.id); }}
                                >
                                  {isExpanded
                                    ? <ChevronDown className="w-4 h-4 text-violet-500" />
                                    : <ChevronRight className="w-4 h-4" />
                                  }
                                </button>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                                    <span className="text-sm font-semibold text-violet-600">
                                      {(f.nome || "?")[0].toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                                      {f.nome || "—"}
                                    </p>
                                    {f.cpf && <p className="text-xs text-gray-400">{f.cpf}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", sit.badge)}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", sit.dot)} />
                                  {sit.label}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-600">{f.email || "—"}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  <Building2 className="w-4 h-4 text-gray-400" />
                                  <span className="font-medium">{numUnidades}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/admin/franqueados/${f.id}`); }}
                                  className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors"
                                >
                                  Ver contrato
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <UnidadesRow franqueado={f} unidades={unidades} />
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-400">Página {pagina} de {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={pagina === 1}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = pagina <= 3 ? i + 1 : pagina >= totalPages - 2 ? totalPages - 4 + i : pagina - 2 + i;
                      if (page < 1 || page > totalPages) return null;
                      return (
                        <button
                          key={page}
                          onClick={() => setPagina(page)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-sm font-medium transition",
                            page === pagina ? "bg-violet-600 text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPagina((p) => Math.min(totalPages, p + 1))}
                      disabled={pagina === totalPages}
                      className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Unidades & Alunos tab ── */}
          {activeTab === "unidades" && (
            <UnidadesAlunosTab unidades={unidades} franqueados={allFranqueados} />
          )}

          {/* Roadmap notice */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
              <LayoutDashboard className="w-4 h-4 text-violet-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-violet-800">Módulo em desenvolvimento ativo</p>
              <p className="text-xs text-violet-600 mt-1 leading-relaxed">
                <strong>Fase 1:</strong> Painel de franqueados e unidades (atual) ·{" "}
                <strong>Fase 2:</strong> Contratos, carência e setup ·{" "}
                <strong>Fase 3:</strong> Cobranças mensais, módulos extras e KPIs financeiros B2B
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
