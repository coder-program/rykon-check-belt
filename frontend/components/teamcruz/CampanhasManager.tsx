"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Megaphone,
  Plus,
  Calendar,
  Users,
  Target,
  Edit,
  Trash2,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Mail,
  MessageSquare,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Campanha {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "promocao" | "evento" | "graduacao" | "comunicado";
  dataInicio: string;
  dataFim: string;
  canal: "email" | "sms" | "whatsapp" | "push" | "todos";
  segmento:
    | "todos"
    | "iniciantes"
    | "avancados"
    | "criancas"
    | "adultos"
    | "competidores";
  status: "rascunho" | "agendada" | "ativa" | "finalizada";
  enviados: number;
  abertos: number;
  cliques: number;
  imagem?: string;
  botaoCTA?: string;
  linkCTA?: string;
}

const mockCampanhas: Campanha[] = [
  {
    id: "1",
    titulo: "Black Friday TeamCruz",
    descricao: "50% OFF na matrícula + 1º mês grátis para novos alunos",
    tipo: "promocao",
    dataInicio: "2025-11-20",
    dataFim: "2025-11-30",
    canal: "todos",
    segmento: "todos",
    status: "agendada",
    enviados: 0,
    abertos: 0,
    cliques: 0,
    botaoCTA: "MATRICULE-SE AGORA",
    linkCTA: "https://www.lojateamcruz.com.br/matricula",
  },
  {
    id: "2",
    titulo: "Campeonato Interno de Primavera",
    descricao: "Inscrições abertas para o campeonato interno. Vagas limitadas!",
    tipo: "evento",
    dataInicio: "2025-09-01",
    dataFim: "2025-09-15",
    canal: "whatsapp",
    segmento: "competidores",
    status: "ativa",
    enviados: 145,
    abertos: 132,
    cliques: 89,
    botaoCTA: "INSCREVA-SE",
    linkCTA: "https://forms.google.com/campeonato",
  },
  {
    id: "3",
    titulo: "Cerimônia de Graduação - Dezembro",
    descricao: "Convite para a cerimônia de graduação e entrega de faixas",
    tipo: "graduacao",
    dataInicio: "2025-12-10",
    dataFim: "2025-12-10",
    canal: "email",
    segmento: "todos",
    status: "rascunho",
    enviados: 0,
    abertos: 0,
    cliques: 0,
  },
];

const tiposCampanha = [
  {
    value: "promocao",
    label: "Promoção",
    icon: "🎯",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "evento",
    label: "Evento",
    icon: "📅",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "graduacao",
    label: "Graduação",
    icon: "🥋",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "comunicado",
    label: "Comunicado",
    icon: "📢",
    color: "bg-gray-100 text-gray-800",
  },
];

const canaisEnvio = [
  { value: "email", label: "E-mail", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "push", label: "Push", icon: Bell },
  { value: "todos", label: "Todos", icon: Send },
];

