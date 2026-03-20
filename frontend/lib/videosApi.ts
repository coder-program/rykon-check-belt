import { http } from "./api";

export interface VideoTreinamento {
  id: string;
  titulo: string;
  descricao: string | null;
  youtube_url: string;
  modalidade_tag: string | null;
  ativo: boolean;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

export interface CriarVideoDto {
  titulo: string;
  descricao?: string;
  youtube_url: string;
  modalidade_tag?: string;
  ativo?: boolean;
  ordem?: number;
}

export interface AtualizarVideoDto extends Partial<CriarVideoDto> {}

export function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
  );
  return match ? match[1] : null;
}

export function getThumbnailUrl(youtubeUrl: string): string {
  const id = getYouTubeId(youtubeUrl);
  return id
    ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    : "/placeholder-video.svg";
}

export const videosApi = {
  listar: (): Promise<VideoTreinamento[]> =>
    http("/videos-treinamento", { auth: true }),

  listarTodos: (): Promise<VideoTreinamento[]> =>
    http("/videos-treinamento/admin/todos", { auth: true }),

  criar: (data: CriarVideoDto): Promise<VideoTreinamento> =>
    http("/videos-treinamento", {
      method: "POST",
      body: data as Record<string, unknown>,
      auth: true,
    }),

  atualizar: (id: string, data: AtualizarVideoDto): Promise<VideoTreinamento> =>
    http(`/videos-treinamento/${id}`, {
      method: "PATCH",
      body: data as Record<string, unknown>,
      auth: true,
    }),

  remover: (id: string): Promise<{ success: boolean }> =>
    http(`/videos-treinamento/${id}`, {
      method: "DELETE",
      auth: true,
    }),
};
