"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  aulaExperimentalApi,
  conviteApi,
  AgendamentoAulaExperimental,
  ConviteCadastro,
} from "@/lib/conviteApi";
import { listUnidadeModalidades, UnidadeModalidade } from "@/lib/peopleApi";
import { useFiltroUnidade } from "@/hooks/useFiltroUnidade";
import { toast } from "react-hot-toast";
import ConviteModal from "@/components/convites/ConviteModal";
import {
  Calendar,
  Settings,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Users,
  CalendarCheck,
  Plus,
  Mail,
  Dumbbell,
} from "lucide-react";
import {
  GiHighKick,
  GiBoxingGlove,
  GiKimono,
  GiFist,
  GiMeditation,
  GiWeightLiftingUp,
  GiMuscleUp,
} from "react-icons/gi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type TabType = "agendamentos" | "convites";
type StatusFiltro = "TODOS" | "PENDENTE" | "CONFIRMADO" | "CANCELADO" | "REALIZADO";

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMADO: "bg-blue-100 text-blue-800 border-blue-200",
  CANCELADO: "bg-gray-100 text-gray-800 border-gray-200",
  REALIZADO: "bg-green-100 text-green-800 border-green-200",
};

function formatarDataBR(iso: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function getEsporteIcon(nome?: string): React.ReactNode {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("muay") || n.includes("kickbox") || n.includes("karate") || n.includes("taekwondo"))
    return <GiHighKick size={13} />;
  if (n.includes("box"))
    return <GiBoxingGlove size={13} />;
  if (n.includes("jiu") || n.includes("judo") || n.includes("bjj"))
    return <GiKimono size={13} />;
  if (n.includes("mma") || n.includes("luta") || n.includes("wrestling") || n.includes("krav"))
    return <GiFist size={13} />;
  if (n.includes("yoga") || n.includes("pilates") || n.includes("medita"))
    return <GiMeditation size={13} />;
  if (n.includes("cross") || n.includes("funcional"))
    return <GiWeightLiftingUp size={13} />;
  if (n.includes("muscula") || n.includes("gym"))
    return <GiMuscleUp size={13} />;
  return <Dumbbell size={13} />;
}

