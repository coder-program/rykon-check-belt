"use client";

import React, { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  videosApi,
  VideoTreinamento,
  CriarVideoDto,
  getThumbnailUrl,
  getYouTubeId,
} from "@/lib/videosApi";
import { toast } from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  MonitorPlay,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

const CAMPOS_VAZIOS: CriarVideoDto = {
  titulo: "",
  descricao: "",
  youtube_url: "",
  modalidade_tag: "",
  ativo: true,
  ordem: 0,
};

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoTreinamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // Modal de criar/editar
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<VideoTreinamento | null>(null);
  const [form, setForm] = useState<CriarVideoDto>(CAMPOS_VAZIOS);
  const [salvando, setSalvando] = useState(false);

  // Confirmação de remoção
  const [removendo, setRemovendo] = useState<VideoTreinamento | null>(null);
  const [confirmandoRemoção, setConfirmandoRemocao] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const data = await videosApi.listarTodos();
      setVideos(data);
    } catch (err) {
      toast.error("Erro ao carregar vídeos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirCriar() {
    setEditando(null);
    setForm(CAMPOS_VAZIOS);
    setModalAberto(true);
  }

  function abrirEditar(video: VideoTreinamento) {
    setEditando(video);
    setForm({
      titulo: video.titulo,
      descricao: video.descricao ?? "",
      youtube_url: video.youtube_url,
      modalidade_tag: video.modalidade_tag ?? "",
      ativo: video.ativo,
      ordem: video.ordem,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.youtube_url.trim()) {
      toast.error("Título e URL do YouTube são obrigatórios");
      return;
    }
    try {
      setSalvando(true);
      const payload: CriarVideoDto = {
        ...form,
        descricao: form.descricao?.trim() || undefined,
        modalidade_tag: form.modalidade_tag?.trim() || undefined,
      };
      if (editando) {
        await videosApi.atualizar(editando.id, payload);
        toast.success("Vídeo atualizado!");
      } else {
        await videosApi.criar(payload);
        toast.success("Vídeo adicionado!");
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      toast.error("Erro ao salvar vídeo");
      console.error(err);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarRemocao() {
    if (!removendo) return;
    try {
      setConfirmandoRemocao(true);
      await videosApi.remover(removendo.id);
      toast.success("Vídeo removido");
      setRemovendo(null);
      carregar();
    } catch {
      toast.error("Erro ao remover vídeo");
    } finally {
      setConfirmandoRemocao(false);
    }
  }

  async function toggleAtivo(video: VideoTreinamento) {
    try {
      await videosApi.atualizar(video.id, { ativo: !video.ativo });
      toast.success(video.ativo ? "Vídeo desativado" : "Vídeo ativado");
      carregar();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  }

  const filtrados = videos.filter((v) => {
    const q = busca.toLowerCase();
    return (
      !q ||
      v.titulo.toLowerCase().includes(q) ||
      (v.modalidade_tag ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(160deg, #e2e6f3 0%, #eaecf8 40%, #e6e9f5 100%)",
      }}
    >
      {/* Hero */}
      <div className="bg-linear-to-r from-[#0f172a] via-[#1e3a8a] to-[#312e81] shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                <MonitorPlay className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Tutoriais do Sistema
                </h1>
                <p className="text-blue-200 text-sm mt-0.5">
                  {videos.length} vídeo{videos.length !== 1 ? "s" : ""}{" "}
                  cadastrado{videos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              onClick={abrirCriar}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Vídeo
            </button>
          </div>

          <div className="mt-5 relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar vídeos..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse h-16 bg-white/60 rounded-2xl"
              />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <MonitorPlay className="w-16 h-16 text-blue-200" />
            <p className="text-slate-500 text-lg font-medium">
              {videos.length === 0
                ? "Nenhum vídeo cadastrado ainda"
                : "Nenhum vídeo encontrado"}
            </p>
            <button
              onClick={abrirCriar}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar primeiro vídeo
            </button>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm border border-white/90 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">
                    Vídeo
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide hidden sm:table-cell">
                    Modalidade
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">
                    Ordem
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wide">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((video) => (
                  <tr
                    key={video.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getThumbnailUrl(video.youtube_url)}
                            alt={video.titulo}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (
                                e.target as HTMLImageElement
                              ).src =
                                "https://placehold.co/80x48?text=YT";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate max-w-xs">
                            {video.titulo}
                          </p>
                          {video.descricao && (
                            <p className="text-xs text-slate-500 truncate max-w-xs">
                              {video.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      {video.modalidade_tag ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {video.modalidade_tag}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-sm text-slate-600 font-medium">
                        {video.ordem}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleAtivo(video)}
                        title={video.ativo ? "Desativar" : "Ativar"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          video.ativo
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {video.ativo ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {video.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirEditar(video)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRemovendo(video)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal criar/editar */}
      <Dialog open={modalAberto} onOpenChange={(o) => !salvando && setModalAberto(o)}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800">
              {editando ? "Editar Vídeo" : "Adicionar Vídeo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Ex: Como funciona o Jiu-Jitsu no sistema"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                URL do YouTube <span className="text-red-500">*</span>
              </label>
              <input
                value={form.youtube_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, youtube_url: e.target.value }))
                }
                placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              {form.youtube_url && getYouTubeId(form.youtube_url) && (
                <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getThumbnailUrl(form.youtube_url)}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Descrição
              </label>
              <textarea
                value={form.descricao}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descricao: e.target.value }))
                }
                rows={2}
                placeholder="Breve descrição sobre o conteúdo do vídeo"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Tag de Modalidade
                </label>
                <input
                  value={form.modalidade_tag}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modalidade_tag: e.target.value }))
                  }
                  placeholder="Ex: Jiu-Jitsu"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Ordem
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.ordem}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ordem: Number(e.target.value) }))
                  }
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, ativo: !f.ativo }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  form.ativo ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.ativo ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-slate-700 font-medium">
                {form.ativo ? "Vídeo ativo (visível)" : "Vídeo inativo (oculto)"}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => setModalAberto(false)}
              disabled={salvando}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de remoção */}
      <AlertDialog
        open={!!removendo}
        onOpenChange={(o) => !o && setRemovendo(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover vídeo?</AlertDialogTitle>
            <AlertDialogDescription>
              O vídeo <strong>&ldquo;{removendo?.titulo}&rdquo;</strong> será removido
              permanentemente. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarRemocao}
              disabled={confirmandoRemoção}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {confirmandoRemoção ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </ProtectedRoute>
  );
}
