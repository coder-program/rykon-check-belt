"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PresencaData {
  id: string;
  aluno_nome: string;
  unidade_nome: string;
  data_presenca: string;
  horario: string;
  instrutor_nome: string;
  aluno?: {
    categoria?: string;
    isKids?: boolean;
  };
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
  const [tipoPeriodo, setTipoPeriodo] = useState<"dia" | "semana" | "mes">("dia");
  const [dataReferencia, setDataReferencia] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortFieldUnidade, setSortFieldUnidade] = useState<string | null>(null);
  const [sortDirectionUnidade, setSortDirectionUnidade] = useState<"asc" | "desc">("asc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [presencaToDelete, setPresencaToDelete] = useState<PresencaData | null>(null);

  console.log('👤 [RELATÓRIO] User completo:', user);
  console.log('🔐 [RELATÓRIO] User.perfis:', user?.perfis);
  
  // Verificar se é gerente, recepcionista, instrutor ou professor e pegar unidade específica
  const isGerente = user?.perfis?.some((p: any) => {
    const perfil = (typeof p === 'string' ? p : p.nome)?.toLowerCase();
    console.log('🔍 [RELATÓRIO] Verificando gerente:', perfil);
    return perfil === 'gerente_unidade';
  });
  
  const isRecepcionista = user?.perfis?.some((p: any) => {
    const perfil = (typeof p === 'string' ? p : p.nome)?.toLowerCase();
    console.log('🔍 [RELATÓRIO] Verificando recepcionista:', perfil);
    return perfil === 'recepcionista';
  });
  
  const isInstrutor = user?.perfis?.some((p: any) => {
    const perfil = (typeof p === 'string' ? p : p.nome)?.toLowerCase();
    console.log('🔍 [RELATÓRIO] Verificando instrutor:', perfil);
    return perfil === 'instrutor';
  });
  
  const isProfessor = user?.perfis?.some((p: any) => {
    const perfil = (typeof p === 'string' ? p : p.nome)?.toLowerCase();
    console.log('🔍 [RELATÓRIO] Verificando professor:', perfil);
    return perfil === 'professor';
  });
  
  const isUnidadeRestrita = isGerente || isRecepcionista || isInstrutor || isProfessor;

  console.log('🏷️ [RELATÓRIO] Perfis identificados:', {
    isGerente,
    isRecepcionista,
    isInstrutor,
    isProfessor,
    isUnidadeRestrita
  });

  // Query para buscar unidades do franqueado/gerente/recepcionista/instrutor/professor
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
        const unidadesList = data.items || [];
        
        // Se tem unidade restrita e tem unidades, auto-selecionar a primeira (única dele)
        if (isUnidadeRestrita && unidadesList.length > 0 && selectedUnidade === "todas") {
          setSelectedUnidade(unidadesList[0].id);
        }
        
        return unidadesList;
      } catch (error) {
        console.error("Erro ao buscar unidades:", error);
        return [];
      }
    },
  });

  // Query para buscar relatório de presenças
  const { data: relatorio, isLoading } = useQuery({
    queryKey: ["relatorio-presencas", selectedUnidade, dataReferencia, tipoPeriodo],
    enabled: !!user, // Executar sempre que user estiver carregado
    queryFn: async () => {
      console.log('🚀 [RELATÓRIO] Query sendo EXECUTADA!');
      console.log('🔍 [RELATÓRIO] Iniciando busca com parâmetros:', {
        selectedUnidade,
        dataReferencia,
        tipoPeriodo,
        isUnidadeRestrita,
        isInstrutor,
        isProfessor
      });

      // Calcular dataInicio e dataFim baseado no tipo de período
      let dataInicio: string;
      let dataFim: string;
      const dataRef = new Date(dataReferencia + "T12:00:00");

      if (tipoPeriodo === "dia") {
        const inicio = startOfDay(dataRef);
        const fim = endOfDay(dataRef);
        dataInicio = format(inicio, "yyyy-MM-dd");
        dataFim = format(fim, "yyyy-MM-dd");
      } else if (tipoPeriodo === "semana") {
        const inicio = startOfWeek(dataRef, { weekStartsOn: 0 }); // Domingo
        const fim = endOfWeek(dataRef, { weekStartsOn: 0 });
        dataInicio = format(inicio, "yyyy-MM-dd");
        dataFim = format(fim, "yyyy-MM-dd");
      } else {
        // mes
        const [ano, mes] = dataReferencia.split('-');
        dataInicio = `${ano}-${mes}-01`;
        const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate();
        dataFim = `${ano}-${mes}-${ultimoDia}`;
      }

      console.log('📅 [RELATÓRIO] Período calculado:', { dataInicio, dataFim });
      
      const params = new URLSearchParams({
        dataInicio,
        dataFim,
        ...(selectedUnidade !== "todas" && { unidadeId: selectedUnidade }),
      });

      console.log('🌐 [RELATÓRIO] URL params:', params.toString());

      const token = localStorage.getItem("token");
      const url = `${process.env.NEXT_PUBLIC_API_URL}/presenca/relatorio-presencas?${params}`;
      console.log('🔗 [RELATÓRIO] URL completa:', url);

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log('📡 [RELATÓRIO] Response status:', res.status);

      if (!res.ok) throw new Error("Erro ao carregar relatório");
      const data = await res.json();

      console.log('📦 [RELATÓRIO] Dados recebidos:', {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'não é array',
        firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null
      });
      
      // Processar os dados retornados pelo backend
      if (Array.isArray(data)) {
        const presencas = data;
        const alunosUnicos = new Set(presencas.map((p: any) => p.aluno?.id).filter(Boolean));
        const diasUnicos = new Set(
          presencas.map((p: any) => {
            if (p.data) {
              return new Date(p.data).toISOString().split('T')[0];
            }
            return null;
          }).filter(Boolean)
        );
        
        return {
          estatisticas: {
            total_presencas: presencas.length,
            total_alunos: alunosUnicos.size,
            taxa_presenca_media: alunosUnicos.size > 0 
              ? Math.round((presencas.length / alunosUnicos.size) * 100) / 100 
              : 0,
            dias_com_aula: diasUnicos.size,
          },
          presencas_recentes: presencas.slice(0, 20).map((p: any) => ({
            id: p.id,
            aluno_nome: p.aluno?.nome || 'Aluno',
            unidade_nome: p.aula?.unidade?.nome || 'Unidade',
            data_presenca: p.data,
            horario: p.hora_checkin ? (() => {
              // Backend retorna em UTC, precisa converter para horário de São Paulo (UTC-3)
              const date = new Date(p.hora_checkin);
              const hours = date.getUTCHours() - 3; // Converter UTC para UTC-3
              const minutes = date.getUTCMinutes();
              
              // Ajustar horas negativas (quando é depois da meia-noite UTC)
              const adjustedHours = hours < 0 ? hours + 24 : hours;
              
              return `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            })() : '00:00',
            instrutor_nome: p.aula?.professor?.nome_completo || 'Instrutor',
            aluno: {
              categoria: p.aluno?.categoria,
              isKids: p.aluno?.isKids,
            },
          })),
          por_unidade: [],
        };
      }
      
      return data;
    },
  });

  const queryClient = useQueryClient();

  // Mutation para deletar presença
  const deletarPresencaMutation = useMutation({
    mutationFn: async (presencaId: string) => {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${API_URL}/teamcruz/presencas/${presencaId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setShowDeleteModal(false);
      setPresencaToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["relatorio-presencas"] });
      alert("✅ Presença deletada com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao deletar presença:", error);
      alert(
        `❌ Erro ao deletar presença: ${error.response?.data?.message || error.message}`
      );
    },
  });

  const handleDeletarPresenca = (presenca: PresencaData) => {
    setPresencaToDelete(presenca);
    setShowDeleteModal(true);
  };

  const confirmarDelecao = () => {
    if (presencaToDelete) {
      deletarPresencaMutation.mutate(presencaToDelete.id);
    }
  };

  const estatisticasGerais = relatorio?.estatisticas || {
    total_presencas: 0,
    total_alunos: 0,
    taxa_presenca_media: 0,
    dias_com_aula: 0,
  };

  const presencasRecentes: PresencaData[] = relatorio?.presencas_recentes || [];
  const estatisticasPorUnidade: UnidadeStats[] = relatorio?.por_unidade || [];

  // Função para ordenar dados
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Se já está ordenando por esse campo, inverte a direção
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Novo campo, começa com ascendente
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Aplicar ordenação nos dados
  const presencasOrdenadas = React.useMemo(() => {
    if (!sortField) return presencasRecentes;

    return [...presencasRecentes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "data":
          aValue = new Date(a.data_presenca).getTime();
          bValue = new Date(b.data_presenca).getTime();
          break;
        case "aluno":
          aValue = a.aluno_nome.toLowerCase();
          bValue = b.aluno_nome.toLowerCase();
          break;
        case "unidade":
          aValue = a.unidade_nome.toLowerCase();
          bValue = b.unidade_nome.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [presencasRecentes, sortField, sortDirection]);

  // Função para renderizar ícone de ordenação
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    );
  };

  // Função para ordenar tabela de unidades
  const handleSortUnidade = (field: string) => {
    if (sortFieldUnidade === field) {
      setSortDirectionUnidade(sortDirectionUnidade === "asc" ? "desc" : "asc");
    } else {
      setSortFieldUnidade(field);
      setSortDirectionUnidade("asc");
    }
  };

  // Aplicar ordenação nas estatísticas por unidade
  const estatisticasOrdenadas = React.useMemo(() => {
    if (!sortFieldUnidade) return estatisticasPorUnidade;

    return [...estatisticasPorUnidade].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortFieldUnidade) {
        case "unidade":
          aValue = a.unidade_nome.toLowerCase();
          bValue = b.unidade_nome.toLowerCase();
          break;
        case "presencas":
          aValue = a.total_presencas;
          bValue = b.total_presencas;
          break;
        case "alunos":
          aValue = a.alunos_ativos;
          bValue = b.alunos_ativos;
          break;
        case "taxa":
          aValue = a.taxa_presenca;
          bValue = b.taxa_presenca;
          break;
        default:
          return 0;
      }

      if (sortDirectionUnidade === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [estatisticasPorUnidade, sortFieldUnidade, sortDirectionUnidade]);

  // Função para renderizar ícone de ordenação (tabela unidades)
  const renderSortIconUnidade = (field: string) => {
    if (sortFieldUnidade !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirectionUnidade === "asc" ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    );
  };

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
                {isUnidadeRestrita 
                  ? "Acompanhe as presenças da sua unidade"
                  : "Acompanhe as presenças de todas as suas unidades"}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de Unidade - Desabilitado para gerentes/recepcionistas/instrutores/professores */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidade
              </label>
              <select
                value={selectedUnidade}
                onChange={(e) => setSelectedUnidade(e.target.value)}
                disabled={isUnidadeRestrita}
                className={`select select-bordered w-full ${isUnidadeRestrita ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                {!isUnidadeRestrita && <option value="todas">Todas as Unidades</option>}
                {Array.isArray(unidades) && unidades.map((unidade: any) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
              {isUnidadeRestrita && (
                <p className="text-xs text-gray-500 mt-1">
                  Mostrando apenas sua unidade
                </p>
              )}
            </div>

            {/* Filtro de Tipo de Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Período
              </label>
              <select
                value={tipoPeriodo}
                onChange={(e) => setTipoPeriodo(e.target.value as "dia" | "semana" | "mes")}
                className="select select-bordered w-full"
              >
                <option value="dia">Dia</option>
                <option value="semana">Semana</option>
                <option value="mes">Mês</option>
              </select>
            </div>

            {/* Filtro de Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tipoPeriodo === "dia" && "Data"}
                {tipoPeriodo === "semana" && "Semana (selecione qualquer dia)"}
                {tipoPeriodo === "mes" && "Mês"}
              </label>
              <input
                type={tipoPeriodo === "mes" ? "month" : "date"}
                value={tipoPeriodo === "mes" ? dataReferencia.slice(0, 7) : dataReferencia}
                onChange={(e) => {
                  if (tipoPeriodo === "mes") {
                    setDataReferencia(e.target.value + "-01");
                  } else {
                    setDataReferencia(e.target.value);
                  }
                }}
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
                    <th 
                      className="cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSortUnidade("unidade")}
                    >
                      <div className="flex items-center gap-2">
                        Unidade
                        {renderSortIconUnidade("unidade")}
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSortUnidade("presencas")}
                    >
                      <div className="flex items-center gap-2">
                        Total Presenças
                        {renderSortIconUnidade("presencas")}
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSortUnidade("alunos")}
                    >
                      <div className="flex items-center gap-2">
                        Alunos Ativos
                        {renderSortIconUnidade("alunos")}
                      </div>
                    </th>
                    <th 
                      className="cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSortUnidade("taxa")}
                    >
                      <div className="flex items-center gap-2">
                        Taxa de Presença
                        {renderSortIconUnidade("taxa")}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(estatisticasOrdenadas) && estatisticasOrdenadas.map((stat) => (
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
                  {(!estatisticasOrdenadas || estatisticasOrdenadas.length === 0) && (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 py-8">
                        Nenhum dado disponível para o período selecionado
                      </td>
                    </tr>
                  )}
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
                    <th 
                      className="cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("data")}
                    >
                      <div className="flex items-center gap-2">
                        Data
                        {renderSortIcon("data")}
                      </div>
                    </th>
                    <th>Horário</th>
                    <th 
                      className="cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("aluno")}
                    >
                      <div className="flex items-center gap-2">
                        Aluno
                        {renderSortIcon("aluno")}
                      </div>
                    </th>
                    <th>Categoria</th>
                    <th 
                      className="cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("unidade")}
                    >
                      <div className="flex items-center gap-2">
                        Unidade
                        {renderSortIcon("unidade")}
                      </div>
                    </th>
                    <th>Instrutor</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(presencasOrdenadas) && presencasOrdenadas.map((presenca) => (
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
                      <td>
                        {presenca.aluno?.isKids ? (
                          <span className="badge badge-primary badge-sm">KIDS</span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">ADULTO</span>
                        )}
                      </td>
                      <td>{presenca.unidade_nome}</td>
                      <td>{presenca.instrutor_nome}</td>
                      <td className="text-center">
                        <button
                          onClick={() => handleDeletarPresenca(presenca)}
                          disabled={deletarPresencaMutation.isPending}
                          className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Deletar presença"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!presencasOrdenadas || presencasOrdenadas.length === 0) && (
                    <tr>
                      <td colSpan={7} className="text-center text-gray-500 py-8">
                        Nenhuma presença registrada no período selecionado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && presencaToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Confirmar Exclusão
                </h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPresencaToDelete(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Tem certeza que deseja deletar esta presença?
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Aluno:
                  </span>
                  <span className="text-sm text-gray-900">
                    {presencaToDelete.aluno_nome}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Data:
                  </span>
                  <span className="text-sm text-gray-900">
                    {format(
                      new Date(presencaToDelete.data_presenca),
                      "dd/MM/yyyy",
                      { locale: ptBR }
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Horário:
                  </span>
                  <span className="text-sm text-gray-900">
                    {presencaToDelete.horario}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setPresencaToDelete(null);
                }}
                disabled={deletarPresencaMutation.isPending}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDelecao}
                disabled={deletarPresencaMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {deletarPresencaMutation.isPending && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {deletarPresencaMutation.isPending ? "Deletando..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
