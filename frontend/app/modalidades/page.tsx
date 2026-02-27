"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/auth/AuthContext";
import {
  listModalidades,
  listUnidadeModalidades,
  vincularModalidade,
  desvincularModalidade,
  createModalidade,
  listUnidades,
  getMyFranqueado,
  listAlunos,
  getModalidadeAlunos,
  matricularAlunoModalidade,
  cancelarAlunoModalidade,
  TIPOS_GRADUACAO,
  type CreateModalidadeData,
  type Modalidade,
  type UnidadeModalidade,
} from "@/lib/peopleApi";
import {
  GiHighKick,
  GiBoxingGlove,
  GiKimono,
  GiFist,
  GiMeditation,
  GiWeightLiftingUp,
  GiSoccerBall,
  GiBasketballBall,
  GiTennisBall,
  GiRunningShoe,
  GiSwimfins,
  GiAcrobatic,
  GiBlackBelt,
  GiMuscleUp,
} from "react-icons/gi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Users,
  Award,
  Dumbbell,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Search,
  X,
  Link2,
  Link2Off,
  Building2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
type UserPerfil = { nome?: string; perfil?: string } | string;
type AuthUser = { perfis?: UserPerfil[]; unidade_id?: string } | null;

function hasPerfil(user: AuthUser, p: string): boolean {
  if (!user?.perfis) return false;
  return user.perfis.some(
    (perfil: UserPerfil) =>
      (typeof perfil === "string" ? perfil : perfil?.nome || "")
        .toLowerCase() === p.toLowerCase()
  );
}

function podeGerenciar(user: AuthUser): boolean {
  return (
    hasPerfil(user, "master") ||
    hasPerfil(user, "franqueado") ||
    hasPerfil(user, "gerente_unidade") ||
    hasPerfil(user, "gerente")
  );
}

const COR_DEFAULT = "#1E3A8A";

function getEsporteIcon(nome?: string): React.ReactNode {
  const n = (nome ?? "").toLowerCase();
  if (n.includes("muay") || n.includes("kickbox") || n.includes("karate") || n.includes("taekwondo"))
    return <GiHighKick size={26} />;
  if (n.includes("box"))
    return <GiBoxingGlove size={26} />;
  if (n.includes("jiu") || n.includes("judo") || n.includes("bjj") || n.includes("jud"))
    return <GiKimono size={26} />;
  if (n.includes("mma") || n.includes("luta") || n.includes("wrestling") || n.includes("krav"))
    return <GiFist size={26} />;
  if (n.includes("yoga") || n.includes("pilates") || n.includes("medita"))
    return <GiMeditation size={26} />;
  if (n.includes("cross") || n.includes("funcional"))
    return <GiWeightLiftingUp size={26} />;
  if (n.includes("muscula") || n.includes("gym"))
    return <GiMuscleUp size={26} />;
  if (n.includes("futebol") || n.includes("soccer"))
    return <GiSoccerBall size={26} />;
  if (n.includes("basquet"))
    return <GiBasketballBall size={26} />;
  if (n.includes("tenis") || n.includes("tênis"))
    return <GiTennisBall size={26} />;
  if (n.includes("corrida") || n.includes("atletismo"))
    return <GiRunningShoe size={26} />;
  if (n.includes("nata") || n.includes("swim") || n.includes("aqua"))
    return <GiSwimfins size={26} />;
  if (n.includes("capoeira") || n.includes("kung"))
    return <GiAcrobatic size={26} />;
  return <GiBlackBelt size={26} />;
}

const MODALIDADES_PREDEFINIDAS = [
  "Muay Thai",
  "Boxe",
  "Jiu-Jitsu",
  "Judô",
  "Karatê",
  "Taekwondo",
  "Kickboxing",
  "MMA",
  "Luta Livre",
  "Wrestling",
  "Capoeira",
  "Kung Fu",
  "Krav Maga",
  "CrossFit",
  "Funcional",
  "Musculação",
  "Submission",
  "Defesa Pessoal",
] as const;

