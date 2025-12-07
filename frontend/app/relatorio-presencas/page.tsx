"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/app/auth/AuthContext";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Filter,
  Download,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PresencaData {
  id: string;
  aluno_nome: string;
  unidade_nome: string;
  data_presenca: string;
  horario: string;
  instrutor_nome: string;
}

interface UnidadeStats {
  unidade_id: string;
  unidade_nome: string;
  total_presencas: number;
  alunos_ativos: number;
  taxa_presenca: number;
}

export default function RelatorioPresencasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedUnidade, setSelectedUnidade] = useState<string>("todas");
  const [mesReferencia, setMesReferencia] = useState<string>(
    format(new Date(), "yyyy-MM")
  );

  // Query para buscar unidades do franqueado
  const { data: unidades } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/unidades`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao buscar unidades");
        }

        const data = await response.json();
        return data.items || [];
      } catch (error) {
        console.error("Erro ao buscar unidades:", error);
        return [];
      }
    },
  });

  // Query para buscar relatório de presenças
  const { data: relatorio, isLoading } = useQuery({
    queryKey: ["relatorio-presencas", selectedUnidade, mesReferencia],
    queryFn: async () => {
      const params = new URLSearchParams({
        mes: mesReferencia,
        ...(selectedUnidade !== "todas" && { unidade_id: selectedUnidade }),
      });

      const res = await fetch(`/api/relatorios/presencas?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erro ao carregar relatório");
      return res.json();
    },
  });

  const estatisticasGerais = relatorio?.estatisticas || {
    total_presencas: 0,
    total_alunos: 0,
    taxa_presenca_media: 0,
    dias_com_aula: 0,
  };

  const presencasRecentes: PresencaData[] = relatorio?.presencas_recentes || [];
  const estatisticasPorUnidade: UnidadeStats[] = relatorio?.por_unidade || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 rounded-lg font-medium flex items-center gap-2 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                Relatório de Presenças
              </h1>
              <p className="text-gray-600 mt-1">
                Acompanhe as presenças de todas as suas unidades
              </p>
            </div>

            <button
              onClick={() => {
                // TODO: Implementar export para Excel
                alert("Exportar para Excel - Em desenvolvimento");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro de Unidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidade
              </label>
              <select
                value={selectedUnidade}
                onChange={(e) => setSelectedUnidade(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="todas">Todas as Unidades</option>
                {unidades?.map((unidade: any) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Mês */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mês de Referência
              </label>
              <input
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
                className="input input-bordered w-full"
              />
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-8 w-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {estatisticasGerais.total_presencas}
            </div>
            <div className="text-green-100 text-sm">Total de Presenças</div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {estatisticasGerais.total_alunos}
            </div>
            <div className="text-blue-100 text-sm">Alunos Ativos</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {estatisticasGerais.taxa_presenca_media.toFixed(1)}%
            </div>
            <div className="text-purple-100 text-sm">Taxa de Presença</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-8 w-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">
              {estatisticasGerais.dias_com_aula}
            </div>
            <div className="text-orange-100 text-sm">Dias com Aula</div>
          </div>
        </div>

        {/* Estatísticas por Unidade */}
        {selectedUnidade === "todas" && estatisticasPorUnidade.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Estatísticas por Unidade
            </h2>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Unidade</th>
                    <th>Total Presenças</th>
                    <th>Alunos Ativos</th>
                    <th>Taxa de Presença</th>
                  </tr>
                </thead>
                <tbody>
                  {estatisticasPorUnidade.map((stat) => (
                    <tr key={stat.unidade_id}>
                      <td className="font-medium">{stat.unidade_nome}</td>
                      <td>{stat.total_presencas}</td>
                      <td>{stat.alunos_ativos}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${stat.taxa_presenca}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">
                            {stat.taxa_presenca.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Histórico Recente */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Histórico Recente de Presenças
          </h2>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="loading loading-spinner loading-lg"></div>
              <p className="text-gray-600 mt-4">Carregando relatório...</p>
            </div>
          ) : presencasRecentes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">
                Nenhuma presença registrada no período selecionado
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Aluno</th>
                    <th>Unidade</th>
                    <th>Instrutor</th>
                  </tr>
                </thead>
                <tbody>
                  {presencasRecentes.map((presenca) => (
                    <tr key={presenca.id}>
                      <td>
                        {format(
                          new Date(presenca.data_presenca),
                          "dd/MM/yyyy",
                          {
                            locale: ptBR,
                          }
                        )}
                      </td>
                      <td>{presenca.horario}</td>
                      <td className="font-medium">{presenca.aluno_nome}</td>
                      <td>{presenca.unidade_nome}</td>
                      <td>{presenca.instrutor_nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
