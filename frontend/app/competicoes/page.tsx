"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useFranqueadoProtection } from "@/hooks/useFranqueadoProtection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Trophy,
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Award,
  TrendingUp,
  X,
  Save,
  ChevronLeft,
} from "lucide-react";
import { http } from "@/lib/api";

interface Competicao {
  id: string;
  nome: string;
  tipo: string;
  modalidade: string;
  data_inicio: string;
  local: string;
  cidade: string;
  estado: string;
  status: string;
}

interface MinhaParticipacao {
  id: string;
  competicao: Competicao;
  categoria_peso: string;
  categoria_idade: string;
  categoria_faixa: string;
  colocacao: number | null;
  posicao: string;
  total_lutas: number;
  vitorias: number;
  derrotas: number;
  observacoes: string;
  medalha_emoji: string;
  aproveitamento: number;
}

interface Estatisticas {
  totalCompeticoes: number;
  totalOuros: number;
  totalPratas: number;
  totalBronzes: number;
  totalPodios: number;
  totalLutas: number;
  totalVitorias: number;
  totalDerrotas: number;
  aproveitamento: number;
}

export default function CompeticoesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [participacoes, setParticipacoes] = useState<MinhaParticipacao[]>([]);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);
  const [faixaAtualAluno, setFaixaAtualAluno] = useState<string | null>(null);

  // Estados do Brasil com bandeiras
  const estados = [
    { sigla: "AC", nome: "Acre", emoji: "🌳" },
    { sigla: "AL", nome: "Alagoas", emoji: "🏖️" },
    { sigla: "AP", nome: "Amapá", emoji: "🌴" },
    { sigla: "AM", nome: "Amazonas", emoji: "🌿" },
    { sigla: "BA", nome: "Bahia", emoji: "🥥" },
    { sigla: "CE", nome: "Ceará", emoji: "⛱️" },
    { sigla: "DF", nome: "Distrito Federal", emoji: "🏛️" },
    { sigla: "ES", nome: "Espírito Santo", emoji: "⛰️" },
    { sigla: "GO", nome: "Goiás", emoji: "🌾" },
    { sigla: "MA", nome: "Maranhão", emoji: "🏝️" },
    { sigla: "MT", nome: "Mato Grosso", emoji: "🌻" },
    { sigla: "MS", nome: "Mato Grosso do Sul", emoji: "🦜" },
    { sigla: "MG", nome: "Minas Gerais", emoji: "⛏️" },
    { sigla: "PA", nome: "Pará", emoji: "🌳" },
    { sigla: "PB", nome: "Paraíba", emoji: "🌴" },
    { sigla: "PR", nome: "Paraná", emoji: "🌲" },
    { sigla: "PE", nome: "Pernambuco", emoji: "🎭" },
    { sigla: "PI", nome: "Piauí", emoji: "🏜️" },
    { sigla: "RJ", nome: "Rio de Janeiro", emoji: "🏔️" },
    { sigla: "RN", nome: "Rio Grande do Norte", emoji: "🌵" },
    { sigla: "RS", nome: "Rio Grande do Sul", emoji: "🧉" },
    { sigla: "RO", nome: "Rondônia", emoji: "🌳" },
    { sigla: "RR", nome: "Roraima", emoji: "⛰️" },
    { sigla: "SC", nome: "Santa Catarina", emoji: "❄️" },
    { sigla: "SP", nome: "São Paulo", emoji: "🏙️" },
    { sigla: "SE", nome: "Sergipe", emoji: "🥥" },
    { sigla: "TO", nome: "Tocantins", emoji: "🏞️" },
  ];

  // Form state
  const [formData, setFormData] = useState({
    competicaoId: "",
    nomeCompeticao: "",
    tipo: "LOCAL",
    modalidade: "GI",
    data: "",
    local: "",
    cidade: "",
    estado: "",
    categoria_peso: "",
    categoria_idade: "",
    categoria_faixa: "",
    posicao: "PARTICIPOU",
    colocacao: "",
    total_lutas: "",
    vitorias: "",
    derrotas: "",
    observacoes: "",
  });

  const [erroLutas, setErroLutas] = useState("");

  // Função para obter as cores da faixa
  const getFaixaColors = (faixa: string) => {
    const faixaUpper = faixa?.toUpperCase() || "";
    const colorMap: {
      [key: string]: { bg: string; text: string; border: string };
    } = {
      BRANCA: {
        bg: "bg-white",
        text: "text-gray-800",
        border: "border-gray-300",
      },
      CINZA: {
        bg: "bg-gray-400",
        text: "text-white",
        border: "border-gray-500",
      },
      AMARELA: {
        bg: "bg-yellow-400",
        text: "text-gray-800",
        border: "border-yellow-500",
      },
      LARANJA: {
        bg: "bg-orange-400",
        text: "text-white",
        border: "border-orange-500",
      },
      VERDE: {
        bg: "bg-green-500",
        text: "text-white",
        border: "border-green-600",
      },
      AZUL: {
        bg: "bg-blue-500",
        text: "text-white",
        border: "border-blue-600",
      },
      ROXA: {
        bg: "bg-purple-500",
        text: "text-white",
        border: "border-purple-600",
      },
      MARROM: {
        bg: "bg-yellow-800",
        text: "text-white",
        border: "border-yellow-900",
      },
      PRETA: { bg: "bg-black", text: "text-white", border: "border-gray-900" },
      CORAL: { bg: "bg-red-600", text: "text-white", border: "border-red-700" },
    };
    return (
      colorMap[faixaUpper] || {
        bg: "bg-purple-100",
        text: "text-purple-700",
        border: "border-purple-200",
      }
    );
  };

  // Ordem de progressão das faixas (adulto e infantil)
  const ordemFaixas: string[] = [
    "BRANCA",
    "CINZA",
    "AMARELA",
    "LARANJA",
    "VERDE",
    "AZUL",
    "ROXA",
    "MARROM",
    "PRETA",
    "CORAL",
  ];

  // Função para obter faixas válidas (até a faixa atual do aluno)
  const getFaixasValidas = () => {
    if (!faixaAtualAluno) return ordemFaixas;

    const faixaAtualIndex = ordemFaixas.findIndex(
      (f) => f === faixaAtualAluno.toUpperCase()
    );

    if (faixaAtualIndex === -1) return ordemFaixas;

    // Retorna apenas faixas até a faixa atual (inclusive)
    return ordemFaixas.slice(0, faixaAtualIndex + 1);
  };

  useEffect(() => {
    if (user?.id) {
      carregarDados();
      carregarFaixaAtual();
    }
  }, [user?.id]);

  const carregarFaixaAtual = async () => {
    try {
      const response = await http("/alunos/me", { auth: true });
      if (response.faixa_atual) {
        setFaixaAtualAluno(response.faixa_atual);
      }
    } catch (error) {
      console.error("Erro ao carregar faixa do aluno:", error);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await http("/competicoes/meu-historico", { auth: true });

      setParticipacoes(response.participacoes || []);
      setEstatisticas(response.estatisticas || null);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const carregarCidades = async (uf: string) => {
    if (!uf) {
      setCidades([]);
      return;
    }

    try {
      setLoadingCidades(true);
      const response = await fetch(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
      );
      const data = await response.json();
      const nomeCidades = data
        .map((cidade: { nome: string }) => cidade.nome)
        .sort((a: string, b: string) =>
          a.localeCompare(b, "pt-BR", { sensitivity: "base" })
        );
      setCidades(nomeCidades);
    } catch (error) {
      console.error("Erro ao carregar cidades:", error);
      setCidades([]);
    } finally {
      setLoadingCidades(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Primeiro, criar ou atualizar a competição
      let competicaoId: string;

      if (editando && formData.competicaoId) {
        // Se está editando, atualizar a competição existente
        await http(`/competicoes/${formData.competicaoId}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify({
            nome: formData.nomeCompeticao,
            tipo: formData.tipo,
            modalidade: formData.modalidade,
            data_inicio: formData.data,
            local: formData.local,
            cidade: formData.cidade,
            estado: formData.estado,
            status: "FINALIZADA",
          }),
        });
        competicaoId = formData.competicaoId;
      } else {
        // Verificar se já existe uma competição com esse nome
        const competicoesResponse = await http(
          `/competicoes?nome=${encodeURIComponent(formData.nomeCompeticao)}`,
          { auth: true }
        );

        if (competicoesResponse && competicoesResponse.length > 0) {
          competicaoId = competicoesResponse[0].id;
        } else {
          // Criar nova competição
          const novaCompeticao = await http("/competicoes", {
            method: "POST",
            auth: true,
            body: JSON.stringify({
              nome: formData.nomeCompeticao,
              tipo: formData.tipo,
              modalidade: formData.modalidade,
              data_inicio: formData.data,
              local: formData.local,
              cidade: formData.cidade,
              estado: formData.estado,
              status: "FINALIZADA",
            }),
          });
          competicaoId = novaCompeticao.id;
        }
      }

      // Agora criar a participação
      const participacaoData = {
        competicao_id: competicaoId,
        categoria_peso: formData.categoria_peso,
        categoria_idade: formData.categoria_idade,
        categoria_faixa: formData.categoria_faixa,
        posicao: formData.posicao,
        colocacao: formData.colocacao ? parseInt(formData.colocacao) : null,
        total_lutas: formData.total_lutas ? parseInt(formData.total_lutas) : 0,
        vitorias: formData.vitorias ? parseInt(formData.vitorias) : 0,
        derrotas: formData.derrotas ? parseInt(formData.derrotas) : 0,
        observacoes: formData.observacoes,
      };

      if (editando) {
        await http(`/competicoes/participacao/${editando}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify(participacaoData),
        });
      } else {
        await http("/competicoes/participacao", {
          method: "POST",
          auth: true,
          body: JSON.stringify(participacaoData),
        });
      }

      // Recarregar dados
      await carregarDados();

      // Resetar form
      setShowForm(false);
      setEditando(null);
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao salvar participação";
      alert(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      competicaoId: "",
      nomeCompeticao: "",
      tipo: "LOCAL",
      modalidade: "GI",
      data: "",
      local: "",
      cidade: "",
      estado: "",
      categoria_peso: "",
      categoria_idade: "",
      categoria_faixa: "",
      posicao: "PARTICIPOU",
      colocacao: "",
      total_lutas: "",
      vitorias: "",
      derrotas: "",
      observacoes: "",
    });
  };

  const handleEditar = (participacao: MinhaParticipacao) => {
    setFormData({
      competicaoId: participacao.competicao.id,
      nomeCompeticao: participacao.competicao.nome,
      tipo: participacao.competicao.tipo,
      modalidade: participacao.competicao.modalidade,
      data: participacao.competicao.data_inicio,
      local: participacao.competicao.local || "",
      cidade: participacao.competicao.cidade || "",
      estado: participacao.competicao.estado || "",
      categoria_peso: participacao.categoria_peso || "",
      categoria_idade: participacao.categoria_idade || "",
      categoria_faixa: participacao.categoria_faixa || "",
      posicao: participacao.posicao,
      colocacao: participacao.colocacao?.toString() || "",
      total_lutas: participacao.total_lutas?.toString() || "",
      vitorias: participacao.vitorias?.toString() || "",
      derrotas: participacao.derrotas?.toString() || "",
      observacoes: participacao.observacoes || "",
    });
    setEditando(participacao.id);
    setShowForm(true);
  };

  const handleDeletar = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta participação?")) {
      return;
    }

    try {
      await http(`/competicoes/participacao/${id}`, {
        method: "DELETE",
        auth: true,
      });
      await carregarDados();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      alert("Erro ao remover participação");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm sm:text-base">Voltar</span>
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  Minhas Competições
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Gerencie seu histórico de campeonatos
                </p>
              </div>
            </div>

            {!showForm && (
              <button
                onClick={() => {
                  resetForm();
                  setEditando(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Adicionar Competição</span>
                <span className="sm:hidden">Nova Competição</span>
              </button>
            )}
          </div>
        </div>

        {/* Estatísticas */}
        {estatisticas && estatisticas.totalCompeticoes > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  Total de Competições
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {estatisticas.totalCompeticoes}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {estatisticas.totalPodios} pódios
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  Medalhas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="flex gap-2 sm:gap-3 text-lg sm:text-2xl font-bold">
                  <span className="text-yellow-500">
                    🥇 {estatisticas.totalOuros}
                  </span>
                  <span className="text-gray-400">
                    🥈 {estatisticas.totalPratas}
                  </span>
                  <span className="text-amber-700">
                    🥉 {estatisticas.totalBronzes}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  Lutas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">
                  {estatisticas.totalLutas}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {estatisticas.totalVitorias}V / {estatisticas.totalDerrotas}D
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">
                  Aproveitamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">
                  {estatisticas.aproveitamento}%
                </div>
                <p className="text-xs text-gray-500 mt-1">Taxa de vitória</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <Card className="mb-6 sm:mb-8">
            <CardHeader className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg md:text-xl">
                  {editando ? "Editar" : "Adicionar"} Competição
                </CardTitle>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditando(null);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Informações da Competição */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
                    Informações da Competição
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium mb-2">
                        Nome da Competição *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nomeCompeticao}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            nomeCompeticao: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Copa TeamCruz 2025"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">
                        Tipo *
                      </label>
                      <select
                        required
                        value={formData.tipo}
                        onChange={(e) =>
                          setFormData({ ...formData, tipo: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="LOCAL">Local</option>
                        <option value="REGIONAL">Regional</option>
                        <option value="ESTADUAL">Estadual</option>
                        <option value="NACIONAL">Nacional</option>
                        <option value="INTERNACIONAL">Internacional</option>
                        <option value="INTERNO">Interno</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">
                        Modalidade *
                      </label>
                      <select
                        required
                        value={formData.modalidade}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            modalidade: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="GI">Gi (Com Kimono)</option>
                        <option value="NO_GI">No-Gi (Sem Kimono)</option>
                        <option value="AMBOS">Ambos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">
                        Data *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.data}
                        min="1900-01-01"
                        max="2099-12-31"
                        onKeyDown={(e) => {
                          // Previne entrada de valores que tornariam a data inválida
                          const input = e.currentTarget;
                          const value = input.value;

                          // Se já tem uma data completa e válida, previne mais digitação
                          if (value && value.length >= 10) {
                            const year = parseInt(value.split("-")[0]);
                            if (year >= 1000 && year <= 9999) {
                              // Permite apenas teclas de navegação
                              if (
                                ![
                                  "Backspace",
                                  "Delete",
                                  "Tab",
                                  "ArrowLeft",
                                  "ArrowRight",
                                ].includes(e.key)
                              ) {
                                e.preventDefault();
                              }
                            }
                          }
                        }}
                        onInput={(e) => {
                          const input = e.currentTarget;
                          const value = input.value;

                          // Valida o formato e limita o ano
                          if (value) {
                            const parts = value.split("-");
                            if (parts[0] && parts[0].length > 4) {
                              // Corta o ano para 4 dígitos
                              const fixedValue =
                                parts[0].substring(0, 4) +
                                "-" +
                                (parts[1] || "") +
                                (parts[2] ? "-" + parts[2] : "");
                              input.value = fixedValue;
                              setFormData({ ...formData, data: fixedValue });
                              return;
                            }

                            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                              input.setCustomValidity(
                                "Data inválida. Use o formato AAAA-MM-DD com ano de 4 dígitos."
                              );
                            } else {
                              input.setCustomValidity("");
                            }
                          }
                        }}
                        onChange={(e) => {
                          let value = e.target.value;
                          // Garante que o ano tenha no máximo 4 dígitos
                          if (value) {
                            const parts = value.split("-");
                            if (parts[0] && parts[0].length > 4) {
                              value =
                                parts[0].substring(0, 4) +
                                "-" +
                                (parts[1] || "") +
                                (parts[2] ? "-" + parts[2] : "");
                            }
                          }
                          setFormData({ ...formData, data: value });
                        }}
                        className="w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">
                        Local
                      </label>
                      <input
                        type="text"
                        value={formData.local}
                        onChange={(e) =>
                          setFormData({ ...formData, local: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: Ginásio Municipal"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">
                        Estado
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(e) => {
                          const uf = e.target.value;
                          setFormData({
                            ...formData,
                            estado: uf,
                            cidade: "", // Limpa a cidade ao mudar o estado
                          });
                          carregarCidades(uf);
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione o estado</option>
                        {estados.map((estado) => (
                          <option key={estado.sigla} value={estado.sigla}>
                            {estado.emoji} {estado.nome} - {estado.sigla}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Cidade
                      </label>
                      <select
                        value={formData.cidade}
                        onChange={(e) =>
                          setFormData({ ...formData, cidade: e.target.value })
                        }
                        disabled={!formData.estado || loadingCidades}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {!formData.estado
                            ? "Selecione primeiro o estado"
                            : loadingCidades
                            ? "Carregando cidades..."
                            : "Selecione a cidade"}
                        </option>
                        {cidades.map((cidade) => (
                          <option key={cidade} value={cidade}>
                            {cidade}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Categoria e Resultado */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Minha Participação
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        🏋️‍♂️ Categoria de Peso
                      </label>
                      <select
                        value={formData.categoria_peso}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            categoria_peso: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione a categoria de peso</option>
                        <option value="GALO">🐓 GALO</option>
                        <option value="PLUMA">🍃 PLUMA</option>
                        <option value="PENA">🪶 PENA</option>
                        <option value="LEVE">⚖️ LEVE</option>
                        <option value="MÉDIO">🪵 MÉDIO</option>
                        <option value="MEIO-PESADO">💪 MEIO-PESADO</option>
                        <option value="PESADO">🦾 PESADO</option>
                        <option value="SUPER PESADO">🪨 SUPER PESADO</option>
                        <option value="PESADÍSSIMO">🦍 PESADÍSSIMO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        🔠 Categoria de Idade
                      </label>
                      <select
                        value={formData.categoria_idade}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            categoria_idade: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione a categoria de idade</option>
                        <option value="PRÉ MIRIM">
                          PRÉ MIRIM (4 e 5 anos)
                        </option>
                        <option value="MIRIM">MIRIM (6 e 7 anos)</option>
                        <option value="INFANTIL A">
                          INFANTIL A (8 e 9 anos)
                        </option>
                        <option value="INFANTIL B">
                          INFANTIL B (10 e 11 anos)
                        </option>
                        <option value="INFANTO A">
                          INFANTO A (12 e 13 anos)
                        </option>
                        <option value="INFANTO B">
                          INFANTO B (14 e 15 anos)
                        </option>
                        <option value="JUVENIL">JUVENIL (16 e 17 anos)</option>
                        <option value="ADULTO">ADULTO (18 até 29 anos)</option>
                        <option value="MASTER 1">
                          MASTER 1 (30 até 35 anos)
                        </option>
                        <option value="MASTER 2">
                          MASTER 2 (36 até 40 anos)
                        </option>
                        <option value="MASTER 3">
                          MASTER 3 (41 até 45 anos)
                        </option>
                        <option value="MASTER 4">
                          MASTER 4 (46 até 50 anos)
                        </option>
                        <option value="MASTER 5">
                          MASTER 5 (51 até 55 anos)
                        </option>
                        <option value="MASTER 6">
                          MASTER 6 (Acima de 56 anos)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        🥋 Faixa Competida
                      </label>
                      <select
                        value={formData.categoria_faixa}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            categoria_faixa: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione a faixa</option>
                        {getFaixasValidas().map((faixa) => {
                          const emojis: Record<string, string> = {
                            BRANCA: "⚪",
                            CINZA: "⚫",
                            AMARELA: "🟡",
                            LARANJA: "🟠",
                            VERDE: "🟢",
                            AZUL: "🔵",
                            ROXA: "🟣",
                            MARROM: "🟤",
                            PRETA: "⚫",
                            CORAL: "🔴",
                          };
                          return (
                            <option key={faixa} value={faixa}>
                              {emojis[faixa]} {faixa}
                            </option>
                          );
                        })}
                      </select>
                      {faixaAtualAluno && (
                        <p className="text-xs text-gray-500 mt-1">
                          Sua faixa atual: {faixaAtualAluno.toUpperCase()}. Só
                          pode competir até esta faixa.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        🎖️ Posição *
                      </label>
                      <select
                        required
                        value={formData.posicao}
                        onChange={(e) =>
                          setFormData({ ...formData, posicao: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="OURO">🥇 1º Lugar (Ouro)</option>
                        <option value="PRATA">🥈 2º Lugar (Prata)</option>
                        <option value="BRONZE">🥉 3º Lugar (Bronze)</option>
                        <option value="PARTICIPOU">Participou</option>
                        <option value="DESCLASSIFICADO">Desclassificado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        🏆 Meu Ranking
                      </label>
                      <input
                        type="text"
                        value={formData.colocacao}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, ""); // Remove tudo que não é número
                          if (value.length > 3) {
                            value = value.slice(0, 3); // Limita a 3 dígitos
                          }
                          setFormData({
                            ...formData,
                            colocacao: value,
                          });
                        }}
                        onBlur={(e) => {
                          // Adiciona o º ao sair do campo se houver valor
                          const value = e.target.value.replace(/\D/g, "");
                          if (value) {
                            setFormData({
                              ...formData,
                              colocacao: value,
                            });
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 1, 2, 3..."
                        maxLength={3}
                      />
                      {formData.colocacao && (
                        <div className="mt-1 text-sm text-gray-600">
                          Você ficou em:{" "}
                          <span className="font-semibold text-blue-600">
                            {formData.colocacao}º lugar
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        📊 Total de Lutas
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={formData.total_lutas}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (
                            value === "" ||
                            (parseInt(value) >= 0 && parseInt(value) <= 999)
                          ) {
                            setFormData({
                              ...formData,
                              total_lutas: value,
                            });
                          }
                        }}
                        onInput={(e) => {
                          const input = e.currentTarget;
                          if (input.value.length > 3) {
                            input.value = input.value.slice(0, 3);
                          }
                        }}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        ✅ Vitórias
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={formData.vitorias}
                        onChange={(e) => {
                          const value = e.target.value;
                          const totalLutas =
                            parseInt(formData.total_lutas) || 0;
                          const derrotas = parseInt(formData.derrotas) || 0;
                          const vitorias = parseInt(value) || 0;

                          if (
                            value === "" ||
                            (vitorias >= 0 && vitorias <= 999)
                          ) {
                            // Verifica se vitórias + derrotas não ultrapassa o total de lutas
                            if (
                              totalLutas > 0 &&
                              vitorias + derrotas > totalLutas
                            ) {
                              setErroLutas(
                                `Vitórias + Derrotas não podem ultrapassar o Total de Lutas (${totalLutas})`
                              );
                              return;
                            }
                            setErroLutas("");
                            setFormData({ ...formData, vitorias: value });
                          }
                        }}
                        onInput={(e) => {
                          const input = e.currentTarget;
                          if (input.value.length > 3) {
                            input.value = input.value.slice(0, 3);
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          erroLutas ? "border-red-500" : ""
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Derrotas
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={formData.derrotas}
                        onChange={(e) => {
                          const value = e.target.value;
                          const totalLutas =
                            parseInt(formData.total_lutas) || 0;
                          const vitorias = parseInt(formData.vitorias) || 0;
                          const derrotas = parseInt(value) || 0;

                          if (
                            value === "" ||
                            (derrotas >= 0 && derrotas <= 999)
                          ) {
                            // Verifica se vitórias + derrotas não ultrapassa o total de lutas
                            if (
                              totalLutas > 0 &&
                              vitorias + derrotas > totalLutas
                            ) {
                              setErroLutas(
                                `Vitórias + Derrotas não podem ultrapassar o Total de Lutas (${totalLutas})`
                              );
                              return;
                            }
                            setErroLutas("");
                            setFormData({ ...formData, derrotas: value });
                          }
                        }}
                        onInput={(e) => {
                          const input = e.currentTarget;
                          if (input.value.length > 3) {
                            input.value = input.value.slice(0, 3);
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          erroLutas ? "border-red-500" : ""
                        }`}
                      />
                      {erroLutas && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-600 font-medium">
                            ⚠️ {erroLutas}
                          </p>
                        </div>
                      )}
                      {!erroLutas &&
                        formData.total_lutas &&
                        parseInt(formData.vitorias || "0") +
                          parseInt(formData.derrotas || "0") >
                          0 && (
                          <div className="mt-1 text-sm text-gray-600">
                            Total:{" "}
                            {parseInt(formData.vitorias || "0") +
                              parseInt(formData.derrotas || "0")}{" "}
                            de {formData.total_lutas} lutas
                            {parseInt(formData.vitorias || "0") +
                              parseInt(formData.derrotas || "0") ===
                              parseInt(formData.total_lutas) && (
                              <span className="text-green-600 ml-2">✓</span>
                            )}
                          </div>
                        )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium mb-2">
                        Observações
                      </label>
                      <textarea
                        rows={3}
                        value={formData.observacoes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            observacoes: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Adicione observações sobre sua participação..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditando(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm sm:text-base border rounded-lg hover:bg-gray-50 order-2 sm:order-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 order-1 sm:order-2"
                  >
                    <Save className="h-4 w-4" />
                    {editando ? "Atualizar" : "Salvar"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Participações */}
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">
              Histórico de Participações
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {participacoes.length > 0
                ? `${participacoes.length} competição${
                    participacoes.length > 1 ? "ões" : ""
                  } registrada${participacoes.length > 1 ? "s" : ""}`
                : "Nenhuma competição registrada ainda"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {loading ? (
              <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500">
                Carregando...
              </div>
            ) : participacoes.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">
                  Você ainda não registrou nenhuma competição
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Adicionar Primeira Competição
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {participacoes.map((part) => (
                  <div
                    key={part.id}
                    className="border rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex gap-3 sm:gap-4 flex-1 w-full">
                        <div className="text-4xl sm:text-5xl flex-shrink-0">
                          {part.medalha_emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold break-words">
                            {part.competicao.nome}
                          </h3>
                          <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 text-xs sm:text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="truncate">
                                {part.competicao.tipo}
                              </span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                              {new Date(
                                part.competicao.data_inicio
                              ).toLocaleDateString("pt-BR")}
                            </span>
                            {part.competicao.cidade && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {part.competicao.cidade}
                                  {part.competicao.estado &&
                                    ` - ${part.competicao.estado}`}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {part.categoria_peso && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                {part.categoria_peso}
                              </span>
                            )}
                            {part.categoria_faixa && (
                              <span
                                className={`px-2 py-1 rounded text-xs border ${
                                  getFaixaColors(part.categoria_faixa).bg
                                } ${
                                  getFaixaColors(part.categoria_faixa).text
                                } ${
                                  getFaixaColors(part.categoria_faixa).border
                                }`}
                              >
                                {part.categoria_faixa}
                              </span>
                            )}
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                part.posicao === "OURO"
                                  ? "bg-yellow-400 text-yellow-900 border border-yellow-600"
                                  : part.posicao === "PRATA"
                                  ? "bg-gray-300 text-gray-800 border border-gray-400"
                                  : part.posicao === "BRONZE"
                                  ? "bg-amber-700 text-amber-50 border border-amber-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {part.posicao}
                            </span>
                          </div>
                          {part.total_lutas > 0 && (
                            <div className="mt-2 text-xs sm:text-sm flex items-center gap-1 flex-wrap">
                              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                              <span className="font-semibold text-green-600">
                                {part.vitorias}V
                              </span>
                              <span className="text-gray-400">/</span>
                              <span className="font-semibold text-red-600">
                                {part.derrotas}D
                              </span>
                              <span className="text-gray-400">-</span>
                              <span
                                className={`font-semibold ${
                                  part.aproveitamento >= 70
                                    ? "text-green-600"
                                    : part.aproveitamento >= 50
                                    ? "text-yellow-600"
                                    : "text-red-600"
                                }`}
                              >
                                {part.aproveitamento}% de aproveitamento
                              </span>
                            </div>
                          )}
                          {part.observacoes && (
                            <p className="mt-2 text-xs sm:text-sm text-gray-600 italic break-words">
                              {part.observacoes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleEditar(part)}
                          className="flex-1 sm:flex-none p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => handleDeletar(part.id)}
                          className="flex-1 sm:flex-none p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4 mx-auto" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