const FORM_VAZIO: Omit<CreateModalidadeData, "unidade_id"> = {
  nome: "",
  descricao: "",
  cor: COR_DEFAULT,
  icone: "",
  tipo_graduacao: "NENHUM",
};

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------
function ModalidadesPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  // unidade selecionada (pode vir via query param ?unidade_id=)
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>(
    searchParams.get("unidade_id") ?? ""
  );

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<Omit<CreateModalidadeData, "unidade_id">>(FORM_VAZIO);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [nomeOpcao, setNomeOpcao] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [vincularLoadingId, setVincularLoadingId] = useState<string | null>(null);
  const [desvincularLoadingId, setDesvincularLoadingId] = useState<string | null>(null);
  const [secaoCatalogo, setSecaoCatalogo] = useState(false);

  // modal associar alunos
  const [modalidadeAlunosModal, setModalidadeAlunosModal] = useState<Modalidade | null>(null);
  const [buscaAluno, setBuscaAluno] = useState("");

  // ---------------------------------------------------------------- unidades
  const isFranqueado = hasPerfil(user as AuthUser, "franqueado");

  const { data: franqueado } = useQuery({
    queryKey: ["franqueado-me", (user as any)?.id],
    queryFn: getMyFranqueado,
    enabled: isFranqueado && !!(user as any)?.id,
  });

  const { data: unidadesData } = useQuery({
    queryKey: ["unidades-franqueado-modal", franqueado?.id],
    queryFn: () => listUnidades({ pageSize: 100, franqueado_id: franqueado!.id }),
    enabled: isFranqueado && !!franqueado?.id,
  });

  const unidades: { id: string; nome: string }[] = useMemo(() => {
    const items: any[] = unidadesData?.items ?? [];
    return items.filter(
      (u: any, i: number, arr: any[]) =>
        u.id && arr.findIndex((x: any) => x.id === u.id) === i
    );
  }, [unidadesData]);

  // non-franqueado: use user's own unidade_id
  useEffect(() => {
    if (!isFranqueado && !unidadeSelecionada && (user as any)?.unidade_id) {
      setUnidadeSelecionada((user as any).unidade_id);
    }
  }, [isFranqueado, user, unidadeSelecionada]);

  // default: select first unit if franqueado and none selected
  useEffect(() => {
    if (isFranqueado && !unidadeSelecionada && unidades.length > 0) {
      setUnidadeSelecionada(unidades[0].id);
    }
  }, [isFranqueado, unidades, unidadeSelecionada]);

  // --------------------------------------------------------- catálogo global
  const { data: catalogoGlobal = [], isLoading: loadingCatalogo } = useQuery<Modalidade[]>({
    queryKey: ["modalidades-catalogo"],
    queryFn: () => listModalidades({}),
    staleTime: 5 * 60 * 1000,
  });

  // ------------------------------------------------ vínculos desta unidade
  const { data: vinculos = [], isLoading: loadingVinculos } = useQuery<UnidadeModalidade[]>({
    queryKey: ["unidade-modalidades", unidadeSelecionada],
    queryFn: () => listUnidadeModalidades({ unidade_id: unidadeSelecionada }),
    enabled: !!unidadeSelecionada,
    staleTime: 30 * 1000,
  });

  const linkedIds = useMemo(
    () => new Set(vinculos.filter((v) => v.ativa).map((v) => v.modalidade_id)),
    [vinculos]
  );

  // modalidades VINCULADAS à unidade (com dados completos do catálogo)
  const modalidadesUnidade: Modalidade[] = useMemo(
    () => catalogoGlobal.filter((m) => linkedIds.has(m.id)),
    [catalogoGlobal, linkedIds]
  );

  // catálogo disponível = ainda não vinculadas à unidade
  const catalogoDisponivel: Modalidade[] = useMemo(
    () => catalogoGlobal.filter((m) => !linkedIds.has(m.id) && m.ativo),
    [catalogoGlobal, linkedIds]
  );

  // filtro de busca aplicado à seção ativa
  const modalidadesFiltradas = useMemo(() => {
    const base = secaoCatalogo ? catalogoDisponivel : modalidadesUnidade;
    if (!busca.trim()) return base;
    const q = busca.toLowerCase();
    return base.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        (m.descricao ?? "").toLowerCase().includes(q)
    );
  }, [secaoCatalogo, catalogoDisponivel, modalidadesUnidade, busca]);

  const isLoading = loadingCatalogo || (!!unidadeSelecionada && loadingVinculos);

  // --------------------------------------------------------------- mutations
  const criarMutation = useMutation({
    mutationFn: async (data: Omit<CreateModalidadeData, "unidade_id">) => {
      const mod = await createModalidade(data);
      if (unidadeSelecionada) {
        await vincularModalidade(mod.id, unidadeSelecionada);
      }
      return mod;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modalidades-catalogo"] });
      qc.invalidateQueries({ queryKey: ["unidade-modalidades"] });
      qc.invalidateQueries({ queryKey: ["unidade-modalidades-franqueado"] });
      setModalAberto(false);
      setForm(FORM_VAZIO);
      setNomeOpcao("");
      toast.success("Modalidade criada e vinculada à unidade!");
    },
    onError: (error: Error) => toast.error(error?.message || "Erro ao criar modalidade"),
  });

  const vincularMutation = useMutation({
    mutationFn: (modalidade_id: string) =>
      vincularModalidade(modalidade_id, unidadeSelecionada),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unidade-modalidades"] });
      qc.invalidateQueries({ queryKey: ["unidade-modalidades-franqueado"] });
      setVincularLoadingId(null);
      toast.success("Modalidade adicionada à unidade!");
    },
    onError: (error: Error) => {
      setVincularLoadingId(null);
      toast.error(error?.message || "Erro ao vincular");
    },
  });

  const desvincularMutation = useMutation({
    mutationFn: (modalidade_id: string) =>
      desvincularModalidade(modalidade_id, unidadeSelecionada),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unidade-modalidades"] });
      qc.invalidateQueries({ queryKey: ["unidade-modalidades-franqueado"] });
      setDesvincularLoadingId(null);
      toast.success("Modalidade removida da unidade!");
    },
    onError: (error: Error) => {
      setDesvincularLoadingId(null);
      toast.error(error?.message || "Erro ao remover");
    },
  });

  // ------------------------------------------------------------------ alunos da modalidade
  const { data: alunosUnidadeData, isLoading: loadingAlunosUnidade } = useQuery({
    queryKey: ["alunos-unidade-modal", unidadeSelecionada],
    queryFn: () => listAlunos({ unidade_id: unidadeSelecionada, pageSize: 200 }),
    enabled: !!modalidadeAlunosModal && !!unidadeSelecionada,
  });

  const { data: alunosMatriculados = [], isLoading: loadingMatriculados, refetch: refetchMatriculados } = useQuery({
    queryKey: ["modalidade-alunos-lista", modalidadeAlunosModal?.id],
    queryFn: () => getModalidadeAlunos(modalidadeAlunosModal!.id),
    enabled: !!modalidadeAlunosModal?.id,
  });

  const matricularMutation = useMutation({
    mutationFn: ({ alunoId, modalidadeId }: { alunoId: string; modalidadeId: string }) =>
      matricularAlunoModalidade(alunoId, modalidadeId),
    onSuccess: () => {
      refetchMatriculados();
      toast.success("Aluno matriculado!");
    },
    onError: (error: Error) => toast.error(error?.message || "Erro ao matricular aluno"),
  });

  const cancelarMatriculaMutation = useMutation({
    mutationFn: ({ alunoId, modalidadeId }: { alunoId: string; modalidadeId: string }) =>
      cancelarAlunoModalidade(alunoId, modalidadeId),
    onSuccess: () => {
      refetchMatriculados();
      toast.success("Matrícula cancelada!");
    },
    onError: (error: Error) => toast.error(error?.message || "Erro ao cancelar matrícula"),
  });

  // ------------------------------------------------------------------- form
  function abrirModal() {
    setForm(FORM_VAZIO);
    setNomeOpcao("");
    setErroForm(null);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setErroForm(null);
  }

  function handleChange(campo: keyof typeof FORM_VAZIO, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (erroForm) setErroForm(null);
  }

  function handleNomeOpcao(val: string) {
    setNomeOpcao(val);
    if (val !== "outro") handleChange("nome", val);
    else handleChange("nome", "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroForm(null);
    if (!form.nome || form.nome.trim().length < 3) {
      setErroForm("Nome deve ter ao menos 3 caracteres");
      return;
    }
    if (form.cor && !/^#[0-9A-Fa-f]{6}$/.test(form.cor)) {
      setErroForm("Cor deve estar no formato hex (ex: #FF5733)");
      return;
    }
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao?.trim() || undefined,
      cor: form.cor || COR_DEFAULT,
      icone: form.icone?.trim() || undefined,
      tipo_graduacao: form.tipo_graduacao || "NENHUM",
    };
    criarMutation.mutate(payload);
  }

  const labelTipoGrad = (val: string | undefined) =>
    TIPOS_GRADUACAO.find((t) => t.value === (val ?? "NENHUM"))?.label ?? "Sem graduação";

  const unidadeNome =
    unidades.find((u) => u.id === unidadeSelecionada)?.nome ?? "Unidade";

  // ------------------------------------------------------------------ render
  return (
    <ProtectedRoute
      requiredPerfis={["master", "franqueado", "gerente_unidade", "gerente"]}
    >
      <div className="min-h-screen" style={{ background: "linear-gradient(160deg, #e2e6f3 0%, #eaecf8 40%, #e6e9f5 100%)" }}>

        {/* Hero Header */}
        <div className="bg-linear-to-r from-[#0f172a] via-[#1e3a8a] to-[#312e81] shadow-xl">
          <div className="max-w-7xl mx-auto px-6 py-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/dashboard")}
                  className="text-white/70 hover:text-white hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 h-auto text-sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Voltar
                </Button>
                <div className="w-px h-8 bg-white/20" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shrink-0">
                    <Dumbbell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
                      Modalidades
                    </h1>
                    <p className="text-blue-200/70 text-xs mt-0.5">
                      Gerencie as modalidades esportivas das unidades
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6">

          {/* Seletor de unidade (franqueado com múltiplas unidades) */}
          {isFranqueado && unidades.length > 1 && (
            <div className="mb-6 flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-white/60 rounded-2xl shadow-sm px-4 py-3">
              <Building2 className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-xs font-black text-slate-600 uppercase tracking-widest shrink-0">Unidade</span>
              <div className="flex flex-wrap gap-2">
                {unidades.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUnidadeSelecionada(u.id);
                      setBusca("");
                      setSecaoCatalogo(false);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      unidadeSelecionada === u.id
                        ? "bg-slate-800 text-white shadow-md shadow-slate-800/25"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {u.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aviso: nenhuma unidade */}
          {isFranqueado && unidades.length === 0 && !loadingCatalogo && (
            <div className="text-center py-20 text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma unidade encontrada</p>
              <p className="text-sm mt-1">Cadastre uma unidade primeiro.</p>
            </div>
          )}

          {!!unidadeSelecionada && (
            <>
              {/* Abas */}
              <div className="flex gap-1 border-b border-white/60 mb-6">
                <button
                  onClick={() => { setSecaoCatalogo(false); setBusca(""); }}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    !secaoCatalogo
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Link2 className="h-4 w-4" />
                    {unidadeNome}
                    <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                      !secaoCatalogo ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {modalidadesUnidade.length}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => { setSecaoCatalogo(true); setBusca(""); }}
                  className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    secaoCatalogo
                      ? "border-blue-600 text-blue-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4" />
                    Catálogo global
                    <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                      secaoCatalogo ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {catalogoDisponivel.length} disponíveis
                    </span>
                  </span>
                </button>
              </div>

              {/* Busca */}
              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={secaoCatalogo ? "Buscar no catálogo..." : "Buscar modalidade..."}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-sm border border-white/60 rounded-xl bg-white/70 backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {busca && (
                  <button
                    onClick={() => setBusca("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Lista */}
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : modalidadesFiltradas.length === 0 ? (
                <div className="bg-white/70 rounded-2xl shadow-sm border border-white/80 p-12 text-center">
                  <div className="w-16 h-16 rounded-3xl bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Dumbbell className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-700 mb-1">
                    {secaoCatalogo
                      ? catalogoDisponivel.length === 0
                        ? "Todas as modalidades já estão vinculadas!"
                        : "Nenhuma modalidade encontrada"
                      : modalidadesUnidade.length === 0
                        ? "Nenhuma modalidade vinculada ainda"
                        : "Nenhuma modalidade encontrada"}
                  </h3>
                  {!secaoCatalogo && modalidadesUnidade.length === 0 && (
                    <>
                      <p className="text-slate-400 text-sm mt-1 mb-5 max-w-xs mx-auto">
                        Use a aba <strong>Catálogo global</strong> para adicionar modalidades.
                      </p>
                      <Button
                        onClick={() => setSecaoCatalogo(true)}
                        className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 border-0 rounded-xl px-5"
                      >
                        <Dumbbell className="h-4 w-4 mr-2" />
                        Ver Catálogo
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {modalidadesFiltradas.map((m) => (
                    <ModalidadeCard
                      key={m.id}
                      modalidade={m}
                      labelTipoGrad={labelTipoGrad}
                      isVinculada={!secaoCatalogo}
                      podeGerenciar={podeGerenciar(user as AuthUser)}
                      vincularLoading={vincularLoadingId === m.id}
                      desvincularLoading={desvincularLoadingId === m.id}
                      onVincular={() => {
                        setVincularLoadingId(m.id);
                        vincularMutation.mutate(m.id);
                      }}
                      onDesvincular={() => {
                        setDesvincularLoadingId(m.id);
                        desvincularMutation.mutate(m.id);
                      }}
                      onAlunosClick={() => {
                        setBuscaAluno("");
                        setModalidadeAlunosModal(m);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal criar modalidade */}
      <Dialog open={modalAberto} onOpenChange={fecharModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-purple-600" />
              Nova Modalidade
            </DialogTitle>
          </DialogHeader>

          {unidadeSelecionada && (
            <div className="flex items-center gap-2 text-sm bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 text-purple-700">
              <Link2 className="h-4 w-4 shrink-0" />
              Será vinculada automaticamente a <strong>{unidadeNome}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="nome_opcao">
                Modalidade <span className="text-red-500">*</span>
              </Label>
              <Select value={nomeOpcao} onValueChange={handleNomeOpcao}>
                <SelectTrigger id="nome_opcao" className="bg-white">
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES_PREDEFINIDAS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                  <SelectItem value="outro">Outro (personalizado)</SelectItem>
                </SelectContent>
              </Select>
              {nomeOpcao === "outro" && (
                <Input
                  placeholder="Digite o nome da modalidade"
                  value={form.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  maxLength={100}
                  autoFocus
                  className="mt-2"
                />
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <textarea
                id="descricao"
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Descreva brevemente a modalidade (opcional)"
                value={form.descricao}
                onChange={(e) => handleChange("descricao", e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            {/* Cor */}
            <div className="space-y-1.5">
              <Label>Cor de identificação</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.cor || COR_DEFAULT}
                  onChange={(e) => handleChange("cor", e.target.value)}
                  className="w-10 h-9 rounded border border-input cursor-pointer p-0.5"
                />
                <Input
                  placeholder="#1E3A8A"
                  value={form.cor}
                  onChange={(e) => handleChange("cor", e.target.value)}
                  maxLength={7}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Tipo graduação */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo_graduacao">Tipo de graduação</Label>
              <Select
                value={form.tipo_graduacao || "NENHUM"}
                onValueChange={(v) => handleChange("tipo_graduacao", v)}
              >
                <SelectTrigger id="tipo_graduacao" className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_GRADUACAO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {erroForm && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erroForm}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={fecharModal}
                disabled={criarMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit"
                disabled={criarMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white">
                {criarMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Criar e Vincular</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal associar alunos à modalidade */}
      {modalidadeAlunosModal && (
        <AlunosMatriculaModal
          modalidade={modalidadeAlunosModal}
          alunosUnidade={Array.from(
            new Map(
              (alunosUnidadeData?.items ?? []).map((a) => [
                String(a.id),
                {
                  id: String(a.id),
                  nome: ((a.nome_completo || a.nome || "").trim() || a.email || "Sem nome"),
                  email: a.email ?? "",
                },
              ])
            ).values()
          )}
          alunosMatriculados={alunosMatriculados as { aluno_id: string; nome: string }[]}
          loading={loadingAlunosUnidade || loadingMatriculados}
          busca={buscaAluno}
          onBuscaChange={setBuscaAluno}
          onMatricular={(alunoId) =>
            matricularMutation.mutate({ alunoId, modalidadeId: modalidadeAlunosModal.id })
          }
          onCancelar={(alunoId) =>
            cancelarMatriculaMutation.mutate({ alunoId, modalidadeId: modalidadeAlunosModal.id })
          }
          pendingIds={[
            ...(matricularMutation.isPending ? [(matricularMutation.variables as unknown as { alunoId: string })?.alunoId] : []),
            ...(cancelarMatriculaMutation.isPending ? [(cancelarMatriculaMutation.variables as unknown as { alunoId: string })?.alunoId] : []),
          ].filter(Boolean)}
          onClose={() => setModalidadeAlunosModal(null)}
        />
      )}
    </ProtectedRoute>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
function ModalidadeCard({
  modalidade,
  labelTipoGrad,
  isVinculada,
  podeGerenciar,
  vincularLoading,
  desvincularLoading,
  onVincular,
  onDesvincular,
  onAlunosClick,
}: {
  modalidade: Modalidade;
  labelTipoGrad: (val: string) => string;
  isVinculada: boolean;
  podeGerenciar: boolean;
  vincularLoading: boolean;
  desvincularLoading: boolean;
  onVincular: () => void;
  onDesvincular: () => void;
  onAlunosClick: () => void;
}) {
  const cor = modalidade.cor ?? "#1E3A8A";
  return (
    <div
      className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/80 flex flex-col ${
        modalidade.ativo ? "opacity-100" : "opacity-55"
      }`}
    >
      {/* Colored top strip */}
      <div className="h-1.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${cor}, ${cor}88)` }} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header: icon + name + badge */}
        <div className="flex items-start gap-3">
          {/* Sport icon badge */}
          <div
            className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
            style={{
              background: `linear-gradient(135deg, ${cor}dd, ${cor}88)`,
              boxShadow: `0 4px 14px ${cor}45`,
            }}
          >
            <span className="flex items-center justify-center text-white">
              {getEsporteIcon(modalidade.nome)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-slate-900 leading-tight text-base truncate">{modalidade.nome}</h3>
              <Badge
                className={`shrink-0 text-[10px] px-1.5 py-0.5 ${
                  modalidade.ativo
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {modalidade.ativo ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            {modalidade.descricao && (
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{modalidade.descricao}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" style={{ color: cor }} />
            <span className="font-semibold text-slate-700">{modalidade.totalAlunos ?? 0}</span> aluno(s)
          </span>
          <span className="w-px h-3 bg-slate-200" />
          <span className="flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-amber-400" />
            {labelTipoGrad(modalidade.tipo_graduacao ?? "NENHUM")}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-auto">
          {/* Catálogo → Vincular */}
          {!isVinculada && (
            <Button
              size="sm"
              onClick={onVincular}
              disabled={vincularLoading}
              className="w-full rounded-xl text-xs h-9 font-semibold"
              style={{ background: `linear-gradient(135deg, ${cor}ee, ${cor}aa)`, color: "white", border: "none" }}
            >
              {vincularLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <><Link2 className="h-3.5 w-3.5 mr-1.5" />Adicionar à unidade</>
              )}
            </Button>
          )}

          {/* Vinculada → Gerenciar Alunos */}
          {isVinculada && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAlunosClick}
              className="w-full rounded-xl text-xs h-9 font-semibold border-2"
              style={{ borderColor: cor, color: cor }}
            >
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Gerenciar Alunos
            </Button>
          )}

          {/* Vinculada → Remover */}
          {isVinculada && podeGerenciar && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDesvincular}
              disabled={desvincularLoading}
              className="w-full rounded-xl text-xs h-8 font-medium text-red-500 border-red-200 hover:bg-red-50"
            >
              {desvincularLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <><Link2Off className="h-3.5 w-3.5 mr-1" />Remover da unidade</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm
// ---------------------------------------------------------------------------
export default function ModalidadesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    }>
      <ModalidadesPageContent />
    </Suspense>
  );
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AlunosMatriculaModal({
  modalidade,
  alunosUnidade,
  alunosMatriculados,
  loading,
  busca,
  onBuscaChange,
  onMatricular,
  onCancelar,
  pendingIds,
  onClose,
}: {
  modalidade: Modalidade;
  alunosUnidade: { id: string; nome: string; email: string }[];
  alunosMatriculados: { aluno_id: string; nome: string }[];
  loading: boolean;
  busca: string;
  onBuscaChange: (v: string) => void;
  onMatricular: (alunoId: string) => void;
  onCancelar: (alunoId: string) => void;
  pendingIds: string[];
  onClose: () => void;
}) {
  const matriculadosSet = useMemo(
    () => new Set(alunosMatriculados.map((a) => a.aluno_id)),
    [alunosMatriculados]
  );

  const alunosFiltrados = useMemo(() => {
    let list = alunosUnidade;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(
        (a) => a.nome.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
      );
    }
    // matriculados first, then alphabetical
    return [...list].sort((a, b) => {
      const aM = matriculadosSet.has(a.id);
      const bM = matriculadosSet.has(b.id);
      if (aM && !bM) return -1;
      if (!aM && bM) return 1;
      return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
    });
  }, [alunosUnidade, busca, matriculadosSet]);

  const totalMatriculados = alunosUnidade.filter((a) => matriculadosSet.has(a.id)).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Alunos em{" "}
            <span
              className="inline-block px-2 py-0.5 rounded text-white text-sm"
              style={{ background: modalidade.cor ?? "#1E3A8A" }}
            >
              {modalidade.nome}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between -mt-2">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{totalMatriculados}</span> de{" "}
            <span className="font-semibold text-gray-700">{alunosUnidade.length}</span> aluno(s) matriculado(s).
          </p>
          {busca && (
            <p className="text-xs text-gray-400">
              {alunosFiltrados.length} resultado(s)
            </p>
          )}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar aluno por nome ou email..."
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border border-input rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {busca && (
            <button
              onClick={() => onBuscaChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto min-h-0 rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Users className="h-10 w-10 mb-2 opacity-40" />
              <p className="text-sm">
                {alunosUnidade.length === 0
                  ? "Nenhum aluno cadastrado nesta unidade."
                  : "Nenhum aluno encontrado."}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {alunosFiltrados.map((aluno) => {
                const isMatriculado = matriculadosSet.has(aluno.id);
                const isPending = pendingIds.includes(aluno.id);
                return (
                  <li
                    key={aluno.id}
                    className={`flex items-center justify-between px-4 py-2.5 transition-colors ${
                      isMatriculado ? "bg-blue-50/60" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mr-3"
                      style={{
                        background: isMatriculado
                          ? (modalidade.cor ?? "#1E3A8A")
                          : "#94a3b8",
                      }}
                    >
                      {getInitials(aluno.nome)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {aluno.nome || aluno.email}
                        </p>
                        {isMatriculado && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white shrink-0"
                            style={{ background: modalidade.cor ?? "#1E3A8A" }}
                          >
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{aluno.email}</p>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        isMatriculado ? onCancelar(aluno.id) : onMatricular(aluno.id)
                      }
                      className={`ml-2 shrink-0 text-xs h-8 px-3 rounded-full border ${
                        isMatriculado
                          ? "border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                          : "border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      }`}
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isMatriculado ? (
                        <><UserMinus className="h-3.5 w-3.5 mr-1" />Remover</>
                      ) : (
                        <><UserPlus className="h-3.5 w-3.5 mr-1" />Matricular</>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}