export default function CampanhasManager() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState<Campanha | null>(null);
  const [formData, setFormData] = useState<Partial<Campanha>>({
    titulo: "",
    descricao: "",
    tipo: "promocao",
    dataInicio: format(new Date(), "yyyy-MM-dd"),
    dataFim: format(new Date(), "yyyy-MM-dd"),
    canal: "todos",
    segmento: "todos",
    status: "rascunho",
    botaoCTA: "",
    linkCTA: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_API_URL + "/teamcruz/campanhas",
          {
            headers: {
              "Content-Type": "application/json",
              ...(typeof window !== "undefined" && localStorage.getItem("token")
                ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
                : {}),
            },
          }
        );
        const data = await res.json();
        setCampanhas(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        toast.error("Falha ao carregar campanhas");
      }
    };
    load();
  }, []);

  const handleCreateCampanha = () => {
    setEditingCampanha(null);
    setFormData({
      titulo: "",
      descricao: "",
      tipo: "promocao",
      dataInicio: format(new Date(), "yyyy-MM-dd"),
      dataFim: format(new Date(), "yyyy-MM-dd"),
      canal: "todos",
      segmento: "todos",
      status: "rascunho",
      botaoCTA: "",
      linkCTA: "",
    });
    setShowModal(true);
  };

  const handleEditCampanha = (campanha: Campanha) => {
    setEditingCampanha(campanha);
    setFormData(campanha);
    setShowModal(true);
  };

  const handleSaveCampanha = () => {
    if (!formData.titulo || !formData.descricao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const base = process.env.NEXT_PUBLIC_API_URL;
    if (editingCampanha) {
      fetch(base + `/teamcruz/campanhas/${editingCampanha.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify(formData),
      })
        .then((r) => r.json())
        .then((saved) => {
          setCampanhas((prev) =>
            prev.map((c) => (c.id === saved.id ? saved : c))
          );
          toast.success("Campanha atualizada com sucesso!");
          setShowModal(false);
        })
        .catch(() => toast.error("Falha ao atualizar campanha"));
    } else {
      fetch(base + "/teamcruz/campanhas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(typeof window !== "undefined" && localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
        body: JSON.stringify(formData),
      })
        .then((r) => r.json())
        .then((saved) => {
          setCampanhas((prev) => [...prev, saved]);
          toast.success("Campanha criada com sucesso!");
          setShowModal(false);
        })
        .catch(() => toast.error("Falha ao criar campanha"));
    }
  };

  const handleDeleteCampanha = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta campanha?")) {
      const base = process.env.NEXT_PUBLIC_API_URL;
      fetch(base + `/teamcruz/campanhas/${id}`, {
        method: "DELETE",
        headers: {
          ...(typeof window !== "undefined" && localStorage.getItem("token")
            ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
            : {}),
        },
      })
        .then(() => {
          setCampanhas((prev) => prev.filter((c) => c.id !== id));
          toast.success("Campanha excluída com sucesso!");
        })
        .catch(() => toast.error("Falha ao excluir campanha"));
    }
  };

  const handleEnviarCampanha = (campanha: Campanha) => {
    const base = process.env.NEXT_PUBLIC_API_URL;
    fetch(base + `/teamcruz/campanhas/${campanha.id}/enviar`, {
      method: "POST",
      headers: {
        ...(typeof window !== "undefined" && localStorage.getItem("token")
          ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
          : {}),
      },
    })
      .then((r) => r.json())
      .then((updated) => {
        setCampanhas((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        toast.success(`Campanha "${campanha.titulo}" enviada com sucesso!`, {
          duration: 4000,
          icon: "📤",
        });
      })
      .catch(() => toast.error("Falha ao enviar campanha"));
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      rascunho: "badge-ghost",
      agendada: "badge-warning",
      ativa: "badge-success",
      finalizada: "badge-secondary",
    };
    return badges[status as keyof typeof badges] || "badge-ghost";
  };

  const getTipoInfo = (tipo: string) => {
    return tiposCampanha.find((t) => t.value === tipo) || tiposCampanha[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Campanhas e Comunicação
          </h2>
        </div>
        <button
          onClick={handleCreateCampanha}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Campanhas Ativas</p>
                <p className="text-2xl font-bold text-purple-900">
                  {campanhas.filter((c) => c.status === "ativa").length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Agendadas</p>
                <p className="text-2xl font-bold text-blue-900">
                  {campanhas.filter((c) => c.status === "agendada").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Taxa de Abertura</p>
                <p className="text-2xl font-bold text-green-900">68%</p>
              </div>
              <Mail className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Taxa de Cliques</p>
                <p className="text-2xl font-bold text-yellow-900">24%</p>
              </div>
              <Target className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Campanhas */}
      <Card className="bg-white border border-blue-200">
        <CardHeader>
          <CardTitle>Campanhas Criadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campanhas.map((campanha) => {
              const tipoInfo = getTipoInfo(campanha.tipo);
              const taxaAbertura =
                campanha.enviados > 0
                  ? Math.round((campanha.abertos / campanha.enviados) * 100)
                  : 0;
              const taxaCliques =
                campanha.abertos > 0
                  ? Math.round((campanha.cliques / campanha.abertos) * 100)
                  : 0;

              return (
                <motion.div
                  key={campanha.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{tipoInfo.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {campanha.titulo}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {campanha.descricao}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        <span className={`badge ${tipoInfo.color} badge-sm`}>
                          {tipoInfo.label}
                        </span>
                        <span
                          className={`badge ${getStatusBadge(
                            campanha.status
                          )} badge-sm`}
                        >
                          {campanha.status}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(campanha.dataInicio), "dd/MM", {
                            locale: ptBR,
                          })}{" "}
                          -
                          {format(new Date(campanha.dataFim), "dd/MM", {
                            locale: ptBR,
                          })}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campanha.segmento}
                        </span>
                      </div>

                      {campanha.status === "ativa" && campanha.enviados > 0 && (
                        <div className="flex items-center gap-6 mt-3">
                          <div className="text-xs">
                            <span className="text-gray-500">Enviados:</span>
                            <span className="font-medium ml-1">
                              {campanha.enviados}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Abertura:</span>
                            <span className="font-medium ml-1 text-green-600">
                              {taxaAbertura}%
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-500">Cliques:</span>
                            <span className="font-medium ml-1 text-blue-600">
                              {taxaCliques}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {campanha.status === "rascunho" && (
                        <button
                          onClick={() => handleEnviarCampanha(campanha)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Enviar campanha"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEditCampanha(campanha)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampanha(campanha.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {campanhas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma campanha criada ainda</p>
                <button
                  onClick={handleCreateCampanha}
                  className="mt-3 text-purple-600 hover:underline"
                >
                  Criar primeira campanha
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">
                    {editingCampanha ? "Editar Campanha" : "Nova Campanha"}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título da Campanha *
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    value={formData.titulo}
                    onChange={(e) =>
                      setFormData({ ...formData, titulo: e.target.value })
                    }
                    placeholder="Ex: Black Friday TeamCruz"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição *
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-lg"
                    rows={3}
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    placeholder="Descreva o objetivo e conteúdo da campanha"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Campanha
                    </label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      value={formData.tipo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          tipo: e.target.value as any,
                        })
                      }
                    >
                      {tiposCampanha.map((tipo) => (
                        <option key={tipo.value} value={tipo.value}>
                          {tipo.icon} {tipo.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Canal de Envio
                    </label>
                    <select
                      className="w-full p-2 border rounded-lg"
                      value={formData.canal}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          canal: e.target.value as any,
                        })
                      }
                    >
                      {canaisEnvio.map((canal) => (
                        <option key={canal.value} value={canal.value}>
                          {canal.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-lg"
                      value={formData.dataInicio}
                      onChange={(e) =>
                        setFormData({ ...formData, dataInicio: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Fim
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-lg"
                      value={formData.dataFim}
                      onChange={(e) =>
                        setFormData({ ...formData, dataFim: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Segmento
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={formData.segmento}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        segmento: e.target.value as any,
                      })
                    }
                  >
                    <option value="todos">Todos os Alunos</option>
                    <option value="iniciantes">Iniciantes</option>
                    <option value="avancados">Avançados</option>
                    <option value="criancas">Crianças</option>
                    <option value="adultos">Adultos</option>
                    <option value="competidores">Competidores</option>
                  </select>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Call to Action (Opcional)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Texto do Botão
                      </label>
                      <input
                        type="text"
                        className="w-full p-2 border rounded-lg"
                        value={formData.botaoCTA}
                        onChange={(e) =>
                          setFormData({ ...formData, botaoCTA: e.target.value })
                        }
                        placeholder="Ex: INSCREVA-SE AGORA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link de Destino
                      </label>
                      <input
                        type="url"
                        className="w-full p-2 border rounded-lg"
                        value={formData.linkCTA}
                        onChange={(e) =>
                          setFormData({ ...formData, linkCTA: e.target.value })
                        }
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <option value="rascunho">Rascunho</option>
                    <option value="agendada">Agendada</option>
                    <option value="ativa">Ativa</option>
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t bg-gray-50 p-4">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCampanha}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {editingCampanha ? "Salvar Alterações" : "Criar Campanha"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
