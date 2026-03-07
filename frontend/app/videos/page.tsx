"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  videosApi,
  VideoTreinamento,
  getYouTubeId,
  getThumbnailUrl,
} from "@/lib/videosApi";
import { Search, Play, MonitorPlay } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getEsporteIcon(tag?: string | null): React.ReactNode {
  const n = (tag ?? "").toLowerCase();
  if (n.includes("muay") || n.includes("kickbox") || n.includes("karate") || n.includes("taekwondo"))
    return <GiHighKick size={16} />;
  if (n.includes("box")) return <GiBoxingGlove size={16} />;
  if (n.includes("jiu") || n.includes("judo") || n.includes("bjj")) return <GiKimono size={16} />;
  if (n.includes("mma") || n.includes("luta")) return <GiFist size={16} />;
  if (n.includes("yoga") || n.includes("pilates") || n.includes("medita")) return <GiMeditation size={16} />;
  if (n.includes("cross") || n.includes("funcional")) return <GiWeightLiftingUp size={16} />;
  return <GiMuscleUp size={16} />;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoTreinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [tagFiltro, setTagFiltro] = useState<string>("TODOS");
  const [videoAberto, setVideoAberto] = useState<VideoTreinamento | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await videosApi.listar();
      setVideos(data);
    } catch (err) {
      console.error("Erro ao carregar vídeos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const tags = Array.from(
    new Set(videos.map((v) => v.modalidade_tag).filter(Boolean) as string[]),
  ).sort();

  const filtrados = videos.filter((v) => {
    const matchBusca =
      !busca ||
      v.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (v.descricao ?? "").toLowerCase().includes(busca.toLowerCase()) ||
      (v.modalidade_tag ?? "").toLowerCase().includes(busca.toLowerCase());
    const matchTag =
      tagFiltro === "TODOS" || v.modalidade_tag === tagFiltro;
    return matchBusca && matchTag;
  });

  const embedUrl = videoAberto
    ? `https://www.youtube.com/embed/${getYouTubeId(videoAberto.youtube_url)}?autoplay=1&rel=0`
    : null;

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(160deg, #e2e6f3 0%, #eaecf8 40%, #e6e9f5 100%)",
      }}
    >
      {/* Hero header */}
      <div className="bg-linear-to-r from-[#0f172a] via-[#1e3a8a] to-[#312e81] shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <MonitorPlay className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Tutoriais do Sistema
              </h1>
              <p className="text-blue-200 text-sm mt-0.5">
                Como usar as funcionalidades e novidades do sistema
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar vídeos..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
              />
            </div>
          </div>

          {/* Filtros de tag */}
          {tags.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                onClick={() => setTagFiltro("TODOS")}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  tagFiltro === "TODOS"
                    ? "bg-white text-blue-900 border-transparent"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
              >
                Todos
              </button>
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFiltro(tag)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    tagFiltro === tag
                      ? "bg-white text-blue-900 border-transparent"
                      : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                  }`}
                >
                  {getEsporteIcon(tag)}
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white/60 rounded-2xl h-64"
              />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-20 h-20 rounded-3xl bg-white/60 flex items-center justify-center shadow-sm">
              <MonitorPlay className="w-10 h-10 text-blue-300" />
            </div>
            <p className="text-slate-500 font-medium text-lg">
              {videos.length === 0
                ? "Nenhum vídeo disponível ainda"
                : "Nenhum vídeo encontrado com esse filtro"}
            </p>
            {busca || tagFiltro !== "TODOS" ? (
              <button
                onClick={() => {
                  setBusca("");
                  setTagFiltro("TODOS");
                }}
                className="text-blue-600 hover:underline text-sm"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-slate-500 text-sm mb-6">
              {filtrados.length} vídeo{filtrados.length !== 1 ? "s" : ""}{" "}
              encontrado{filtrados.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtrados.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onClick={() => setVideoAberto(video)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal de reprodução */}
      <Dialog
        open={!!videoAberto}
        onOpenChange={(open) => !open && setVideoAberto(null)}
      >
        <DialogContent className="max-w-3xl w-full p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-5 pb-2">
            <DialogTitle className="text-lg font-bold text-slate-800">
              {videoAberto?.titulo}
            </DialogTitle>
            {videoAberto?.descricao && (
              <p className="text-sm text-slate-500 mt-1">
                {videoAberto.descricao}
              </p>
            )}
          </DialogHeader>
          <div className="aspect-video w-full bg-black">
            {embedUrl && (
              <iframe
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
                title={videoAberto?.titulo}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoCard({
  video,
  onClick,
}: {
  video: VideoTreinamento;
  onClick: () => void;
}) {
  const thumbnail = getThumbnailUrl(video.youtube_url);

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white/80 backdrop-blur-sm border border-white/90 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt={video.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://placehold.co/480x270?text=Vídeo";
          }}
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">
          {video.titulo}
        </h3>
        {video.descricao && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
            {video.descricao}
          </p>
        )}
        {video.modalidade_tag && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
            {getEsporteIcon(video.modalidade_tag)}
            {video.modalidade_tag}
          </span>
        )}
      </div>
    </button>
  );
}
