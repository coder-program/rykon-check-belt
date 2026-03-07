"use client";

import { useState, useEffect, useCallback } from "react";
import {
  aulaExperimentalApi,
  conviteApi,
  AgendamentoAulaExperimental,
  ConviteCadastro,
} from "@/lib/conviteApi";
import { listUnidadeModalidades, UnidadeModalidade } from "@/lib/peopleApi";
import { useFiltroUnidade } from "@/hooks/useFiltroUnidade";
import { toast } from "react-hot-toast";
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
} from "lucide-react";
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

export default function ConvitesPage() {
  const [tab, setTab] = useState<TabType>("agendamentos");
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Convites & Aulas Experimentais</h1>
          <p className="text-gray-500 text-sm">
            Gerencie convites enviados e agendamentos de aulas experimentais
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isFranqueado && unidades.length > 0 && (
            <select
              value={unidadeSelecionada}
              onChange={(e) => setUnidadeSelecionada(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="todas">Todas as unidades</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          )}
          <button
            onClick={abrirConfig}
            className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
            title="Configurar aula experimental da unidade"
          >
            <Settings size={15} />
            Configurar
          </button>
          <button
            onClick={tab === "agendamentos" ? carregarAgendamentos : carregarConvites}
            className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            <RefreshCw size={15} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-0">
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
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, e-mail, CPF..."
                className="pl-8 pr-3 py-2 border rounded-lg text-sm w-64"
              />
            </div>
            {modalidades.length > 0 && (
              <select
                value={modalidadeFiltroId}
                onChange={(e) => setModalidadeFiltroId(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todas modalidades</option>
                {modalidades.map((m) => (
                  <option key={m.modalidade_id} value={m.modalidade_id}>
                    {m.modalidade?.nome ?? m.modalidade_id}
                  </option>
                ))}
              </select>
            )}
            {(["TODOS", "PENDENTE", "CONFIRMADO", "CANCELADO", "REALIZADO"] as StatusFiltro[]).map(
              (s) => (
                <button
                  key={s}
                  onClick={() => setStatusFiltro(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    statusFiltro === s
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s === "TODOS" ? "Todos" : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              )
            )}
          </div>

          {/* Tabela */}
          {loadingAgs ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Carregando...
            </div>
          ) : agsFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Calendar size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Modalidade</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contato</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Data/Horário</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Obs.</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {agsFiltradas.map((ag) => (
                    <tr key={ag.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{ag.nome}</div>
                        {ag.cpf && <div className="text-xs text-gray-500">{ag.cpf}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
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
            <div className="flex items-center justify-center py-16 text-gray-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Carregando...
            </div>
          ) : convites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={40} className="mb-3 opacity-40" />
              <p className="text-sm">Nenhum convite encontrado</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Nome</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contato</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Criado em</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Expiração</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {convites.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
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
    </div>
  );
}
