"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  ArrowLeft,
  ReceiptText,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  ChevronRight,
  Plus,
  Zap,
  DollarSign,
  Calendar,
  CreditCard,
  Search,
  RefreshCw,
  BadgeCheck,
  Loader2,
} from "lucide-react";
import {
  listCobrancas,
  gerarCobrancas,
  registrarPagamentoCobranca,
  type FranqueadoCobranca,
} from "@/lib/peopleApi";

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGA: "Paga",
  ATRASADA: "Atrasada",
  NEGOCIADA: "Negociada",
  ISENTA: "Isenta",
  CANCELADA: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  PENDENTE: "bg-amber-50 text-amber-700 border-amber-200",
  PAGA: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ATRASADA: "bg-red-50 text-red-700 border-red-200",
  NEGOCIADA: "bg-blue-50 text-blue-700 border-blue-200",
  ISENTA: "bg-gray-50 text-gray-500 border-gray-200",
  CANCELADA: "bg-gray-50 text-gray-400 border-gray-200",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PENDENTE: Clock,
  PAGA: CheckCircle2,
  ATRASADA: AlertCircle,
  NEGOCIADA: BadgeCheck,
  ISENTA: XCircle,
  CANCELADA: XCircle,
};

function fmtMoeda(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtData(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function competenciaLabel(c: string | null) {
  if (!c) return "—";
  const [y, m] = c.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(m) - 1]}/${y}`;
}

// ── Modal Registrar Pagamento ─────────────────────────────────────────────────

interface PagamentoModalProps {
  cobranca: FranqueadoCobranca;
  onClose: () => void;
  onSuccess: () => void;
}

function PagamentoModal({ cobranca, onClose, onSuccess }: PagamentoModalProps) {
  const [status, setStatus] = useState<string>(cobranca.status ?? "PAGA");
  const [dataPagamento, setDataPagamento] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [formaPagamento, setFormaPagamento] = useState<string>("");
  const [observacao, setObservacao] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function handleSalvar() {
    setLoading(true);
    try {
      await registrarPagamentoCobranca(cobranca.id, {
        status,
        data_pagamento: dataPagamento || undefined,
        forma_pagamento: formaPagamento || undefined,
        observacao: observacao || undefined,
      });
      toast.success("Pagamento registrado com sucesso");
      onSuccess();
      onClose();
    } catch {
      toast.error("Erro ao registrar pagamento");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Registrar Pagamento</h2>
        <p className="text-sm text-gray-500 mb-5">
          Competência: <strong>{competenciaLabel(cobranca.competencia)}</strong> — {fmtMoeda(Number(cobranca.valor_total))}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de pagamento</label>
            <input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forma de pagamento</label>
            <input
              type="text"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
              placeholder="PIX, boleto, transferência..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Observação opcional..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => void handleSalvar()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Gerar Cobranças ────────────────────────────────────────────────────

function GerarModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const hoje = new Date();
  const defaultComp = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [competencia, setCompetencia] = useState(defaultComp);
  const [loading, setLoading] = useState(false);

  async function handleGerar() {
    if (!competencia) { toast.error("Informe a competência"); return; }
    setLoading(true);
    try {
      const r = await gerarCobrancas(competencia);
      const res = r as { geradas: number; ignoradas: number; erros: string[] };
      toast.success(`${res.geradas} cobranças geradas, ${res.ignoradas} ignoradas`);
      if (res.erros.length > 0) {
        toast(`⚠️ ${res.erros.length} erro(s) durante geração`);
      }
      onSuccess();
      onClose();
    } catch {
      toast.error("Erro ao gerar cobranças");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Gerar Cobranças</h2>
        <p className="text-sm text-gray-500 mb-5">
          Gera cobranças automáticas para todos os contratos ativos na competência selecionada.
        </p>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Competência (ano-mês)</label>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button
            onClick={() => void handleGerar()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Gerar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FranqueadosCobrancasPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagamentoModal, setPagamentoModal] = useState<FranqueadoCobranca | null>(null);
  const [gerarModal, setGerarModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["cobrancas", statusFilter, page],
    queryFn: () => listCobrancas({ status: statusFilter || undefined, page, pageSize: 20 }),
    staleTime: 30_000,
  });

  const cobrancas: FranqueadoCobranca[] = (data?.items ?? []) as FranqueadoCobranca[];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const filtered = search
    ? cobrancas.filter((c) =>
        (c.competencia ?? "").includes(search) ||
        (c.status ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : cobrancas;

  const kpiPendente = cobrancas.filter((c) => c.status === "PENDENTE").length;
  const kpiAtrasada = cobrancas.filter((c) => c.status === "ATRASADA").length;
  const kpiPaga = cobrancas.filter((c) => c.status === "PAGA").length;
  const valorTotal = cobrancas.reduce((s, c) => s + Number(c.valor_total), 0);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["cobrancas"] });
  }

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div
        className="min-h-screen"
        style={{ background: "linear-gradient(160deg, #f5f3ff 0%, #ede9fe 30%, #f3f4f6 100%)" }}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-[#1e1b4b] via-[#312e81] to-[#4c1d95] shadow-xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/admin/franqueados")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white rounded-lg text-sm transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <ReceiptText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Cobranças</h1>
                  <p className="text-violet-200 text-sm mt-0.5">Faturas mensais dos franqueados</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setGerarModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-sm font-medium transition-all"
                >
                  <Zap className="w-4 h-4" />
                  Gerar Cobranças
                </button>
                <button
                  onClick={() => void refetch()}
                  className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 rounded-lg text-sm transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total (página)", value: String(cobrancas.length), icon: ReceiptText, color: "violet" },
              { label: "Pendentes", value: String(kpiPendente), icon: Clock, color: "amber" },
              { label: "Atrasadas", value: String(kpiAtrasada), icon: AlertCircle, color: "red" },
              { label: "Pagas", value: String(kpiPaga), icon: CheckCircle2, color: "emerald" },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl border border-violet-100 shadow-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-violet-100 shadow-sm p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{fmtMoeda(valorTotal)}</p>
              <p className="text-xs text-gray-500">Valor total cobrado (página atual)</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl border border-violet-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-50">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                className="flex-1 text-sm outline-none bg-transparent"
                placeholder="Buscar por competência ou status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-16 text-center">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-400">Carregando cobranças...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <ReceiptText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Nenhuma cobrança encontrada</p>
                <button
                  onClick={() => setGerarModal(true)}
                  className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Gerar cobranças
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Competência</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Vencimento</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Valor</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Origem</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Pgto.</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((c) => {
                    const StatusIcon = STATUS_ICON[c.status ?? "PENDENTE"] ?? Clock;
                    return (
                      <tr key={c.id} className="hover:bg-violet-50/30 transition-colors">
                        <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                          {competenciaLabel(c.competencia)}
                          {c.carencia_aplicada && (
                            <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">carência</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {fmtData(c.data_vencimento)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                          {fmtMoeda(Number(c.valor_total))}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${c.origem === "AUTOMATICA" ? "bg-violet-50 text-violet-600 border-violet-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                            {c.origem === "AUTOMATICA" ? "Auto" : "Manual"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`flex items-center gap-1 w-fit text-[11px] font-medium px-2.5 py-1 rounded-full border ${STATUS_COLOR[c.status ?? "PENDENTE"] ?? ""}`}>
                            <StatusIcon className="w-3 h-3" />
                            {STATUS_LABEL[c.status ?? "PENDENTE"]}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-gray-500">
                          {fmtData(c.data_pagamento)}
                          {c.forma_pagamento && (
                            <span className="ml-1 text-xs text-gray-400">({c.forma_pagamento})</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setPagamentoModal(c)}
                            className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800 transition"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Registrar
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{total} cobranças no total</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg font-medium">
                  {page}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {pagamentoModal && (
        <PagamentoModal
          cobranca={pagamentoModal}
          onClose={() => setPagamentoModal(null)}
          onSuccess={invalidate}
        />
      )}
      {gerarModal && (
        <GerarModal
          onClose={() => setGerarModal(false)}
          onSuccess={invalidate}
        />
      )}
    </ProtectedRoute>
  );
}