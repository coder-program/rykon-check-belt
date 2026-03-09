"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import ProcessarPagamentoModal from "@/components/financeiro/ProcessarPagamentoModal";
import {
  hubVideosApi,
  hubRecadosApi,
  hubProdutosApi,
  hubPedidosApi,
  UnidadeVideo,
  UnidadeRecado,
  UnidadeProduto,
  ItemCarrinho,
  FaturaHub,
  getYouTubeId,
  getThumbnailUrl,
  resolveHubImageUrl,
} from "@/lib/hubApi";
import { http } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Play,
  ShoppingBag,
  ShoppingCart,
  X,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  MessageSquare,
  Loader2,
  Package,
  CreditCard,
  FileText,
  QrCode,
  ChevronLeft,
  MonitorPlay,
  Bell,
  Clock,
  AlertTriangle,
  Search,
  Receipt,
  ChevronRight,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

// ──────────────────────── helpers ────────────────────────

function fmtBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Tab = "treinos" | "mural" | "loja" | "pedidos";
type MetodoPagamento = "PIX" | "BOLETO" | "CARTAO";

// ──────────────────────── Page ────────────────────────

export default function HubPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("treinos");
  const [videoAberto, setVideoAberto] = useState<UnidadeVideo | null>(null);

  // carrinho
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  // checkout
  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [metodo, setMetodo] = useState<MetodoPagamento>("PIX");
  const [parcelas, setParcelas] = useState(1);

  // pagamento
  const [faturaParaPagar, setFaturaParaPagar] = useState<FaturaHub | null>(null);
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);

  // filtro de vídeos
  const [modalidadeFiltro, setModalidadeFiltro] = useState<string>("TODOS");

  // loja
  const [searchProduto, setSearchProduto] = useState("");
  const [produtoDetalhe, setProdutoDetalhe] = useState<UnidadeProduto | null>(null);

  // ── aluno_id resolvido ──
  const [resolvedUnidadeId, setResolvedUnidadeId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const resolver = async () => {
      try {
        // tenta pegar diretamente do user
        const u = user as Record<string, unknown>;
        if (u.unidade_id && typeof u.unidade_id === "string") {
          setResolvedUnidadeId(u.unidade_id);
          return;
        }
        // busca pelo usuario_id
        const aluno = await http(`/alunos/usuario/${user.id}`, { auth: true });
        const uid = aluno?.unidade_id ?? aluno?.unidade?.id ?? null;
        setResolvedUnidadeId(uid);
      } catch {
        setResolvedUnidadeId(null);
      }
    };
    resolver();
  }, [user]);

  // Guard: redirect unauthenticated
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  // ── Queries ──
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["hub-videos", resolvedUnidadeId],
    queryFn: () => hubVideosApi.listar(resolvedUnidadeId!),
    enabled: !!resolvedUnidadeId && tab === "treinos",
  });

  const { data: recados = [], isLoading: recadosLoading } = useQuery({
    queryKey: ["hub-recados", resolvedUnidadeId],
    queryFn: async () => {
      const list = await hubRecadosApi.listar(resolvedUnidadeId!);
      return list;
    },
    enabled: !!resolvedUnidadeId && tab === "mural",
  });

  const { data: produtos = [], isLoading: produtosLoading } = useQuery({
    queryKey: ["hub-produtos", resolvedUnidadeId],
    queryFn: () => hubProdutosApi.listar(resolvedUnidadeId!),
    enabled: !!resolvedUnidadeId && tab === "loja",
  });

  // ── Marcar recado lido ──
  const marcarLidoMutation = useMutation({
    mutationFn: (recadoId: string) => hubRecadosApi.marcarLido(recadoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hub-recados-nao-lidos"] }),
  });

  // Marca todos os recados carregados como lidos quando o mural é aberto
  useEffect(() => {
    if (tab !== "mural" || recados.length === 0) return;
    recados.forEach((r: UnidadeRecado) => {
      marcarLidoMutation.mutate(r.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, recados.length]);

  // ── Carrinho helpers ──
  const adicionarAoCarrinho = useCallback((produto: UnidadeProduto) => {
    setCarrinho((prev) => {
      const existing = prev.find((i) => i.produto.id === produto.id);
      if (existing) {
        if (existing.quantidade >= produto.estoque) {
          toast.error("Estoque insuficiente");
          return prev;
        }
        return prev.map((i) =>
          i.produto.id === produto.id
            ? { ...i, quantidade: i.quantidade + 1 }
            : i
        );
      }
      return [...prev, { produto, quantidade: 1 }];
    });
    toast.success(`${produto.nome} adicionado ao carrinho`);
  }, []);

  const removerDoCarrinho = useCallback((produtoId: string) => {
    setCarrinho((prev) => prev.filter((i) => i.produto.id !== produtoId));
  }, []);

  const alterarQuantidade = useCallback((produtoId: string, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((i) =>
          i.produto.id === produtoId
            ? { ...i, quantidade: i.quantidade + delta }
            : i
        )
        .filter((i) => i.quantidade > 0)
    );
  }, []);

  const totalCarrinho = carrinho.reduce(
    (sum, i) => sum + i.produto.preco * i.quantidade,
    0
  );
  const qtdCarrinho = carrinho.reduce((sum, i) => sum + i.quantidade, 0);

  // ── Meus pedidos pendentes ──
  const pedidosPendentesQ = useQuery({
    queryKey: ["hub-meus-pedidos"],
    queryFn: () => hubPedidosApi.meusPedidos(),
    enabled: tab === "loja" || tab === "pedidos",
    select: (list) => list.filter((p) => p.status_pagamento === "PENDENTE"),
  });

  const todosPedidosQ = useQuery({
    queryKey: ["hub-todos-pedidos"],
    queryFn: () => hubPedidosApi.meusPedidos(),
    enabled: !!resolvedUnidadeId,
  });

  const cancelarPedidoMutation = useMutation({
    mutationFn: (pedidoId: string) => hubPedidosApi.cancelar(pedidoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hub-meus-pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["hub-todos-pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["hub-produtos"] });
      toast.success("Pedido cancelado.");
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Erro ao cancelar"),
  });

  // ── Pedido ──
  const criarPedidoMutation = useMutation({
    mutationFn: () =>
      hubPedidosApi.criar({
        itens: carrinho.map((i) => ({
          produto_id: i.produto.id,
          quantidade: i.quantidade,
        })),
        metodo_pagamento: metodo,
        parcelas: metodo === "CARTAO" ? parcelas : undefined,
      }),
    onSuccess: (pedido) => {
      setCarrinho([]);
      setCheckoutAberto(false);
      setCarrinhoAberto(false);
      queryClient.invalidateQueries({ queryKey: ["hub-produtos"] });
      queryClient.invalidateQueries({ queryKey: ["hub-todos-pedidos"] });
      queryClient.invalidateQueries({ queryKey: ["hub-meus-pedidos"] });
      if (pedido.fatura) {
        setFaturaParaPagar(pedido.fatura);
        setModalPagamentoOpen(true);
      } else {
        toast.success("Pedido realizado! Aguarde confirmação.");
        setPagamentoConfirmado(true);
      }
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erro ao finalizar pedido";
      const isPendente = msg.includes("pedido pendente") || msg.includes("409");
      if (isPendente) {
        toast(
          (t) => (
            <span className="flex flex-col gap-2 text-sm">
              <span>⚠️ Você já tem um pedido pendente para esses itens.</span>
              <button
                className="underline text-blue-600 text-left"
                onClick={() => { toast.dismiss(t.id); router.push("/financeiro/minhas-faturas"); }}
              >
                Ver minhas faturas →
              </button>
            </span>
          ),
          { duration: 8000 }
        );
      } else {
        toast.error(msg);
      }
    },
  });

  // ── Modalidades únicas para filtro ──
  const modalidades = Array.from(
    new Set(
      videos
        .map((v) => v.modalidade?.nome)
        .filter(Boolean) as string[]
    )
  ).sort();

  const videosFiltrados = videos.filter(
    (v) =>
      modalidadeFiltro === "TODOS" ||
      v.modalidade?.nome === modalidadeFiltro
  );

  const produtosFiltrados = produtos.filter((p: UnidadeProduto) =>
    p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
    (p.descricao ?? "").toLowerCase().includes(searchProduto.toLowerCase())
  );

  // ── Guards ──
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!resolvedUnidadeId && !authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="text-center max-w-sm">
          <Package className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Sem unidade vinculada</h2>
          <p className="text-slate-500 text-sm">Você ainda não está vinculado a uma unidade. Fale com seu professor.</p>
        </div>
      </div>
    );
  }

  const embedUrl = videoAberto
    ? `https://www.youtube.com/embed/${getYouTubeId(videoAberto.url_youtube)}?autoplay=1&rel=0`
    : null;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-10">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Início</span>
            </button>

            {/* Hero inline title */}
            <div className="flex flex-col items-center text-center">
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400 leading-none">Espaço do Aluno</span>
              <span className="text-sm font-bold text-slate-800 leading-tight">
                {user ? `Olá, ${(user as Record<string,unknown>).nome_completo?.toString().split(" ")[0] ?? "Atleta"} 👋` : "Meu Hub"}
              </span>
            </div>

            {/* Carrinho badge */}
            <button
              onClick={() => setCarrinhoAberto(true)}
              className="relative p-2 text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {qtdCarrinho > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {qtdCarrinho}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero banner */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-violet-600 text-white px-4 py-4 shadow-lg">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">Seu centro de treinamento 🥋</h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-0.5 max-w-md">Treinos em vídeo, recados do seu professor, loja da academia e acompanhamento dos seus pedidos — tudo em um só lugar.</p>
            </div>
            <div className="shrink-0 hidden sm:flex w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm items-center justify-center text-3xl shadow-inner">
              🏆
            </div>
          </div>
        </div>

        {/* Tabs — creative pill nav */}
        <div className="max-w-5xl mx-auto px-3 py-3 border-t border-slate-100">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {([
              { key: "treinos", label: "Treinos",  Icon: Play,        activeClass: "bg-linear-to-r from-violet-500 to-purple-600",  inactiveClass: "bg-violet-50 text-violet-700 ring-1 ring-violet-200"  },
              { key: "mural",   label: "Mural",    Icon: Bell,        activeClass: "bg-linear-to-r from-amber-400 to-orange-500",   inactiveClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-200"     },
              { key: "loja",    label: "Lojinha",  Icon: ShoppingBag, activeClass: "bg-linear-to-r from-emerald-400 to-teal-500",   inactiveClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"},
              { key: "pedidos", label: "Pedidos",  Icon: Receipt,     activeClass: "bg-linear-to-r from-blue-500 to-indigo-600",    inactiveClass: "bg-blue-50 text-blue-700 ring-1 ring-blue-200"        },
            ] as { key: Tab; label: string; Icon: React.ElementType; activeClass: string; inactiveClass: string }[]).map(
              ({ key, label, Icon, activeClass, inactiveClass }) => {
                const isActive = tab === key;
                const pedidosCount = key === "pedidos" ? (todosPedidosQ.data ?? []).length : 0;
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 shrink-0 ${
                      isActive
                        ? `${activeClass} text-white shadow-md scale-[1.03] ring-2 ring-white`
                        : `${inactiveClass} hover:shadow-sm hover:scale-[1.01]`
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    {pedidosCount > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${isActive ? "bg-white/30 text-white" : "bg-blue-600 text-white"}`}>
                        {pedidosCount}
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 sm:pb-8">

        {/* ═══════════ TAB: TREINOS ═══════════ */}
        {tab === "treinos" && (
          <div>
            {/* Filtro de modalidade */}
            {modalidades.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-5">
                {["TODOS", ...modalidades].map((m) => (
                  <button
                    key={m}
                    onClick={() => setModalidadeFiltro(m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      modalidadeFiltro === m
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {m === "TODOS" ? "Todos" : m}
                  </button>
                ))}
              </div>
            )}

            {videosLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : videosFiltrados.length === 0 ? (
              <div className="text-center py-16">
                <MonitorPlay className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500">Nenhum vídeo disponível ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {videosFiltrados.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVideoAberto(v)}
                    className="group relative bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-left active:scale-[0.98]"
                  >
                    <div className="relative aspect-video bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getThumbnailUrl(v.url_youtube)}
                        alt={v.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-white rounded-full p-3 shadow-lg">
                          <Play className="h-5 w-5 text-blue-600 fill-current" />
                        </div>
                      </div>
                      {v.modalidade && (
                        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {v.modalidade.nome}
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-slate-800 text-sm line-clamp-2">{v.titulo}</p>
                      {v.descricao && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{v.descricao}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB: MURAL ═══════════ */}
        {tab === "mural" && (
          <div>
            {recadosLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : recados.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500">Nenhuma mensagem no mural ainda.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[1fr_auto] bg-slate-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-200">
                  <span>Mensagem</span>
                  <span className="text-right">Publicado</span>
                </div>
                {/* Rows */}
                {recados.map((r: UnidadeRecado, idx: number) => (
                  <div
                    key={r.id}
                    className={`px-4 sm:px-5 py-4 hover:bg-slate-50 transition-colors ${
                      idx > 0 ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          <h3 className="font-semibold text-slate-800 text-sm">{r.titulo}</h3>
                          <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium border border-green-200">
                            ✓ Lido
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line pl-3.5">
                          {r.mensagem}
                        </p>
                      </div>
                      <div className="shrink-0 text-right pt-0.5">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {dayjs(r.publicado_em || r.criado_em).fromNow()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TAB: LOJA ═══════════ */}
        {tab === "loja" && (
          <div>
            {/* Pagamento confirmado banner */}
            {pagamentoConfirmado && (
              <div className="mb-5 bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-800">Pagamento processado!</p>
                  <p className="text-green-600 text-sm mt-0.5">Seu pedido foi registrado com sucesso.</p>
                </div>
                <button onClick={() => setPagamentoConfirmado(false)} className="text-green-400 hover:text-green-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Pedidos pendentes do aluno */}
            {(pedidosPendentesQ.data ?? []).length > 0 && (
              <div className="mb-5 border border-amber-200 bg-amber-50 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200 bg-amber-100/60">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="font-semibold text-amber-800 text-sm flex-1 min-w-0 truncate">
                    {pedidosPendentesQ.data!.length} pedido{pedidosPendentesQ.data!.length > 1 ? "s" : ""} pendente{pedidosPendentesQ.data!.length > 1 ? "s" : ""}
                  </p>
                  <button
                    onClick={() => setTab("pedidos")}
                    className="shrink-0 text-xs text-amber-600 hover:text-amber-800 underline font-medium whitespace-nowrap"
                  >
                    Ver →
                  </button>
                </div>
                {/* Mini table */}
                <div className="divide-y divide-amber-100">
                  {pedidosPendentesQ.data!.map((ped) => (
                    <div key={ped.id} className="px-4 py-3 hover:bg-amber-50/80 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 font-medium">
                            {ped.itens.map((i) => `${i.quantidade}× ${i.produto?.nome}`).join(", ")}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {fmtBRL(ped.valor_total_produtos)} · {ped.metodo_pagamento} · #{ped.id.slice(0,8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {ped.fatura && (
                          <button
                            onClick={() => { setFaturaParaPagar(ped.fatura!); setModalPagamentoOpen(true); }}
                            className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold shadow-sm active:scale-95"
                          >
                            Pagar agora
                          </button>
                        )}
                        <button
                          disabled={cancelarPedidoMutation.isPending}
                          onClick={() => { if (!confirm("Cancelar este pedido?")) return; cancelarPedidoMutation.mutate(ped.id); }}
                          className="flex-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-2 rounded-lg flex items-center justify-center gap-1 active:scale-95"
                        >
                          <X className="h-3 w-3" /> Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 text-xs text-amber-600 flex items-center gap-1 border-t border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-3 w-3" />
                  Pedidos pendentes reservam estoque. Cancele se não for pagar.
                </div>
              </div>
            )}

            {produtosLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                {/* Search bar */}
                {produtos.length > 0 && (
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar produtos..."
                      value={searchProduto}
                      onChange={(e) => setSearchProduto(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                    {searchProduto && (
                      <button
                        onClick={() => setSearchProduto("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                {produtosFiltrados.length === 0 ? (
                  <div className="text-center py-16">
                    <ShoppingBag className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-500">
                      {searchProduto ? `Nenhum produto encontrado para "${searchProduto}"` : "Nenhum produto disponível no momento."}
                    </p>
                    {searchProduto && (
                      <button onClick={() => setSearchProduto("")} className="mt-2 text-blue-600 text-sm hover:underline">
                        Limpar busca
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {produtosFiltrados.map((p: UnidadeProduto) => {
                      const carrinhoItem = carrinho.find((ci) => ci.produto.id === p.id);
                      return (
                        <div
                          key={p.id}
                          className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-md flex flex-col group transition-all active:scale-[0.98]"
                        >
                          <button
                            className="relative overflow-hidden"
                            onClick={() => setProdutoDetalhe(p)}
                          >
                            {p.url_imagem ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={resolveHubImageUrl(p.url_imagem) ?? ""}
                                alt={p.nome}
                            className="w-full h-36 sm:h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-36 sm:h-44 bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                                <Package className="h-14 w-14 text-indigo-300" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full transition-opacity shadow">
                                Ver detalhes
                              </span>
                            </div>
                          </button>
                          <div className="p-2.5 sm:p-4 flex flex-col flex-1">
                            <h3
                              className="font-semibold text-slate-800 text-xs sm:text-sm cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
                              onClick={() => setProdutoDetalhe(p)}
                            >
                              {p.nome}
                            </h3>
                            {p.descricao && (
                              <p className="text-slate-500 text-[11px] sm:text-sm mt-1 line-clamp-2 flex-1 hidden sm:block">
                                {p.descricao}
                              </p>
                            )}
                            <div className="mt-2 sm:mt-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm sm:text-lg font-bold text-blue-600">
                                  {fmtBRL(p.preco)}
                                </p>
                                {p.permite_parcelamento && p.max_parcelas > 1 && (
                                  <p className="text-xs text-slate-400">
                                    ou até {p.max_parcelas}x no cartão
                                  </p>
                                )}
                              </div>
                              <span
                                className={`hidden sm:inline text-xs px-2 py-0.5 rounded-full font-medium ${
                                  p.estoque > 5
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : p.estoque > 0
                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                    : "bg-red-100 text-red-600 border border-red-200"
                                }`}
                              >
                                {p.estoque > 0 ? `${p.estoque} em estoque` : "Esgotado"}
                              </span>
                              <span
                                className={`sm:hidden text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  p.estoque > 5
                                    ? "bg-green-100 text-green-700"
                                    : p.estoque > 0
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {p.estoque > 0 ? p.estoque : "Esgt."}
                              </span>
                            </div>
                            {/* Inline cart controls — show if already in cart */}
                            {carrinhoItem ? (
                              <div className="mt-2 sm:mt-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-1 sm:p-1.5">
                                <button
                                  onClick={() => alterarQuantidade(p.id, -1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600 active:scale-90"
                                >
                                  <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </button>
                                <span className="text-xs sm:text-sm font-bold text-blue-600">
                                  {carrinhoItem.quantidade}
                                </span>
                                <button
                                  onClick={() => {
                                    if (carrinhoItem.quantidade >= p.estoque) { toast.error("Estoque insuficiente"); return; }
                                    alterarQuantidade(p.id, +1);
                                  }}
                                  disabled={carrinhoItem.quantidade >= p.estoque}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors text-slate-600 disabled:opacity-40 active:scale-90"
                                >
                                  <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={p.estoque === 0}
                                onClick={() => adicionarAoCarrinho(p)}
                                className="mt-2 sm:mt-3 w-full py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-blue-600 hover:bg-blue-700 active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                              >
                                <span className="sm:hidden">{p.estoque === 0 ? "Esgotado" : "+ Carrinho"}</span>
                                <span className="hidden sm:inline">{p.estoque === 0 ? "Esgotado" : "Adicionar ao carrinho"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sticky bottom bar */}
                {qtdCarrinho > 0 && (
                  <div className="sticky bottom-4 mt-6 z-20">
                    <button
                      onClick={() => setCarrinhoAberto(true)}
                      className="w-full flex items-center justify-between bg-blue-600 hover:bg-blue-500 text-white py-4 px-5 rounded-2xl shadow-2xl shadow-blue-900/50 transition-all active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-white/25 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                          {qtdCarrinho}
                        </span>
                        <span className="font-semibold">Ver carrinho</span>
                      </div>
                      <span className="font-bold text-lg">{fmtBRL(totalCarrinho)}</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* ═══════════ TAB: PEDIDOS ═══════════ */}
        {tab === "pedidos" && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Receipt className="h-5 w-5 text-blue-600" />
              <h2 className="font-bold text-slate-800 text-xl">Meus Pedidos</h2>
            </div>
            {todosPedidosQ.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (todosPedidosQ.data ?? []).length === 0 ? (
              <div className="text-center py-16">
                <Receipt className="mx-auto h-14 w-14 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">Você ainda não fez nenhum pedido</p>
                <p className="text-slate-400 text-sm mt-1">Explore nossa lojinha e adicione produtos ao carrinho</p>
                <button
                  onClick={() => setTab("loja")}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  Ir para a Lojinha
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table header — hidden on mobile */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>Pedido</span>
                  <span>Itens</span>
                  <span className="text-center">Método</span>
                  <span className="text-right">Valor</span>
                  <span className="text-right">Ação</span>
                </div>
                {/* Rows */}
                {(todosPedidosQ.data ?? []).map((ped, idx) => (
                  <div
                    key={ped.id}
                    className={`${idx > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    {/* ── MOBILE card layout ── */}
                    <div className="sm:hidden px-4 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs text-slate-400">#{ped.id.slice(0, 8).toUpperCase()}</span>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              ped.status_pagamento === "APROVADO"  ? "bg-green-100 text-green-700" :
                              ped.status_pagamento === "CANCELADO" ? "bg-slate-100 text-slate-500" :
                              ped.status_pagamento === "RECUSADO"  ? "bg-red-100 text-red-600" :
                              "bg-amber-100 text-amber-700"
                            }`}>
                              {ped.status_pagamento === "APROVADO"  ? "✓ Pago" :
                               ped.status_pagamento === "CANCELADO" ? "Cancelado" :
                               ped.status_pagamento === "RECUSADO"  ? "Recusado" :
                               "⏳ Pendente"}
                            </span>
                            <span className="text-[10px] text-slate-400">{dayjs(ped.criado_em).format("DD/MM/YY HH:mm")}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-800 text-sm">{fmtBRL(ped.valor_total_produtos)}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{ped.metodo_pagamento}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        {ped.itens.map((i) => (
                          <p key={i.id} className="text-sm text-slate-600">
                            {i.quantidade}× {i.produto?.nome}
                          </p>
                        ))}
                      </div>
                      {ped.status_pagamento === "PENDENTE" && (
                        <div className="flex gap-2 mt-3">
                          {ped.fatura && (
                            <button
                              onClick={() => { setFaturaParaPagar(ped.fatura!); setModalPagamentoOpen(true); }}
                              className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold shadow-sm active:scale-95"
                            >
                              Pagar agora
                            </button>
                          )}
                          <button
                            disabled={cancelarPedidoMutation.isPending}
                            onClick={() => { if (!confirm("Cancelar este pedido?")) return; cancelarPedidoMutation.mutate(ped.id); }}
                            className="flex-1 text-sm text-red-500 border border-red-200 py-2.5 rounded-xl active:scale-95"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ── DESKTOP row layout ── */}
                    <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-4 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0">
                        <span className="font-mono text-xs text-slate-400 block">#{ped.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded ${
                          ped.status_pagamento === "APROVADO"  ? "bg-green-100 text-green-700" :
                          ped.status_pagamento === "CANCELADO" ? "bg-slate-100 text-slate-500" :
                          ped.status_pagamento === "RECUSADO"  ? "bg-red-100 text-red-600" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {ped.status_pagamento === "APROVADO"  ? "✓ Pago" :
                           ped.status_pagamento === "CANCELADO" ? "Cancelado" :
                           ped.status_pagamento === "RECUSADO"  ? "Recusado" :
                           "⏳ Pendente"}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-1">
                          {dayjs(ped.criado_em).format("DD/MM/YY HH:mm")}
                        </span>
                      </div>
                      <div className="min-w-0">
                        {ped.itens.map((i) => (
                          <p key={i.id} className="text-sm text-slate-700 truncate">
                            {i.quantidade}× {i.produto?.nome}
                          </p>
                        ))}
                      </div>
                      <div className="text-center">
                        <span className="text-xs text-slate-500 font-medium">{ped.metodo_pagamento}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-800 text-sm">{fmtBRL(ped.valor_total_produtos)}</span>
                      </div>
                      <div className="text-right flex flex-col gap-1.5 items-end">
                        {ped.status_pagamento === "PENDENTE" && ped.fatura && (
                          <button
                            onClick={() => { setFaturaParaPagar(ped.fatura!); setModalPagamentoOpen(true); }}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap shadow-sm"
                          >
                            Pagar agora
                          </button>
                        )}
                        {ped.status_pagamento === "PENDENTE" && (
                          <button
                            disabled={cancelarPedidoMutation.isPending}
                            onClick={() => { if (!confirm("Cancelar este pedido?")) return; cancelarPedidoMutation.mutate(ped.id); }}
                            className="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg whitespace-nowrap"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════ MODAL: Detalhe do Produto ═══════════ */}
      <Dialog open={!!produtoDetalhe} onOpenChange={(o) => !o && setProdutoDetalhe(null)}>
        <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden bg-white border-slate-200" aria-describedby={undefined}>
          {produtoDetalhe && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{produtoDetalhe?.nome ?? "Detalhe do produto"}</DialogTitle>
              </DialogHeader>
              {produtoDetalhe.url_imagem ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveHubImageUrl(produtoDetalhe.url_imagem) ?? ""} alt={produtoDetalhe.nome} className="w-full h-52 object-cover" />
              ) : (
                <div className="w-full h-52 bg-slate-100 flex items-center justify-center">
                  <Package className="h-20 w-20 text-slate-300" />
                </div>
              )}
              <div className="p-5">
                <h2 className="text-xl font-bold text-slate-800">{produtoDetalhe.nome}</h2>
                {produtoDetalhe.descricao && (
                  <p className="text-slate-500 mt-2 text-sm leading-relaxed">{produtoDetalhe.descricao}</p>
                )}
                <div className="flex items-center justify-between mt-4">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{fmtBRL(produtoDetalhe.preco)}</p>
                    {produtoDetalhe.permite_parcelamento && produtoDetalhe.max_parcelas > 1 && (
                      <p className="text-xs text-slate-400 mt-0.5">ou até {produtoDetalhe.max_parcelas}x no cartão</p>
                    )}
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-lg border ${
                    produtoDetalhe.estoque > 5 ? "bg-green-50 text-green-700 border-green-200" :
                    produtoDetalhe.estoque > 0 ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-red-50 text-red-600 border-red-200"
                  }`}>
                    {produtoDetalhe.estoque > 0 ? `${produtoDetalhe.estoque} disponíveis` : "Esgotado"}
                  </span>
                </div>
                <button
                  disabled={produtoDetalhe.estoque === 0}
                  onClick={() => { adicionarAoCarrinho(produtoDetalhe); setProdutoDetalhe(null); }}
                  className="mt-4 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  {produtoDetalhe.estoque === 0 ? "Produto esgotado" : "Adicionar ao carrinho"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!videoAberto} onOpenChange={(o) => !o && setVideoAberto(null)}>
        <DialogContent className="w-[95vw] sm:max-w-2xl p-0 overflow-hidden bg-white border-slate-200" aria-describedby={undefined}>
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-slate-800">{videoAberto?.titulo}</DialogTitle>
          </DialogHeader>
          {embedUrl && (
            <div className="aspect-video w-full">
              <iframe
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {videoAberto?.descricao && (
            <p className="px-4 py-3 text-sm text-slate-500 border-t border-slate-100">
              {videoAberto.descricao}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════ DRAWER: Carrinho (slide right) ═══════════ */}
      {carrinhoAberto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCarrinhoAberto(false)} />
          <div className="relative w-full sm:max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-600" />
                <h2 className="font-bold text-slate-800 text-lg">Meu Carrinho</h2>
                {qtdCarrinho > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {qtdCarrinho} {qtdCarrinho === 1 ? "item" : "itens"}
                  </span>
                )}
              </div>
              <button onClick={() => setCarrinhoAberto(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              {carrinho.length === 0 ? (
                <div className="py-20 text-center">
                  <ShoppingCart className="mx-auto h-16 w-16 mb-4 text-slate-300" />
                  <p className="font-semibold text-slate-500">Carrinho vazio</p>
                  <p className="text-sm mt-1 text-slate-400">Adicione produtos da Lojinha</p>
                  <button onClick={() => { setCarrinhoAberto(false); setTab("loja"); }} className="mt-4 text-blue-600 text-sm font-medium hover:underline">
                    Ver produtos →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {carrinho.map((item) => (
                    <div key={item.produto.id} className="flex gap-3 bg-white rounded-xl p-3 border border-slate-200 hover:border-slate-300 transition-colors shadow-sm">
                      {item.produto.url_imagem ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={resolveHubImageUrl(item.produto.url_imagem) ?? ""} alt={item.produto.nome} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          <Package className="h-7 w-7 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">{item.produto.nome}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{fmtBRL(item.produto.preco)} cada</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button onClick={() => alterarQuantidade(item.produto.id, -1)} className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold text-slate-800">{item.quantidade}</span>
                          <button onClick={() => alterarQuantidade(item.produto.id, +1)} disabled={item.quantidade >= item.produto.estoque} className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600 disabled:opacity-40">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <button onClick={() => removerDoCarrinho(item.produto.id)} className="p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <p className="text-sm font-bold text-slate-800">{fmtBRL(item.produto.preco * item.quantidade)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {carrinho.length > 0 && (
              <div className="border-t border-slate-200 p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-slate-500 text-sm">Total</p>
                  <p className="text-2xl font-bold text-slate-800">{fmtBRL(totalCarrinho)}</p>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-base font-semibold rounded-xl shadow-sm" onClick={() => { setCarrinhoAberto(false); setCheckoutAberto(true); }}>
                  Finalizar Compra <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <button onClick={() => setCarrinho([])} className="w-full text-xs text-slate-400 hover:text-red-500 py-1 transition-colors">
                  Limpar carrinho
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: Checkout ═══════════ */}
      <Dialog open={checkoutAberto} onOpenChange={setCheckoutAberto}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white border-slate-200" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-slate-800">Finalizar Pedido</DialogTitle>
          </DialogHeader>

          {/* Resumo */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-sm border border-slate-200">
            {carrinho.map((item) => (
              <div key={item.produto.id} className="flex justify-between">
                <span className="text-slate-600">{item.produto.nome} × {item.quantidade}</span>
                <span className="font-medium text-slate-800">{fmtBRL(item.produto.preco * item.quantidade)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold">
              <span className="text-slate-600">Total</span>
              <span className="text-blue-600">{fmtBRL(totalCarrinho)}</span>
            </div>
          </div>

          {/* Método */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { key: "PIX", label: "PIX", Icon: QrCode },
                  { key: "BOLETO", label: "Boleto", Icon: FileText },
                  { key: "CARTAO", label: "Cartão", Icon: CreditCard },
                ] as {
                  key: MetodoPagamento;
                  label: string;
                  Icon: React.ElementType;
                }[]
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setMetodo(key);
                    if (key !== "CARTAO") setParcelas(1);
                  }}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    metodo === key
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Parcelas (somente cartão, && algum produto permite) */}
            {metodo === "CARTAO" &&
              carrinho.some((i) => i.produto.permite_parcelamento) && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-slate-700">Parcelas</label>
                  <select
                    value={parcelas}
                    onChange={(e) => setParcelas(Number(e.target.value))}
                    className="mt-1 w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from(
                      {
                        length: Math.max(
                          ...carrinho
                            .filter((i) => i.produto.permite_parcelamento)
                            .map((i) => i.produto.max_parcelas)
                        ),
                      },
                      (_, idx) => idx + 1
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}× de {fmtBRL(totalCarrinho / n)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-50"
              onClick={() => setCheckoutAberto(false)}
            >
              Voltar
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={criarPedidoMutation.isPending}
              onClick={() => criarPedidoMutation.mutate()}
            >
              {criarPedidoMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar Pedido"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ MODAL: Pagamento (Rykon Pay) ═══════════ */}
      <ProcessarPagamentoModal
        fatura={faturaParaPagar}
        open={modalPagamentoOpen}
        onClose={() => setModalPagamentoOpen(false)}
        onSuccess={() => {
          setModalPagamentoOpen(false);
          setPagamentoConfirmado(true);
          queryClient.invalidateQueries({ queryKey: ["hub-produtos"] });
        }}
      />
    </div>
  );
}
