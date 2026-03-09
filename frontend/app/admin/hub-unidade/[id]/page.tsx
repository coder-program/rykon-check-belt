"use client";

import React, { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  hubVideosApi, hubRecadosApi, hubProdutosApi, hubPedidosApi,
  UnidadeVideo, UnidadeRecado, UnidadeProduto, ProdutoPedido,
  getYouTubeId, getThumbnailUrl, uploadImagemProduto, resolveHubImageUrl,
} from "@/lib/hubApi";
import { listUnidadeModalidades } from "@/lib/peopleApi";
import toast from "react-hot-toast";
import {
  ArrowLeft, Plus, Pencil, Trash2, Play,
  MessageSquare, ShoppingBag, Video,
  Globe, Lock, Package, CheckCircle,
  Search, TrendingUp, Clock,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tab = "videos" | "recados" | "loja" | "pedidos";

export default function HubAdminPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const unidadeId = params.id as string;
  const [tab, setTab] = useState<Tab>("videos");

  // ============================================================
  // QUERIES
  // ============================================================
  const videosQ = useQuery({
    queryKey: ["hub-videos-admin", unidadeId],
    queryFn: () => hubVideosApi.listarAdmin(unidadeId),
    enabled: !!unidadeId,
  });

  const recadosQ = useQuery({
    queryKey: ["hub-recados", unidadeId],
    queryFn: () => hubRecadosApi.listar(unidadeId),
    enabled: !!unidadeId,
  });

  const produtosQ = useQuery({
    queryKey: ["hub-produtos-admin", unidadeId],
    queryFn: () => hubProdutosApi.listarAdmin(unidadeId),
    enabled: !!unidadeId,
  });

  const pedidosQ = useQuery({
    queryKey: ["hub-pedidos-unidade", unidadeId],
    queryFn: () => hubPedidosApi.pedidosUnidade(unidadeId),
    enabled: !!unidadeId && tab === "pedidos",
  });

  const modalidadesQ = useQuery({
    queryKey: ["unidade-modalidades", unidadeId],
    queryFn: () => listUnidadeModalidades({ unidade_id: unidadeId }),
    enabled: !!unidadeId,
  });

  // ============================================================
  // VIDEO STATE
  // ============================================================
  const [videoModal, setVideoModal] = useState(false);
  const [videoEdit, setVideoEdit] = useState<UnidadeVideo | null>(null);
  const [videoForm, setVideoForm] = useState({ titulo: "", url_youtube: "", descricao: "", modalidade_id: "", ativo: true, ordem: 0 });
  const [videoDeleteTarget, setVideoDeleteTarget] = useState<UnidadeVideo | null>(null);

  const savVideo = useMutation({
    mutationFn: () =>
      videoEdit
        ? hubVideosApi.atualizar(videoEdit.id, { ...videoForm, modalidade_id: videoForm.modalidade_id || null })
        : hubVideosApi.criar({ ...videoForm, unidade_id: unidadeId, modalidade_id: videoForm.modalidade_id || null }),
    onSuccess: () => { toast.success("Vídeo salvo!"); setVideoModal(false); qc.invalidateQueries({ queryKey: ["hub-videos-admin", unidadeId] }); },
    onError: () => toast.error("Erro ao salvar vídeo"),
  });

  const delVideo = useMutation({
    mutationFn: (id: string) => hubVideosApi.remover(id),
    onSuccess: () => { toast.success("Vídeo removido"); setVideoDeleteTarget(null); qc.invalidateQueries({ queryKey: ["hub-videos-admin", unidadeId] }); },
    onError: () => toast.error("Erro ao remover vídeo"),
  });

  // ============================================================
  // RECADO STATE
  // ============================================================
  const [recadoModal, setRecadoModal] = useState(false);
  const [recadoEdit, setRecadoEdit] = useState<UnidadeRecado | null>(null);
  const [recadoForm, setRecadoForm] = useState({ titulo: "", mensagem: "" });
  const [recadoDeleteTarget, setRecadoDeleteTarget] = useState<UnidadeRecado | null>(null);

  const savRecado = useMutation({
    mutationFn: () =>
      recadoEdit
        ? hubRecadosApi.atualizar(recadoEdit.id, recadoForm)
        : hubRecadosApi.criar({ ...recadoForm, unidade_id: unidadeId }),
    onSuccess: () => { toast.success("Recado publicado!"); setRecadoModal(false); qc.invalidateQueries({ queryKey: ["hub-recados", unidadeId] }); },
    onError: () => toast.error("Erro ao salvar recado"),
  });

  const delRecado = useMutation({
    mutationFn: (id: string) => hubRecadosApi.remover(id),
    onSuccess: () => { toast.success("Recado removido"); setRecadoDeleteTarget(null); qc.invalidateQueries({ queryKey: ["hub-recados", unidadeId] }); },
    onError: () => toast.error("Erro ao remover recado"),
  });

  // ============================================================
  // PRODUTO STATE
  // ============================================================
  const [produtoModal, setProdutoModal] = useState(false);
  const [produtoEdit, setProdutoEdit] = useState<UnidadeProduto | null>(null);
  const [produtoForm, setProdutoForm] = useState<{
    nome: string; descricao: string; preco: string; url_imagem: string;
    visibilidade: "LOCAL" | "GLOBAL"; permite_parcelamento: boolean;
    max_parcelas: string; estoque: string; ativo: boolean;
  }>({ nome: "", descricao: "", preco: "", url_imagem: "", visibilidade: "LOCAL", permite_parcelamento: false, max_parcelas: "1", estoque: "0", ativo: true });
  const [produtoDeleteTarget, setProdutoDeleteTarget] = useState<UnidadeProduto | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtros da aba Pedidos
  const [pedidosFiltroStatus, setPedidosFiltroStatus] = useState<"TODOS" | "PENDENTE" | "APROVADO" | "CANCELADO">("TODOS");
  const [pedidosSearch, setPedidosSearch] = useState("");
  const [pedidosFiltroMetodo, setPedidosFiltroMetodo] = useState<"TODOS" | "PIX" | "BOLETO" | "CARTAO">("TODOS");
  const [pedidosDataInicio, setPedidosDataInicio] = useState("");
  const [pedidosDataFim, setPedidosDataFim] = useState("");
  const [pedidosFiltroNomeProduto, setPedidosFiltroNomeProduto] = useState("");

  const savProduto = useMutation({
    mutationFn: () => {
      const data: Omit<UnidadeProduto, "id" | "criado_em"> = {
        ...produtoForm,
        descricao: produtoForm.descricao || null,
        url_imagem: produtoForm.url_imagem || null,
        preco: parseFloat(produtoForm.preco),
        max_parcelas: parseInt(produtoForm.max_parcelas),
        estoque: parseInt(produtoForm.estoque),
        unidade_id: unidadeId,
      };
      return produtoEdit ? hubProdutosApi.atualizar(produtoEdit.id, data) : hubProdutosApi.criar(data);
    },
    onSuccess: () => { toast.success("Produto salvo!"); setProdutoModal(false); qc.invalidateQueries({ queryKey: ["hub-produtos-admin", unidadeId] }); },
    onError: () => toast.error("Erro ao salvar produto"),
  });

  const delProduto = useMutation({
    mutationFn: (id: string) => hubProdutosApi.remover(id),
    onSuccess: () => { toast.success("Produto removido"); setProdutoDeleteTarget(null); qc.invalidateQueries({ queryKey: ["hub-produtos-admin", unidadeId] }); },
    onError: () => toast.error("Erro ao remover produto"),
  });

  // helpers
  const openVideoModal = (v?: UnidadeVideo) => {
    setVideoEdit(v ?? null);
    setVideoForm(v ? { titulo: v.titulo, url_youtube: v.url_youtube, descricao: v.descricao ?? "", modalidade_id: v.modalidade_id ?? "", ativo: v.ativo, ordem: v.ordem } : { titulo: "", url_youtube: "", descricao: "", modalidade_id: "", ativo: true, ordem: 0 });
    setVideoModal(true);
  };

  const openRecadoModal = (r?: UnidadeRecado) => {
    setRecadoEdit(r ?? null);
    setRecadoForm(r ? { titulo: r.titulo, mensagem: r.mensagem } : { titulo: "", mensagem: "" });
    setRecadoModal(true);
  };

  const openProdutoModal = (p?: UnidadeProduto) => {
    setProdutoEdit(p ?? null);
    setProdutoForm(p ? {
      nome: p.nome, descricao: p.descricao ?? "", preco: String(p.preco),
      url_imagem: p.url_imagem ?? "", visibilidade: p.visibilidade,
      permite_parcelamento: p.permite_parcelamento, max_parcelas: String(p.max_parcelas),
      estoque: String(p.estoque), ativo: p.ativo,
    } : { nome: "", descricao: "", preco: "", url_imagem: "", visibilidade: "LOCAL", permite_parcelamento: false, max_parcelas: "1", estoque: "0", ativo: true });
    setProdutoModal(true);
  };

  // Simulação de repasse (admin) - mostra quanto a unidade recebe
  const calcRepasse = (preco: number, parcelas: number, comJuros = false) => {
    const taxa8 = preco * 0.08;
    const taxaCartao = comJuros && parcelas > 1 ? preco * (parcelas * 0.025) : 0; // aproximado
    return Math.max(0, preco - taxa8 - taxaCartao).toFixed(2);
  };

  // Pedidos computados (filtrados)
  const pedidosFiltrados = (pedidosQ.data ?? []).filter((ped) => {
    const matchStatus = pedidosFiltroStatus === "TODOS"
      ? ped.status_pagamento !== "CANCELADO"
      : ped.status_pagamento === pedidosFiltroStatus;
    const matchSearch = pedidosSearch === "" ||
      (ped as ProdutoPedido & { aluno?: { nome_completo: string } }).aluno?.nome_completo?.toLowerCase().includes(pedidosSearch.toLowerCase()) ||
      ped.id.toLowerCase().includes(pedidosSearch.toLowerCase());
    const matchMetodo = pedidosFiltroMetodo === "TODOS" || ped.metodo_pagamento === pedidosFiltroMetodo;
    const pedDate = new Date(ped.criado_em);
    const matchDataInicio = !pedidosDataInicio || pedDate >= new Date(pedidosDataInicio + "T00:00:00");
    const matchDataFim = !pedidosDataFim || pedDate <= new Date(pedidosDataFim + "T23:59:59");
    const matchProduto = pedidosFiltroNomeProduto === "" ||
      ped.itens.some((item) => item.produto?.nome?.toLowerCase().includes(pedidosFiltroNomeProduto.toLowerCase()));
    return matchStatus && matchSearch && matchMetodo && matchDataInicio && matchDataFim && matchProduto;
  });
  const hasActiveFilters = pedidosFiltroStatus !== "TODOS" || pedidosSearch !== "" || pedidosFiltroMetodo !== "TODOS" || pedidosDataInicio !== "" || pedidosDataFim !== "" || pedidosFiltroNomeProduto !== "";
  const pedidosPendentesCount = (pedidosQ.data ?? []).filter((p) => p.status_pagamento === "PENDENTE").length;
  const totalReceitaAprovada = (pedidosQ.data ?? [])
    .filter((p) => p.status_pagamento === "APROVADO")
    .reduce((sum, p) => sum + Number(p.valor_total_produtos), 0);
  const totalPendente = (pedidosQ.data ?? [])
    .filter((p) => p.status_pagamento === "PENDENTE")
    .reduce((sum, p) => sum + Number(p.valor_total_produtos), 0);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "videos",  label: "Vídeos/Treinos", icon: <Video size={16} /> },
    { key: "recados", label: "Recados",         icon: <MessageSquare size={16} /> },
    { key: "loja",    label: "Lojinha",          icon: <ShoppingBag size={16} /> },
    { key: "pedidos", label: "Pedidos",          icon: <Package size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold">Hub da Unidade</h1>
          <p className="text-xs text-gray-400">Gerencie vídeos, recados e lojinha</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? "bg-red-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {t.icon} {t.label}
            {t.key === "pedidos" && pedidosPendentesCount > 0 && (
              <span className="ml-1 bg-yellow-400 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {pedidosPendentesCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* =========== ABA VÍDEOS =========== */}
      {tab === "videos" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Vídeos de Treinos</h2>
            <button onClick={() => openVideoModal()} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={16} /> Novo Vídeo
            </button>
          </div>
          {videosQ.isLoading ? (
            <p className="text-gray-400">Carregando...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(videosQ.data ?? []).map((v) => (
                <div key={v.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                  <div className="relative aspect-video bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={getThumbnailUrl(v.url_youtube)} alt={v.titulo} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="text-white opacity-80" size={36} />
                    </div>
                    {!v.ativo && (
                      <div className="absolute top-2 right-2 bg-gray-900/80 text-yellow-400 text-xs px-2 py-1 rounded">Inativo</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate">{v.titulo}</p>
                    {v.modalidade && <p className="text-xs text-gray-400 mt-1">{v.modalidade.nome}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => openVideoModal(v)} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-gray-800 hover:bg-gray-700 text-xs">
                        <Pencil size={12} /> Editar
                      </button>
                      <button onClick={() => setVideoDeleteTarget(v)} className="p-1 rounded bg-red-900/40 hover:bg-red-900/70 text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(videosQ.data ?? []).length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <Video size={40} className="mx-auto mb-3 opacity-50" />
                  <p>Nenhum vídeo cadastrado</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========== ABA RECADOS =========== */}
      {tab === "recados" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Recados para Alunos</h2>
            <button onClick={() => openRecadoModal()} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={16} /> Novo Recado
            </button>
          </div>
          <div className="space-y-3">
            {(recadosQ.data ?? []).map((r) => (
              <div key={r.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="font-semibold">{r.titulo}</p>
                    <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{r.mensagem}</p>
                    <p className="text-xs text-gray-500 mt-2">{new Date(r.publicado_em).toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openRecadoModal(r)} className="p-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setRecadoDeleteTarget(r)} className="p-2 rounded bg-red-900/40 hover:bg-red-900/70 text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(recadosQ.data ?? []).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
                <p>Nenhum recado publicado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========== ABA LOJINHA =========== */}
      {tab === "loja" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Lojinha</h2>
            <button onClick={() => openProdutoModal()} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={16} /> Novo Produto
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(produtosQ.data ?? []).map((p) => (
              <div key={p.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                {p.url_imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveHubImageUrl(p.url_imagem) ?? ""} alt={p.nome} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-800 flex items-center justify-center text-gray-600">
                    <ShoppingBag size={40} />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold">{p.nome}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.visibilidade === "GLOBAL" ? "bg-blue-900/50 text-blue-300" : "bg-gray-700 text-gray-300"}`}>
                      {p.visibilidade === "GLOBAL" ? <><Globe size={10} className="inline mr-1" />Global</> : <><Lock size={10} className="inline mr-1" />Local</>}
                    </span>
                  </div>
                  <p className="text-red-400 font-bold text-lg mt-1">R$ {Number(p.preco).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">Repasse aprox.: R$ {calcRepasse(Number(p.preco), p.max_parcelas, p.permite_parcelamento)}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs ${p.estoque > 0 ? "text-green-400" : "text-red-400"}`}>
                      <Package size={10} className="inline mr-1" />Estoque: {p.estoque}
                    </span>
                    {p.estoque > 0 && p.estoque <= 3 && (
                      <span className="text-xs text-orange-400 font-medium animate-pulse">⚠ Estoque baixo</span>
                    )}
                    {!p.ativo && <span className="text-xs text-yellow-400">Inativo</span>}
                  </div>
                  {p.permite_parcelamento && <p className="text-xs text-gray-500 mt-1">Parcelável em até {p.max_parcelas}x</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openProdutoModal(p)} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => setProdutoDeleteTarget(p)} className="p-1.5 rounded bg-red-900/40 hover:bg-red-900/70 text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(produtosQ.data ?? []).length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <ShoppingBag size={40} className="mx-auto mb-3 opacity-50" />
                <p>Nenhum produto cadastrado</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========== ABA PEDIDOS =========== */}
      {tab === "pedidos" && (
        <div>
          <h2 className="font-semibold text-lg mb-4">Pedidos Recebidos</h2>

          {/* Stats cards */}
          {(pedidosQ.data ?? []).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-900/40 flex items-center justify-center shrink-0">
                  <Package size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total de pedidos</p>
                  <p className="text-xl font-bold text-white">{(pedidosQ.data ?? []).length}</p>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-yellow-900/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-900/30 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Aguardando pagamento</p>
                  <p className="text-xl font-bold text-yellow-300">
                    {pedidosPendentesCount}
                    {totalPendente > 0 && <span className="text-sm font-normal text-yellow-500 ml-1">· R$ {totalPendente.toFixed(2)}</span>}
                  </p>
                </div>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-green-900/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} className="text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Receita aprovada</p>
                  <p className="text-xl font-bold text-green-300">R$ {totalReceitaAprovada.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search + Filters */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 mb-4 space-y-3">

            {/* Row 1: search + nome produto */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar por aluno ou ID do pedido..."
                  value={pedidosSearch}
                  onChange={(e) => setPedidosSearch(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="relative flex-1">
                <Package size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filtrar por nome do produto..."
                  value={pedidosFiltroNomeProduto}
                  onChange={(e) => setPedidosFiltroNomeProduto(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Row 2: dates */}
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-400 whitespace-nowrap">De:</label>
                <input
                  type="date"
                  value={pedidosDataInicio}
                  onChange={(e) => setPedidosDataInicio(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 scheme-dark"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-gray-400 whitespace-nowrap">Até:</label>
                <input
                  type="date"
                  value={pedidosDataFim}
                  onChange={(e) => setPedidosDataFim(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 scheme-dark"
                />
              </div>
              {hasActiveFilters && (
                <button
                  onClick={() => { setPedidosFiltroStatus("TODOS"); setPedidosSearch(""); setPedidosFiltroMetodo("TODOS"); setPedidosDataInicio(""); setPedidosDataFim(""); setPedidosFiltroNomeProduto(""); }}
                  className="text-xs text-red-400 hover:text-red-300 whitespace-nowrap px-2 py-1 rounded border border-red-800 hover:border-red-600 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Row 3: status tabs + método tabs */}
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              <div className="flex gap-1 bg-gray-800 p-1 rounded-lg overflow-x-auto">
                {(["TODOS", "PENDENTE", "APROVADO", "CANCELADO"] as const).map((s) => {
                  const count = s === "TODOS"
                    ? (pedidosQ.data ?? []).filter((p) => p.status_pagamento !== "CANCELADO").length
                    : (pedidosQ.data ?? []).filter((p) => p.status_pagamento === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => setPedidosFiltroStatus(s)}
                      className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                        pedidosFiltroStatus === s
                          ? s === "PENDENTE" ? "bg-yellow-600 text-white"
                            : s === "APROVADO" ? "bg-green-700 text-white"
                            : s === "CANCELADO" ? "bg-gray-600 text-white"
                            : "bg-red-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {s === "TODOS" ? `Todos (${count})` : `${s} (${count})`}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1 bg-gray-800 p-1 rounded-lg overflow-x-auto">
                {(["TODOS", "PIX", "BOLETO", "CARTAO"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPedidosFiltroMetodo(m)}
                    className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap transition-all ${
                      pedidosFiltroMetodo === m
                        ? m === "PIX" ? "bg-emerald-700 text-white"
                          : m === "BOLETO" ? "bg-blue-700 text-white"
                          : m === "CARTAO" ? "bg-purple-700 text-white"
                          : "bg-gray-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {m === "TODOS" ? "Todos métodos" : m}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600 bg-gray-700">
                  <th className="text-left text-xs text-white font-semibold px-4 py-3"># Pedido</th>
                  <th className="text-left text-xs text-white font-semibold px-4 py-3">Aluno</th>
                  <th className="text-left text-xs text-white font-semibold px-4 py-3">Data</th>
                  <th className="text-left text-xs text-white font-semibold px-4 py-3">Método</th>
                  <th className="text-left text-xs text-white font-semibold px-4 py-3">Produtos</th>
                  <th className="text-right text-xs text-white font-semibold px-4 py-3">Valor</th>
                  <th className="text-center text-xs text-white font-semibold px-4 py-3">Status</th>
                  <th className="text-center text-xs text-white font-semibold px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((ped, idx) => (
                  <tr
                    key={ped.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-700/40 transition-colors ${idx % 2 === 0 ? "bg-gray-900" : "bg-gray-800"}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-400 select-all">#{ped.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{(ped as ProdutoPedido & { aluno?: { nome_completo: string } }).aluno?.nome_completo ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs text-gray-300">
                        {new Date(ped.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(ped.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        ped.metodo_pagamento === "PIX" ? "bg-emerald-900/40 text-emerald-300" :
                        ped.metodo_pagamento === "BOLETO" ? "bg-blue-900/40 text-blue-300" :
                        ped.metodo_pagamento === "CARTAO" || ped.metodo_pagamento === "CREDIT_CARD" ? "bg-purple-900/40 text-purple-300" :
                        "bg-gray-700 text-gray-300"
                      }`}>{ped.metodo_pagamento ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {ped.itens.map((item) => (
                          <div key={item.id} className="text-xs text-gray-300">
                            <span className="text-gray-500 font-mono">{item.quantidade}×</span>{" "}
                            <span>{item.produto?.nome ?? "—"}</span>
                            <span className="text-gray-500 ml-1">· R$ {(item.quantidade * Number(item.preco_unitario)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-red-400">R$ {Number(ped.valor_total_produtos).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        ped.status_pagamento === "APROVADO"  ? "bg-green-900/50 text-green-300" :
                        ped.status_pagamento === "CANCELADO" ? "bg-gray-700 text-gray-400" :
                        ped.status_pagamento === "RECUSADO"  ? "bg-red-900/50 text-red-300" :
                        "bg-yellow-900/50 text-yellow-300"
                      }`}>{ped.status_pagamento}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ped.status_pagamento === "PENDENTE" && (
                        <button
                          onClick={() => {
                            if (!confirm("Confirmar aprovação manual deste pedido?")) return;
                            hubPedidosApi.aprovar(ped.id)
                              .then(() => { qc.invalidateQueries({ queryKey: ["hub-pedidos-unidade", unidadeId] }); toast.success("Pedido aprovado!"); })
                              .catch(() => toast.error("Erro ao aprovar pedido"));
                          }}
                          className="inline-flex items-center gap-1 text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded-lg"
                        >
                          <CheckCircle size={12} /> Aprovar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pedidosFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package size={40} className="mx-auto mb-3 opacity-50" />
                <p>{pedidosSearch || pedidosFiltroStatus !== "TODOS" ? "Nenhum pedido encontrado com esses filtros" : "Nenhum pedido recebido ainda"}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODALS VÍDEO
      ============================================================ */}
      <Dialog open={videoModal} onOpenChange={setVideoModal}>
        <DialogContent className="bg-gray-900 text-white border-gray-800 max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{videoEdit ? "Editar Vídeo" : "Novo Vídeo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Título *</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" value={videoForm.titulo} onChange={(e) => setVideoForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Posições do Berimbolo" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Link do YouTube *</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" value={videoForm.url_youtube} onChange={(e) => setVideoForm((f) => ({ ...f, url_youtube: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
            </div>
            {videoForm.url_youtube && getYouTubeId(videoForm.url_youtube) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getThumbnailUrl(videoForm.url_youtube)} alt="preview" className="w-full rounded-lg aspect-video object-cover" />
            )}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Modalidade (opcional)</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                value={videoForm.modalidade_id}
                onChange={(e) => setVideoForm((f) => ({ ...f, modalidade_id: e.target.value }))}
              >
                <option value="">— Todas as modalidades —</option>
                {(modalidadesQ.data ?? []).map((um) => (
                  <option key={um.modalidade_id} value={um.modalidade_id}>
                    {um.modalidade?.nome ?? um.modalidade_id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
              <textarea rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none" value={videoForm.descricao} onChange={(e) => setVideoForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="v-ativo" checked={videoForm.ativo} onChange={(e) => setVideoForm((f) => ({ ...f, ativo: e.target.checked }))} className="accent-red-500" />
              <label htmlFor="v-ativo" className="text-sm">Ativo (visível para alunos)</label>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setVideoModal(false)} className="px-4 py-2 rounded-lg bg-gray-800 text-sm hover:bg-gray-700">Cancelar</button>
            <button disabled={savVideo.isPending || !videoForm.titulo || !videoForm.url_youtube} onClick={() => savVideo.mutate()} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50">
              {savVideo.isPending ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!videoDeleteTarget}>
        <AlertDialogContent className="bg-gray-900 text-white border-gray-800">
          <AlertDialogHeader><AlertDialogTitle>Remover Vídeo?</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVideoDeleteTarget(null)} className="border-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (videoDeleteTarget) delVideo.mutate(videoDeleteTarget.id); }} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================
          MODALS RECADO
      ============================================================ */}
      <Dialog open={recadoModal} onOpenChange={setRecadoModal}>
        <DialogContent className="bg-gray-900 text-white border-gray-800 max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{recadoEdit ? "Editar Recado" : "Novo Recado"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Título *</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" value={recadoForm.titulo} onChange={(e) => setRecadoForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Torneio no dia 15!" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Mensagem *</label>
              <textarea rows={5} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none" value={recadoForm.mensagem} onChange={(e) => setRecadoForm((f) => ({ ...f, mensagem: e.target.value }))} placeholder="Escreva o recado para os alunos..." />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setRecadoModal(false)} className="px-4 py-2 rounded-lg bg-gray-800 text-sm hover:bg-gray-700">Cancelar</button>
            <button disabled={savRecado.isPending || !recadoForm.titulo || !recadoForm.mensagem} onClick={() => savRecado.mutate()} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50">
              {savRecado.isPending ? "Publicando..." : "Publicar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!recadoDeleteTarget}>
        <AlertDialogContent className="bg-gray-900 text-white border-gray-800">
          <AlertDialogHeader><AlertDialogTitle>Remover Recado?</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecadoDeleteTarget(null)} className="border-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (recadoDeleteTarget) delRecado.mutate(recadoDeleteTarget.id); }} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============================================================
          MODALS PRODUTO
      ============================================================ */}
      <Dialog open={produtoModal} onOpenChange={setProdutoModal}>
        <DialogContent className="bg-gray-900 text-white border-gray-800 max-w-lg overflow-y-auto max-h-[90vh]" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{produtoEdit ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nome do produto *</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" value={produtoForm.nome} onChange={(e) => setProdutoForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
              <textarea rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-none" value={produtoForm.descricao} onChange={(e) => setProdutoForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Preço (R$) *</label>
                <input type="number" min="0" step="0.01" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" value={produtoForm.preco} onChange={(e) => setProdutoForm((f) => ({ ...f, preco: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Estoque *</label>
                <input type="number" min="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" value={produtoForm.estoque} onChange={(e) => setProdutoForm((f) => ({ ...f, estoque: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Foto do Produto</label>
              {/* hidden file input */}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploadingImg(true);
                  try {
                    const url = await uploadImagemProduto(f);
                    setProdutoForm((prev) => ({ ...prev, url_imagem: url }));
                    toast.success("Imagem enviada!");
                  } catch {
                    toast.error("Erro ao enviar imagem");
                  } finally {
                    setUploadingImg(false);
                    e.target.value = "";
                  }
                }}
              />
              {produtoForm.url_imagem ? (
                <div className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveHubImageUrl(produtoForm.url_imagem) ?? ""}
                    alt="preview"
                    className="w-full h-40 object-cover rounded-lg border border-gray-700"
                    onError={(e) => { e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23374151'/%3E%3Ctext x='50' y='55' font-size='12' text-anchor='middle' fill='%239CA3AF'%3EImagem indispon%C3%ADvel%3C/text%3E%3C/svg%3E"; }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-700"
                    >
                      Trocar
                    </button>
                    <button
                      type="button"
                      onClick={() => setProdutoForm((f) => ({ ...f, url_imagem: "" }))}
                      className="bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-red-600"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingImg}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-gray-400 transition-colors disabled:opacity-50"
                >
                  {uploadingImg ? (
                    <span className="text-sm text-gray-400">Enviando...</span>
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m-4 4l4-4 4 4M6.5 19h11a2 2 0 002-2V8.5L15 4H7a2 2 0 00-2 2v11a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-400">Clique para adicionar foto</span>
                      <span className="text-xs text-gray-600">PNG, JPG, WEBP - máx 5MB</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Visibilidade</label>
              <select className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" value={produtoForm.visibilidade} onChange={(e) => setProdutoForm((f) => ({ ...f, visibilidade: e.target.value as "LOCAL" | "GLOBAL" }))}>
                <option value="LOCAL">Apenas minha unidade</option>
                <option value="GLOBAL">Visível para todas as unidades</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="p-parcel" checked={produtoForm.permite_parcelamento} onChange={(e) => setProdutoForm((f) => ({ ...f, permite_parcelamento: e.target.checked }))} className="accent-red-500" />
              <label htmlFor="p-parcel" className="text-sm">Permite parcelamento no cartão</label>
            </div>
            {produtoForm.permite_parcelamento && (
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Máximo de Parcelas</label>
                <input type="number" min="2" max="12" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm" value={produtoForm.max_parcelas} onChange={(e) => setProdutoForm((f) => ({ ...f, max_parcelas: e.target.value }))} />
              </div>
            )}
            {produtoForm.preco && (
              <div className="bg-gray-800 rounded-lg p-3 text-xs space-y-1">
                <p className="text-gray-400 font-semibold">Simulação de repasse</p>
                <p>Valor do produto: <span className="text-white">R$ {Number(produtoForm.preco).toFixed(2)}</span></p>
                <p>Taxa plataforma (6%): <span className="text-red-400">- R$ {(Number(produtoForm.preco) * 0.08).toFixed(2)}</span></p>
                <p className="font-bold text-green-400">Seu líquido aprox.: R$ {calcRepasse(Number(produtoForm.preco), 1)}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="p-ativo" checked={produtoForm.ativo} onChange={(e) => setProdutoForm((f) => ({ ...f, ativo: e.target.checked }))} className="accent-red-500" />
              <label htmlFor="p-ativo" className="text-sm">Produto ativo (visível na loja)</label>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setProdutoModal(false)} className="px-4 py-2 rounded-lg bg-gray-800 text-sm hover:bg-gray-700">Cancelar</button>
            <button disabled={savProduto.isPending || !produtoForm.nome || !produtoForm.preco} onClick={() => savProduto.mutate()} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50">
              {savProduto.isPending ? "Salvando..." : "Salvar Produto"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!produtoDeleteTarget}>
        <AlertDialogContent className="bg-gray-900 text-white border-gray-800">
          <AlertDialogHeader><AlertDialogTitle>Remover Produto?</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProdutoDeleteTarget(null)} className="border-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (produtoDeleteTarget) delProduto.mutate(produtoDeleteTarget.id); }} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


