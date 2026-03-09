import { http, API_BASE_URL } from "./api";

// ========================== TIPOS ==========================

export interface UnidadeVideo {
  id: string;
  unidade_id: string;
  modalidade_id: string | null;
  titulo: string;
  url_youtube: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  criado_em: string;
  modalidade?: { id: string; nome: string } | null;
}

export interface UnidadeRecado {
  id: string;
  unidade_id: string;
  titulo: string;
  mensagem: string;
  ativo: boolean;
  publicado_em: string;
  criado_em: string;
}

export interface UnidadeProduto {
  id: string;
  unidade_id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  url_imagem: string | null;
  visibilidade: "LOCAL" | "GLOBAL";
  permite_parcelamento: boolean;
  max_parcelas: number;
  estoque: number;
  ativo: boolean;
  criado_em: string;
}

export interface ItemCarrinho {
  produto: UnidadeProduto;
  quantidade: number;
}

export interface FaturaHub {
  id: string;
  numero_fatura: string;
  descricao?: string;
  valor_total: number;
  data_vencimento: string;
  status: string;
  metodo_pagamento?: string;
}

export interface ProdutoPedido {
  id: string;
  aluno_id: string;
  unidade_vendedora_id: string;
  status_pagamento: "PENDENTE" | "APROVADO" | "RECUSADO" | "CANCELADO" | "ESTORNADO";
  metodo_pagamento: "PIX" | "BOLETO" | "CARTAO" | null;
  parcelas: number;
  valor_total_produtos: number;
  taxa_plataforma_split: number;
  valor_liquido_unidade: number;
  transacao_id: string | null;
  pago_em: string | null;
  criado_em: string;
  fatura: FaturaHub | null;
  itens: Array<{
    id: string;
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
    produto: UnidadeProduto;
  }>;
}

export interface StatusRecadosNaoLidos {
  tem: boolean;
  quantidade: number;
}

// ========================== HELPERS ==========================

export function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

export function getThumbnailUrl(url: string): string {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "/placeholder-video.svg";
}

// ========================== API ==========================

export const hubVideosApi = {
  listar: (unidadeId: string): Promise<UnidadeVideo[]> =>
    http(`/hub-unidade/videos/${unidadeId}`, { auth: true }),

  listarAdmin: (unidadeId: string): Promise<UnidadeVideo[]> =>
    http(`/hub-unidade/videos/${unidadeId}/admin`, { auth: true }),

  criar: (data: Omit<UnidadeVideo, "id" | "criado_em" | "modalidade">): Promise<UnidadeVideo> =>
    http("/hub-unidade/videos", { method: "POST", body: data as any, auth: true }),

  atualizar: (id: string, data: Partial<UnidadeVideo>): Promise<UnidadeVideo> =>
    http(`/hub-unidade/videos/${id}`, { method: "PATCH", body: data as any, auth: true }),

  remover: (id: string): Promise<void> =>
    http(`/hub-unidade/videos/${id}`, { method: "DELETE", auth: true }),
};

export const hubRecadosApi = {
  listar: (unidadeId: string): Promise<UnidadeRecado[]> =>
    http(`/hub-unidade/recados/${unidadeId}`, { auth: true }),

  criar: (data: { unidade_id: string; titulo: string; mensagem: string }): Promise<UnidadeRecado> =>
    http("/hub-unidade/recados", { method: "POST", body: data as any, auth: true }),

  atualizar: (id: string, data: Partial<UnidadeRecado>): Promise<UnidadeRecado> =>
    http(`/hub-unidade/recados/${id}`, { method: "PATCH", body: data as any, auth: true }),

  remover: (id: string): Promise<void> =>
    http(`/hub-unidade/recados/${id}`, { method: "DELETE", auth: true }),

  marcarLido: (recadoId: string): Promise<void> =>
    http(`/hub-unidade/recados/${recadoId}/ler`, { method: "POST", auth: true }),

  verificarNaoLidos: (): Promise<StatusRecadosNaoLidos> =>
    http("/hub-unidade/recados/nao-lidos/status", { auth: true }),
};

export const hubProdutosApi = {
  listar: (unidadeId: string): Promise<UnidadeProduto[]> =>
    http(`/hub-unidade/produtos/${unidadeId}`, { auth: true }),

  listarAdmin: (unidadeId: string): Promise<UnidadeProduto[]> =>
    http(`/hub-unidade/produtos/${unidadeId}/admin`, { auth: true }),

  criar: (data: Omit<UnidadeProduto, "id" | "criado_em">): Promise<UnidadeProduto> =>
    http("/hub-unidade/produtos", { method: "POST", body: data as any, auth: true }),

  atualizar: (id: string, data: Partial<UnidadeProduto>): Promise<UnidadeProduto> =>
    http(`/hub-unidade/produtos/${id}`, { method: "PATCH", body: data as any, auth: true }),

  remover: (id: string): Promise<void> =>
    http(`/hub-unidade/produtos/${id}`, { method: "DELETE", auth: true }),
};

export const hubPedidosApi = {
  criar: (data: {
    itens: Array<{ produto_id: string; quantidade: number }>;
    metodo_pagamento: "PIX" | "BOLETO" | "CARTAO";
    parcelas?: number;
  }): Promise<ProdutoPedido> =>
    http("/hub-unidade/pedidos", { method: "POST", body: data as any, auth: true }),

  meusPedidos: (): Promise<ProdutoPedido[]> =>
    http("/hub-unidade/pedidos/meus", { auth: true }),

  pedidosUnidade: (unidadeId: string): Promise<ProdutoPedido[]> =>
    http(`/hub-unidade/pedidos/unidade/${unidadeId}`, { auth: true }),

  aprovar: (pedidoId: string): Promise<ProdutoPedido> =>
    http(`/hub-unidade/pedidos/${pedidoId}/aprovar`, { method: "POST", body: {}, auth: true }),

  cancelar: (pedidoId: string): Promise<ProdutoPedido> =>
    http(`/hub-unidade/pedidos/${pedidoId}/cancelar`, { method: "POST", body: {}, auth: true }),
};

export async function uploadImagemProduto(file: File): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/hub-unidade/upload-imagem`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao enviar imagem");
  const data = await res.json();
  return (data as { url: string }).url;
}

/** Resolve a stored hub image URL to a full URL (handles both relative /hub-unidade/... and absolute https://...) */
export function resolveHubImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  // relative path — prefix with API base
  return `${API_BASE_URL}${url.startsWith("/") ? url : "/" + url}`;
}
