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
  updateModalidade,
  ativarModalidade,
  desativarModalidade,
  deleteModalidade,
  listUnidades,
  getMyFranqueado,
  TIPOS_GRADUACAO,
  type CreateModalidadeData,
  type Modalidade,
  type UnidadeModalidade,
} from "@/lib/peopleApi";
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
  Pencil,
  Trash2,
  PowerOff,
  Power,
  Search,
  AlertTriangle,
  X,
  Link2,
  Link2Off,
  Building2,
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

function podeDeletar(user: AuthUser): boolean {
  return hasPerfil(user, "master") || hasPerfil(user, "franqueado");
}

const COR_DEFAULT = "#1E3A8A";

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
  const [modalidadeEditando, setModalidadeEditando] = useState<Modalidade | null>(null);
  const [modalidadeDeletando, setModalidadeDeletando] = useState<Modalidade | null>(null);
  const [form, setForm] = useState<Omit<CreateModalidadeData, "unidade_id">>(FORM_VAZIO);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [nomeOpcao, setNomeOpcao] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [vincularLoadingId, setVincularLoadingId] = useState<string | null>(null);
  const [desvincularLoadingId, setDesvincularLoadingId] = useState<string | null>(null);
  const [secaoCatalogo, setSecaoCatalogo] = useState(false);

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

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateModalidadeData> }) =>
      updateModalidade(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modalidades-catalogo"] });
      setModalidadeEditando(null);
      setForm(FORM_VAZIO);
      toast.success("Modalidade atualizada!");
    },
    onError: (error: Error) => toast.error(error?.message || "Erro ao atualizar"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      ativo
        ? desativarModalidade(id)
        : ativarModalidade(id).then((m) => ({ modalidade: m, totalAlunos: 0 })),
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["modalidades-catalogo"] });
      setToggleLoadingId(null);
      if (vars.ativo) {
        const count = (result as any).totalAlunos ?? 0;
        if (count > 0) {
          toast(`Desativada. ${count} aluno(s) ainda matriculado(s).`, { icon: "⚠️" });
        } else {
          toast.success("Modalidade desativada!");
        }
      } else {
        toast.success("Modalidade ativada!");
      }
    },
    onError: (error: Error) => {
      setToggleLoadingId(null);
      toast.error(error?.message || "Erro ao alterar status");
    },
  });

  const deletarMutation = useMutation({
    mutationFn: (id: string) => deleteModalidade(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modalidades-catalogo"] });
      qc.invalidateQueries({ queryKey: ["unidade-modalidades"] });
      setModalidadeDeletando(null);
      setDeleteLoadingId(null);
      toast.success("Modalidade excluída!");
    },
    onError: (error: Error) => {
      setDeleteLoadingId(null);
      toast.error(error?.message || "Erro ao excluir");
    },
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

  // ------------------------------------------------------------------- form
  function abrirModal() {
    setForm(FORM_VAZIO);
    setNomeOpcao("");
    setErroForm(null);
    setModalAberto(true);
  }

  function abrirEditar(m: Modalidade) {
    const nomePredef = (MODALIDADES_PREDEFINIDAS as readonly string[]).includes(m.nome)
      ? m.nome
      : "outro";
    setNomeOpcao(nomePredef);
    setForm({
      nome: m.nome,
      descricao: m.descricao || "",
      cor: m.cor || COR_DEFAULT,
      icone: m.icone || "",
      tipo_graduacao: m.tipo_graduacao || "NENHUM",
    });
    setErroForm(null);
    setModalidadeEditando(m);
  }

  function fecharModal() {
    setModalAberto(false);
    setModalidadeEditando(null);
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
    if (modalidadeEditando) {
      editarMutation.mutate({ id: modalidadeEditando.id, data: payload });
    } else {
      criarMutation.mutate(payload);
    }
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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="mb-2 -ml-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Dumbbell className="h-6 w-6 text-purple-600" />
                Modalidades
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gerencie as modalidades esportivas das suas unidades
              </p>
            </div>

          </div>

          {/* Seletor de unidade (franqueado com múltiplas unidades) */}
          {isFranqueado && unidades.length > 1 && (
            <div className="mb-6 flex items-center gap-3 bg-white border rounded-xl px-4 py-3">
              <Building2 className="h-5 w-5 text-gray-400 shrink-0" />
              <span className="text-sm font-medium text-gray-600 shrink-0">Unidade:</span>
              <div className="flex flex-wrap gap-2">
                {unidades.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUnidadeSelecionada(u.id);
                      setBusca("");
                      setSecaoCatalogo(false);
                    }}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      unidadeSelecionada === u.id
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
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
            <div className="text-center py-20 text-gray-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhuma unidade encontrada</p>
              <p className="text-sm mt-1">Cadastre uma unidade primeiro.</p>
            </div>
          )}

          {!!unidadeSelecionada && (
            <>
              {/* Abas */}
              <div className="flex gap-1 border-b mb-6">
                <button
                  onClick={() => { setSecaoCatalogo(false); setBusca(""); }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    !secaoCatalogo
                      ? "border-purple-600 text-purple-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Link2 className="h-4 w-4" />
                    {unidadeNome}
                    <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                      !secaoCatalogo ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {modalidadesUnidade.length}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => { setSecaoCatalogo(true); setBusca(""); }}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    secaoCatalogo
                      ? "border-purple-600 text-purple-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Dumbbell className="h-4 w-4" />
                    Catálogo global
                    <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${
                      secaoCatalogo ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {catalogoDisponivel.length} disponíveis
                    </span>
                  </span>
                </button>
              </div>

              {/* Busca */}
              <div className="relative mb-5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={secaoCatalogo ? "Buscar no catálogo..." : "Buscar modalidade..."}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-input rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                {busca && (
                  <button
                    onClick={() => setBusca("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Lista */}
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
              ) : modalidadesFiltradas.length === 0 ? (
                <div className="text-center py-20">
                  <Dumbbell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    {secaoCatalogo
                      ? catalogoDisponivel.length === 0
                        ? "Todas as modalidades do catálogo já estão vinculadas!"
                        : "Nenhuma modalidade encontrada"
                      : modalidadesUnidade.length === 0
                        ? "Nenhuma modalidade vinculada ainda"
                        : "Nenhuma modalidade encontrada"}
                  </p>
                  {!secaoCatalogo && modalidadesUnidade.length === 0 && (
                    <>
                      <p className="text-gray-400 text-sm mt-1">
                        Use a aba <strong>Catálogo global</strong> para adicionar modalidades.
                      </p>
                      <Button
                        onClick={() => setSecaoCatalogo(true)}
                        className="mt-4 bg-purple-600 hover:bg-purple-700 text-white"
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
                      podeDeletar={podeDeletar(user as AuthUser)}
                      toggleLoading={toggleLoadingId === m.id}
                      deleteLoading={deleteLoadingId === m.id}
                      vincularLoading={vincularLoadingId === m.id}
                      desvincularLoading={desvincularLoadingId === m.id}
                      onEditar={() => abrirEditar(m)}
                      onToggle={() => {
                        setToggleLoadingId(m.id);
                        toggleMutation.mutate({ id: m.id, ativo: m.ativo });
                      }}
                      onDeletar={() => setModalidadeDeletando(m)}
                      onVincular={() => {
                        setVincularLoadingId(m.id);
                        vincularMutation.mutate(m.id);
                      }}
                      onDesvincular={() => {
                        setDesvincularLoadingId(m.id);
                        desvincularMutation.mutate(m.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal criar / editar */}
      <Dialog open={modalAberto || !!modalidadeEditando} onOpenChange={fecharModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-purple-600" />
              {modalidadeEditando ? "Editar Modalidade" : "Nova Modalidade"}
            </DialogTitle>
          </DialogHeader>

          {!modalidadeEditando && unidadeSelecionada && (
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
                disabled={criarMutation.isPending || editarMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit"
                disabled={criarMutation.isPending || editarMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white">
                {(criarMutation.isPending || editarMutation.isPending) ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
                ) : modalidadeEditando ? (
                  <><Pencil className="h-4 w-4 mr-2" />Salvar</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Criar e Vincular</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <DeleteConfirmDialog
        modalidade={modalidadeDeletando}
        loading={!!deleteLoadingId}
        onConfirm={() => {
          if (!modalidadeDeletando) return;
          setDeleteLoadingId(modalidadeDeletando.id);
          deletarMutation.mutate(modalidadeDeletando.id);
        }}
        onCancel={() => setModalidadeDeletando(null)}
      />
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
  podeDeletar,
  toggleLoading,
  deleteLoading,
  vincularLoading,
  desvincularLoading,
  onEditar,
  onToggle,
  onDeletar,
  onVincular,
  onDesvincular,
}: {
  modalidade: Modalidade;
  labelTipoGrad: (val: string) => string;
  isVinculada: boolean;
  podeGerenciar: boolean;
  podeDeletar: boolean;
  toggleLoading: boolean;
  deleteLoading: boolean;
  vincularLoading: boolean;
  desvincularLoading: boolean;
  onEditar: () => void;
  onToggle: () => void;
  onDeletar: () => void;
  onVincular: () => void;
  onDesvincular: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 transition-opacity ${
        modalidade.ativo ? "opacity-100" : "opacity-60"
      }`}
      style={{ borderLeft: `4px solid ${modalidade.cor ?? "#1E3A8A"}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 leading-tight">{modalidade.nome}</h3>
        <Badge
          className={
            modalidade.ativo
              ? "bg-green-100 text-green-700 border-green-200 shrink-0"
              : "bg-gray-100 text-gray-500 shrink-0"
          }
        >
          {modalidade.ativo ? "Ativa" : "Inativa"}
        </Badge>
      </div>

      {modalidade.descricao && (
        <p className="text-sm text-gray-500 line-clamp-2">{modalidade.descricao}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5 text-blue-400" />
          {modalidade.totalAlunos ?? 0} aluno(s)
        </span>
        <span className="flex items-center gap-1">
          <Award className="h-3.5 w-3.5 text-yellow-400" />
          {labelTipoGrad(modalidade.tipo_graduacao ?? "NENHUM")}
        </span>
      </div>

      {/* Catálogo → Vincular */}
      {!isVinculada && (
        <Button
          size="sm"
          onClick={onVincular}
          disabled={vincularLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
        >
          {vincularLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <><Link2 className="h-3.5 w-3.5 mr-1" />Adicionar à unidade</>
          )}
        </Button>
      )}

      {/* Vinculada → Editar / Toggle / Desvincular / Deletar */}
      {isVinculada && podeGerenciar && (
        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          <Button size="sm" variant="outline" onClick={onEditar}
            className="flex-1 text-xs h-8">
            <Pencil className="h-3.5 w-3.5 mr-1" />Editar
          </Button>

          <Button size="sm" variant="outline" onClick={onToggle} disabled={toggleLoading}
            className={`flex-1 text-xs h-8 ${
              modalidade.ativo
                ? "text-orange-600 border-orange-200 hover:bg-orange-50"
                : "text-green-600 border-green-200 hover:bg-green-50"
            }`}>
            {toggleLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : modalidade.ativo ? (
              <><PowerOff className="h-3.5 w-3.5 mr-1" />Desativar</>
            ) : (
              <><Power className="h-3.5 w-3.5 mr-1" />Ativar</>
            )}
          </Button>

          <Button size="sm" variant="outline" onClick={onDesvincular}
            disabled={desvincularLoading}
            title="Remover da unidade"
            className="h-8 w-8 p-0 text-red-500 border-red-200 hover:bg-red-50 shrink-0">
            {desvincularLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2Off className="h-3.5 w-3.5" />
            )}
          </Button>

          {podeDeletar && (
            <Button size="sm" variant="outline" onClick={onDeletar}
              disabled={deleteLoading}
              title="Excluir do catálogo global"
              className="h-8 w-8 p-0 text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-red-500 shrink-0">
              {deleteLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      )}
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

function DeleteConfirmDialog({
  modalidade,
  loading,
  onConfirm,
  onCancel,
}: {
  modalidade: Modalidade | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={!!modalidade} onOpenChange={() => !loading && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Excluir do catálogo
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-gray-700">
            Tem certeza que deseja excluir{" "}
            <strong>&ldquo;{modalidade?.nome}&rdquo;</strong> do catálogo global?
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Isso removerá a modalidade de <strong>todas as unidades</strong> e de todos os
            alunos matriculados nela.
          </p>
          <p className="text-xs text-gray-400">
            Prefira usar &ldquo;Remover da unidade&rdquo; se quiser apenas desvinculá-la.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Excluindo...</>
            ) : (
              <><Trash2 className="h-4 w-4 mr-2" />Excluir do catálogo</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