export default function ConvitesPage() {
  const [tab, setTab] = useState<TabType>("agendamentos");
  const [conviteModalOpen, setConviteModalOpen] = useState(false);
  const {
    isFranqueado,
    unidades,
    unidadeSelecionada,
    unidadeIdAtual: unidadeId,
    setUnidadeSelecionada,
  } = useFiltroUnidade();

  // — Modalidades da unidade —
  const [modalidades, setModalidades] = useState<UnidadeModalidade[]>([]);
  const [modalidadeFiltroId, setModalidadeFiltroId] = useState("");

  useEffect(() => {
    if (unidadeId) {
      listUnidadeModalidades({ unidade_id: unidadeId })
        .then((data) => setModalidades(data.filter((m) => m.ativa)))
        .catch(() => setModalidades([]));
    } else {
      setModalidades([]);
    }
    setModalidadeFiltroId("");
  }, [unidadeId]);

  // — Agendamentos —
  const [agendamentos, setAgendamentos] = useState<AgendamentoAulaExperimental[]>([]);
  const [loadingAgs, setLoadingAgs] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("TODOS");
  const [busca, setBusca] = useState("");

  // — Config —
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [cfgModalidadeId, setCfgModalidadeId] = useState("");
  const [cfgAtivo, setCfgAtivo] = useState(true);
  const [cfgMaxAulas, setCfgMaxAulas] = useState(1);
  const [cfgDuracao, setCfgDuracao] = useState(60);
  const [savingConfig, setSavingConfig] = useState(false);

  // — Status update —
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    id: string;
    nome: string;
  }>({ open: false, id: "", nome: "" });
  const [novoStatus, setNovoStatus] = useState("CONFIRMADO");
  const [obsStatus, setObsStatus] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // — Delete —
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    id: string;
    nome: string;
  }>({ open: false, id: "", nome: "" });
  const [deleting, setDeleting] = useState(false);

  // — Convites —
  const [convites, setConvites] = useState<ConviteCadastro[]>([]);
  const [loadingConvites, setLoadingConvites] = useState(false);

  // Load agendamentos
  const carregarAgendamentos = useCallback(async () => {
    setLoadingAgs(true);
    try {
      const data = await aulaExperimentalApi.listar(
        unidadeId || undefined,
        modalidadeFiltroId || undefined,
      );
      setAgendamentos(data);
    } catch {
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoadingAgs(false);
    }
  }, [unidadeId, modalidadeFiltroId]);

  // Load convites
  const carregarConvites = useCallback(async () => {
    setLoadingConvites(true);
    try {
      const data = await conviteApi.listarConvites(unidadeId || undefined);
      setConvites(data);
    } catch {
      toast.error("Erro ao carregar convites");
    } finally {
      setLoadingConvites(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    if (tab === "agendamentos") carregarAgendamentos();
    if (tab === "convites") carregarConvites();
  }, [tab, unidadeId, carregarAgendamentos, carregarConvites]);

  // Abrir config
  const abrirConfig = () => {
    if (!unidadeId) {
      toast.error("Selecione uma unidade");
      return;
    }
    setCfgModalidadeId("");
    setCfgAtivo(true);
    setCfgMaxAulas(1);
    setCfgDuracao(60);
    setConfigDialogOpen(true);
  };

  // Quando modalidade selecionada no dialog, carregar config dela
  useEffect(() => {
    if (configDialogOpen && unidadeId && cfgModalidadeId) {
      aulaExperimentalApi
        .getConfig(unidadeId, cfgModalidadeId)
        .then((cfg) => {
          setCfgAtivo(cfg.ativo);
          setCfgMaxAulas(cfg.max_aulas);
          setCfgDuracao(cfg.duracao_minutos);
        })
        .catch(() => {
          setCfgAtivo(true);
          setCfgMaxAulas(1);
          setCfgDuracao(60);
        });
    }
  }, [configDialogOpen, unidadeId, cfgModalidadeId]);

  const salvarConfig = async () => {
    if (!unidadeId || !cfgModalidadeId) {
      toast.error("Selecione uma modalidade");
      return;
    }
    setSavingConfig(true);
    try {
      await aulaExperimentalApi.upsertConfig(unidadeId, cfgModalidadeId, {
        ativo: cfgAtivo,
        max_aulas: cfgMaxAulas,
        duracao_minutos: cfgDuracao,
      });
      toast.success("Configuração salva!");
      setConfigDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar configuração");
    } finally {
      setSavingConfig(false);
    }
  };

  // Mudar status
  const abrirStatusDialog = (ag: AgendamentoAulaExperimental) => {
    setNovoStatus(ag.status === "PENDENTE" ? "CONFIRMADO" : "REALIZADO");
    setObsStatus("");
    setStatusDialog({ open: true, id: ag.id, nome: ag.nome });
  };

  const confirmarStatus = async () => {
    setSavingStatus(true);
    try {
      await aulaExperimentalApi.atualizarStatus(
        statusDialog.id,
        novoStatus,
        obsStatus || undefined
      );
      toast.success("Status atualizado!");
      setStatusDialog({ open: false, id: "", nome: "" });
      carregarAgendamentos();
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setSavingStatus(false);
    }
  };

  // Deletar
  const confirmarDelete = async () => {
    setDeleting(true);
    try {
      await aulaExperimentalApi.remover(deleteDialog.id);
      toast.success("Agendamento removido");
      setDeleteDialog({ open: false, id: "", nome: "" });
      carregarAgendamentos();
    } catch {
      toast.error("Erro ao remover agendamento");
    } finally {
      setDeleting(false);
    }
  };

  // Filtros locais
  const agsFiltradas = agendamentos.filter((ag) => {
    const matchStatus = statusFiltro === "TODOS" || ag.status === statusFiltro;
    const matchBusca =
      !busca ||
      ag.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (ag.email || "").toLowerCase().includes(busca.toLowerCase()) ||
      (ag.telefone || "").includes(busca) ||
      (ag.cpf || "").includes(busca);
    return matchStatus && matchBusca;
  });

  // Nome da modalidade por id
  const nomeModalidade = (id: string) => {
    const m = modalidades.find((m) => m.modalidade_id === id);
    return m?.modalidade?.nome ?? id.slice(0, 8) + "...";
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #e2e6f3 0%, #eaecf8 40%, #e6e9f5 100%)" }}>
      {/* Hero Header */}
      <div className="bg-linear-to-r from-[#0f172a] via-[#1e3a8a] to-[#312e81] shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-7">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
                  Convites & Aulas Experimentais
                </h1>
                <p className="text-blue-200/70 text-xs mt-0.5">
                  Gerencie convites enviados e agendamentos de aulas experimentais
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isFranqueado && unidades.length > 0 && (
                <select
                  value={unidadeSelecionada}
                  onChange={(e) => setUnidadeSelecionada(e.target.value)}
                  className="border border-white/20 bg-white/10 text-white rounded-lg px-3 py-2 text-sm backdrop-blur-sm"
                >
                  <option value="todas" className="text-gray-900 bg-white">Todas as unidades</option>
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id} className="text-gray-900 bg-white">{u.nome}</option>
                  ))}
                </select>
              )}
              <button
                onClick={abrirConfig}
                className="flex items-center gap-1.5 px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 backdrop-blur-sm transition-colors"
                title="Configurar aula experimental da unidade"
              >
                <Settings size={15} />
                Configurar
              </button>
              <button
                onClick={tab === "agendamentos" ? carregarAgendamentos : carregarConvites}
                className="flex items-center gap-1.5 px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 backdrop-blur-sm transition-colors"
              >
                <RefreshCw size={15} />
                Atualizar
              </button>
              <button
                onClick={() => setConviteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-400 shadow-lg shadow-blue-900/40 transition-colors"
              >
                <Plus size={15} />
                Novo Convite
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
      {/* Tabs */}
      <div className="border-b border-slate-200/80 flex gap-0">
        <button
          onClick={() => setTab("agendamentos")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "agendamentos"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <CalendarCheck size={15} />
          Agendamentos
          {agendamentos.length > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-700 text-xs rounded-full px-1.5 py-0.5">
              {agendamentos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("convites")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "convites"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users size={15} />
          Convites
          {convites.length > 0 && (
            <span className="ml-1 bg-gray-100 text-gray-700 text-xs rounded-full px-1.5 py-0.5">
              {convites.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── ABA AGENDAMENTOS ─── */}
      {tab === "agendamentos" && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl shadow-sm px-4 py-3 flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail, CPF..."
                className="pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm w-60 bg-white/80 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            {modalidades.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setModalidadeFiltroId("")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    modalidadeFiltroId === ""
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <Dumbbell size={11} />
                  Todas
                </button>
                {modalidades.map((m) => (
                  <button
                    key={m.modalidade_id}
                    onClick={() => setModalidadeFiltroId(m.modalidade_id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      modalidadeFiltroId === m.modalidade_id
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"
                    }`}
                  >
                    {getEsporteIcon(m.modalidade?.nome)}
                    {m.modalidade?.nome ?? m.modalidade_id}
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {(["TODOS", "PENDENTE", "CONFIRMADO", "CANCELADO", "REALIZADO"] as StatusFiltro[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFiltro(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      statusFiltro === s
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {s === "TODOS" ? "Todos" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Tabela */}
          {loadingAgs ? (
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl shadow-sm flex items-center justify-center py-16 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Carregando...
            </div>
          ) : agsFiltradas.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Calendar size={28} className="text-blue-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">Nenhum agendamento encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar os filtros</p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm border border-white/90 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Modalidade</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Contato</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Data/Horário</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Obs.</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agsFiltradas.map((ag) => (
                    <tr key={ag.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{ag.nome}</div>
                        {ag.cpf && <div className="text-xs text-gray-500">{ag.cpf}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-full font-medium">
                          {getEsporteIcon(nomeModalidade(ag.modalidade_id))}
                          {nomeModalidade(ag.modalidade_id)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ag.email && <div>{ag.email}</div>}
                        {ag.telefone && (
                          <div className="text-xs text-gray-500">{ag.telefone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{formatarDataBR(ag.data_aula)}</div>
                        <div className="text-xs text-gray-500">{ag.horario}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                            STATUS_COLORS[ag.status] || ""
                          }`}
                        >
                          {ag.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-40">
                        <span className="text-xs text-gray-500 line-clamp-2">
                          {ag.observacoes || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-center">
                          {ag.status !== "CANCELADO" && ag.status !== "REALIZADO" && (
                            <button
                              onClick={() => abrirStatusDialog(ag)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                              title="Atualizar status"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {ag.status === "PENDENTE" && (
                            <button
                              onClick={() =>
                                aulaExperimentalApi
                                  .atualizarStatus(ag.id, "CANCELADO")
                                  .then(() => {
                                    toast.success("Cancelado");
                                    carregarAgendamentos();
                                  })
                                  .catch(() => toast.error("Erro ao cancelar"))
                              }
                              className="p-1.5 rounded hover:bg-red-50 text-red-500"
                              title="Cancelar"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setDeleteDialog({ open: true, id: ag.id, nome: ag.nome })
                            }
                            className="p-1.5 rounded hover:bg-red-50 text-red-500"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── ABA CONVITES ─── */}
      {tab === "convites" && (
        <div className="space-y-4">
          {loadingConvites ? (
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl shadow-sm flex items-center justify-center py-16 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Carregando...
            </div>
          ) : convites.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-sm border border-white/80 rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                <Users size={28} className="text-indigo-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">Nenhum convite encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Envie o primeiro convite clicando em Novo Convite</p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm border border-white/90 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Contato</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Criado em</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Expiração</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {convites.map((c) => (
                    <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {c.nome_pre_cadastro || "—"}
                        </div>
                        {c.cpf && <div className="text-xs text-gray-500">{c.cpf}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {c.email && <div>{c.email}</div>}
                        {c.telefone && (
                          <div className="text-xs text-gray-500">{c.telefone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                          {c.tipo_cadastro}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {c.usado ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            <CheckCircle size={11} />
                            Usado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                            <Clock size={11} />
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(c.criado_em).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(c.data_expiracao).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Dialog: Atualizar Status ─── */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(o) => !o && setStatusDialog({ open: false, id: "", nome: "" })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Atualizar Status</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Agendamento de <strong>{statusDialog.nome}</strong>
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Novo status</label>
              <select
                value={novoStatus}
                onChange={(e) => setNovoStatus(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="CONFIRMADO">Confirmado</option>
                <option value="REALIZADO">Realizado</option>
                <option value="CANCELADO">Cancelado</option>
                <option value="PENDENTE">Pendente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Observações (opcional)
              </label>
              <textarea
                value={obsStatus}
                onChange={(e) => setObsStatus(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setStatusDialog({ open: false, id: "", nome: "" })}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarStatus}
              disabled={savingStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {savingStatus ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Confirmar Delete ─── */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(o) => !o && setDeleteDialog({ open: false, id: "", nome: "" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá remover permanentemente o agendamento de{" "}
              <strong>{deleteDialog.nome}</strong>. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar Aula Experimental</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Modalidade</label>
              {modalidades.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma modalidade ativa nesta unidade.</p>
              ) : (
                <select
                  value={cfgModalidadeId}
                  onChange={(e) => setCfgModalidadeId(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                >
                  <option value="">Selecione a modalidade</option>
                  {modalidades.map((m) => (
                    <option key={m.modalidade_id} value={m.modalidade_id}>
                      {m.modalidade?.nome ?? m.modalidade_id}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Habilitar aula experimental</label>
              <button
                type="button"
                disabled={!cfgModalidadeId}
                onClick={() => setCfgAtivo(!cfgAtivo)}
                className={`relative w-10 h-6 rounded-full transition-colors ${cfgAtivo && cfgModalidadeId ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${cfgAtivo && cfgModalidadeId ? "translate-x-5" : "translate-x-1"}`}
                />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Máx. de aulas experimentais por aluno
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={cfgMaxAulas}
                onChange={(e) => setCfgMaxAulas(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm"
                disabled={!cfgModalidadeId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Duração (minutos)
              </label>
              <input
                type="number"
                min={15}
                step={5}
                value={cfgDuracao}
                onChange={(e) => setCfgDuracao(Number(e.target.value))}
                className="w-full border rounded px-3 py-2 text-sm"
                disabled={!cfgModalidadeId}
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setConfigDialogOpen(false)}
              className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={salvarConfig}
              disabled={savingConfig || !cfgModalidadeId}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {savingConfig ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConviteModal
        isOpen={conviteModalOpen}
        onClose={() => setConviteModalOpen(false)}
        unidadeId={unidadeId || undefined}
        unidades={unidades}
      />
      </div>
    </div>
  );
}
