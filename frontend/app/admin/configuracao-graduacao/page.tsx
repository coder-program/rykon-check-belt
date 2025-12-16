"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import axios from "axios";

interface ConfigFaixa {
  tempo_minimo_meses: number | null;
  aulas_por_grau: number;
  graus_maximos: number;
}

interface ConfiguracaoGraduacao {
  id: string;
  unidade_id: string;
  unidade?: {
    id: string;
    nome: string;
  };
  config_faixas: {
    [faixaCodigo: string]: ConfigFaixa;
  };
  percentual_frequencia_minima: number;
  created_at: string;
  updated_at: string;
}

interface Unidade {
  id: string;
  nome: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// Lista completa de faixas
const FAIXAS_INFANTIS = [
  { codigo: "BRANCA_INF", nome: "Branca", cor: "#FFFFFF" },
  { codigo: "CINZA_BRANCA_INF", nome: "Cinza e Branca", cor: "#808080" },
  { codigo: "CINZA_INF", nome: "Cinza", cor: "#808080" },
  { codigo: "CINZA_PRETA_INF", nome: "Cinza e Preta", cor: "#808080" },
  { codigo: "AMAR_BRANCA_INF", nome: "Amarela e Branca", cor: "#FFD700" },
  { codigo: "AMARELA_INF", nome: "Amarela", cor: "#FFD700" },
  { codigo: "AMAR_PRETA_INF", nome: "Amarela e Preta", cor: "#FFD700" },
  { codigo: "LARA_BRANCA_INF", nome: "Laranja e Branca", cor: "#FF8C00" },
  { codigo: "LARANJA_INF", nome: "Laranja", cor: "#FF8C00" },
  { codigo: "LARA_PRETA_INF", nome: "Laranja e Preta", cor: "#FF8C00" },
  { codigo: "VERDE_BRANCA_INF", nome: "Verde e Branca", cor: "#008000" },
  { codigo: "VERDE_INF", nome: "Verde", cor: "#008000" },
  { codigo: "VERDE_PRETA_INF", nome: "Verde e Preta", cor: "#008000" },
];

const FAIXAS_ADULTO = [
  { codigo: "BRANCA", nome: "Branca", cor: "#FFFFFF" },
  { codigo: "AZUL", nome: "Azul", cor: "#0000FF" },
  { codigo: "ROXA", nome: "Roxa", cor: "#8B00FF" },
  { codigo: "MARROM", nome: "Marrom", cor: "#8B4513" },
  { codigo: "PRETA", nome: "Preta", cor: "#000000" },
];

export default function ConfiguracaoGraduacaoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());

  const temPermissao =
    hasPerfil("ADMIN_MASTER") ||
    hasPerfil("FRANQUEADO") ||
    hasPerfil("GERENTE_UNIDADE");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!temPermissao) {
      router.push("/dashboard");
      return;
    }
  }, [user, temPermissao, router]);

  const [selectedUnidade, setSelectedUnidade] = useState<string>("");
  const [categoriaAtiva, setCategoriaAtiva] = useState<"INFANTIL" | "ADULTO">(
    "ADULTO"
  );
  const [configFaixas, setConfigFaixas] = useState<{
    [key: string]: ConfigFaixa;
  }>({});
  const [percentualFrequencia, setPercentualFrequencia] = useState<number>(75);

  const { data: unidadesResponse, isLoading: loadingUnidades } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/unidades`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    enabled: !!user && temPermissao,
  });

  const unidades: Unidade[] = unidadesResponse?.items || [];

  const { data: configAtual, isLoading: loadingConfig } =
    useQuery<ConfiguracaoGraduacao>({
      queryKey: ["configuracao-graduacao", selectedUnidade],
      queryFn: async () => {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_URL}/graduacao/configuracao/${selectedUnidade}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        return response.data;
      },
      enabled: !!selectedUnidade,
    });

  useEffect(() => {
    if (configAtual) {
      setConfigFaixas(configAtual.config_faixas);
      setPercentualFrequencia(configAtual.percentual_frequencia_minima);
    }
  }, [configAtual]);

  const salvarMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/graduacao/configuracao`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["configuracao-graduacao", selectedUnidade],
      });
      alert("Configuração salva com sucesso!");
    },
    onError: (error: any) => {
      alert(
        `Erro ao salvar: ${error.response?.data?.message || error.message}`
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnidade) {
      alert("Selecione uma unidade");
      return;
    }

    salvarMutation.mutate({
      unidade_id: selectedUnidade,
      config_faixas: configFaixas,
      percentual_frequencia_minima: percentualFrequencia,
    });
  };

  const handleChangeFaixa = (
    faixaCodigo: string,
    campo: keyof ConfigFaixa,
    valor: any
  ) => {
    setConfigFaixas((prev) => {
      const faixaAtual = prev[faixaCodigo] || {
        tempo_minimo_meses: categoriaAtiva === "INFANTIL" ? 6 : 12,
        aulas_por_grau: categoriaAtiva === "INFANTIL" ? 30 : 40,
        graus_maximos: faixaCodigo === "PRETA" ? 10 : 4,
      };

      return {
        ...prev,
        [faixaCodigo]: {
          ...faixaAtual,
          [campo]: valor === "" ? null : valor,
        },
      };
    });
  };

  if (!user || !temPermissao) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  const faixasExibir =
    categoriaAtiva === "INFANTIL" ? FAIXAS_INFANTIS : FAIXAS_ADULTO;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Configuração de Graduação por Unidade
            </h1>
            <p className="text-gray-600">
              Configure as regras de graduação específicas para cada faixa
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unidade *
            </label>
            {loadingUnidades ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                <p className="text-gray-500">Carregando unidades...</p>
              </div>
            ) : (
              <select
                value={selectedUnidade}
                onChange={(e) => setSelectedUnidade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma unidade</option>
                {unidades.length > 0 ? (
                  unidades.map((unidade: Unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    Nenhuma unidade disponível
                  </option>
                )}
              </select>
            )}
          </div>

          {selectedUnidade && !loadingConfig && (
            <>
              <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px">
                    <button
                      type="button"
                      onClick={() => setCategoriaAtiva("ADULTO")}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        categoriaAtiva === "ADULTO"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Faixas Adulto ({FAIXAS_ADULTO.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoriaAtiva("INFANTIL")}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                        categoriaAtiva === "INFANTIL"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Faixas Infantil ({FAIXAS_INFANTIS.length})
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {faixasExibir.map((faixa) => {
                      const config = configFaixas[faixa.codigo] || {
                        tempo_minimo_meses:
                          categoriaAtiva === "INFANTIL" ? 6 : 12,
                        aulas_por_grau: categoriaAtiva === "INFANTIL" ? 30 : 40,
                        graus_maximos: faixa.codigo === "PRETA" ? 10 : 4,
                      };

                      return (
                        <div
                          key={faixa.codigo}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className="w-8 h-8 rounded-full border-2 border-gray-300"
                              style={{ backgroundColor: faixa.cor }}
                            ></div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {faixa.nome}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {faixa.codigo}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tempo Mínimo (meses)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={config.tempo_minimo_meses || ""}
                                onChange={(e) =>
                                  handleChangeFaixa(
                                    faixa.codigo,
                                    "tempo_minimo_meses",
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : null
                                  )
                                }
                                placeholder="Sem limite"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Aulas por Grau
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={config.aulas_por_grau}
                                onChange={(e) =>
                                  handleChangeFaixa(
                                    faixa.codigo,
                                    "aulas_por_grau",
                                    parseInt(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Graus Máximos
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={config.graus_maximos}
                                onChange={(e) =>
                                  handleChangeFaixa(
                                    faixa.codigo,
                                    "graus_maximos",
                                    parseInt(e.target.value)
                                  )
                                }
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Configurações Gerais
                </h3>
                <div className="max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Percentual de Frequência Mínima (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={percentualFrequencia}
                    onChange={(e) =>
                      setPercentualFrequencia(parseFloat(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Aluno precisa ter pelo menos {percentualFrequencia}% de
                    frequência
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={salvarMutation.isPending}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {salvarMutation.isPending
                    ? "Salvando..."
                    : "Salvar Configuração"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
              </div>
            </>
          )}

          {selectedUnidade && loadingConfig && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando configurações...</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
