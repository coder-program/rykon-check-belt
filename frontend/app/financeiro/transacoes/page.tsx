"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Download,
  Search,
} from "lucide-react";
import FiltroUnidade from "@/components/financeiro/FiltroUnidade";
import { useFiltroUnidade } from "@/hooks/useFiltroUnidade";

interface Transacao {
  id: string;
  tipo: "ENTRADA" | "SAIDA";
  origem: string;
  categoria: string;
  descricao: string;
  aluno?: {
    id: string;
    nome_completo: string;
  };
  unidade?: {
    id: string;
    nome: string;
  };
  valor: number;
  data: string;
  status: string;
  metodo_pagamento?: string;
  comprovante?: string;
  observacoes?: string;
  created_at: string;
}

export default function TransacoesPage() {
  const router = useRouter();
  const {
    isFranqueado,
    unidades,
    unidadeSelecionada,
    unidadeIdAtual,
    setUnidadeSelecionada,
  } = useFiltroUnidade();
  const [filtros, setFiltros] = useState({
    tipo: "",
    origem: "",
    categoria: "",
    status: "",
    dataInicio: "",
    dataFim: "",
    busca: "",
  });

  // Query para buscar transações
  const { data: transacoes = [], isLoading } = useQuery<Transacao[]>({
    queryKey: ["transacoes", filtros, unidadeSelecionada],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();

      if (unidadeIdAtual) params.append("unidade_id", unidadeIdAtual);

      if (filtros.tipo) params.append("tipo", filtros.tipo);
      if (filtros.origem) params.append("origem", filtros.origem);
      if (filtros.categoria) params.append("categoria", filtros.categoria);
      if (filtros.status) params.append("status", filtros.status);
      if (filtros.dataInicio) params.append("data_inicio", filtros.dataInicio);
      if (filtros.dataFim) params.append("data_fim", filtros.dataFim);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transacoes?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar transações");
      }

      return response.json();
    },
  });

  // Filtrar localmente pela busca
  const transacoesFiltradas = transacoes.filter((t) => {
    if (!filtros.busca) return true;
    const busca = filtros.busca.toLowerCase();
    return (
      t.descricao.toLowerCase().includes(busca) ||
      t.aluno?.nome_completo.toLowerCase().includes(busca) ||
      t.observacoes?.toLowerCase().includes(busca)
    );
  });

  // Calcular totais
  const totais = transacoesFiltradas.reduce(
    (acc, t) => {
      if (t.tipo === "ENTRADA") {
        acc.entradas += Number(t.valor);
      } else {
        acc.saidas += Number(t.valor);
      }
      return acc;
    },
    { entradas: 0, saidas: 0 }
  );

  const saldo = totais.entradas - totais.saidas;

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      CONFIRMADA: { text: "Confirmada", color: "bg-green-100 text-green-800" },
      PENDENTE: { text: "Pendente", color: "bg-yellow-100 text-yellow-800" },
      CANCELADA: { text: "Cancelada", color: "bg-red-100 text-red-800" },
      ESTORNADA: { text: "Estornada", color: "bg-orange-100 text-orange-800" },
    };

    const badge = badges[status] || {
      text: status,
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
      >
        {badge.text}
      </span>
    );
  };

  const getOrigemBadge = (origem: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      FATURA: { text: "Fatura", color: "bg-blue-100 text-blue-800" },
      VENDA: { text: "Venda", color: "bg-purple-100 text-purple-800" },
      DESPESA: { text: "Despesa", color: "bg-red-100 text-red-800" },
      MANUAL: { text: "Manual", color: "bg-gray-100 text-gray-800" },
      ESTORNO: { text: "Estorno", color: "bg-orange-100 text-orange-800" },
      GYMPASS: { text: "Gympass", color: "bg-green-100 text-green-800" },
      CORPORATE: { text: "Corporate", color: "bg-indigo-100 text-indigo-800" },
    };

    const badge = badges[origem] || {
      text: origem,
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
      >
        {badge.text}
      </span>
    );
  };

  const exportarCSV = () => {
    const headers = [
      "Data",
      "Hora",
      "Tipo",
      "Origem",
      "Categoria",
      "Descrição",
      "Aluno",
      "Valor",
      "Status",
      "Método",
    ];

    const rows = transacoesFiltradas.map((t) => [
      new Date(t.created_at).toLocaleDateString("pt-BR"),
      new Date(t.created_at).toLocaleTimeString("pt-BR"),
      t.tipo,
      t.origem,
      t.categoria,
      t.descricao,
      t.aluno?.nome_completo || "-",
      t.valor.toFixed(2),
      t.status,
      t.metodo_pagamento || "-",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/financeiro/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Transações Financeiras
              </h1>
              <p className="text-gray-600 mt-1">
                Visualize todas as transações do sistema
              </p>
            </div>

            <Button onClick={exportarCSV} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filtro de Unidade */}
        <FiltroUnidade
          unidades={unidades}
          unidadeSelecionada={unidadeSelecionada}
          onUnidadeChange={setUnidadeSelecionada}
          isFranqueado={isFranqueado}
        />

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Entradas
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R${" "}
                {totais.entradas.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {transacoesFiltradas.filter((t) => t.tipo === "ENTRADA").length}{" "}
                transações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Saídas
              </CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R${" "}
                {totais.saidas.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {transacoesFiltradas.filter((t) => t.tipo === "SAIDA").length}{" "}
                transações
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              {saldo >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  saldo >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                R${" "}
                {Math.abs(saldo).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {transacoesFiltradas.length} transações
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={filtros.busca}
                    onChange={(e) =>
                      setFiltros({ ...filtros, busca: e.target.value })
                    }
                    placeholder="Buscar por descrição, aluno, observações..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={filtros.tipo}
                  onChange={(e) =>
                    setFiltros({ ...filtros, tipo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
              </div>

              {/* Origem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origem
                </label>
                <select
                  value={filtros.origem}
                  onChange={(e) =>
                    setFiltros({ ...filtros, origem: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas</option>
                  <option value="FATURA">Fatura</option>
                  <option value="VENDA">Venda</option>
                  <option value="DESPESA">Despesa</option>
                  <option value="MANUAL">Manual</option>
                  <option value="ESTORNO">Estorno</option>
                  <option value="GYMPASS">Gympass</option>
                  <option value="CORPORATE">Corporate</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filtros.status}
                  onChange={(e) =>
                    setFiltros({ ...filtros, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="CONFIRMADA">Confirmada</option>
                  <option value="PENDENTE">Pendente</option>
                  <option value="CANCELADA">Cancelada</option>
                  <option value="ESTORNADA">Estornada</option>
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={filtros.categoria}
                  onChange={(e) =>
                    setFiltros({ ...filtros, categoria: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas</option>
                  <option value="MENSALIDADE">Mensalidade</option>
                  <option value="PRODUTO">Produto</option>
                  <option value="AULA_AVULSA">Aula Avulsa</option>
                  <option value="COMPETICAO">Competição</option>
                  <option value="TAXA">Taxa</option>
                  <option value="ALUGUEL">Aluguel</option>
                  <option value="SALARIO">Salário</option>
                  <option value="FORNECEDOR">Fornecedor</option>
                  <option value="UTILIDADE">Utilidade</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>

              {/* Data Início */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) =>
                    setFiltros({ ...filtros, dataInicio: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data Fim */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) =>
                    setFiltros({ ...filtros, dataFim: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setFiltros({
                    tipo: "",
                    origem: "",
                    categoria: "",
                    status: "",
                    dataInicio: "",
                    dataFim: "",
                    busca: "",
                  })
                }
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Transações */}
        <Card>
          <CardHeader>
            <CardTitle>Transações</CardTitle>
            <CardDescription>
              {transacoesFiltradas.length} transações encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Carregando transações...
              </div>
            ) : transacoesFiltradas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhuma transação encontrada
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Origem
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aluno
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Método
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transacoesFiltradas.map((transacao) => (
                      <tr key={transacao.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {new Date(transacao.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(transacao.created_at).toLocaleTimeString(
                              "pt-BR"
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {transacao.tipo === "ENTRADA" ? (
                            <span className="flex items-center text-green-600">
                              <ArrowUpRight className="h-4 w-4 mr-1" />
                              Entrada
                            </span>
                          ) : (
                            <span className="flex items-center text-red-600">
                              <ArrowDownRight className="h-4 w-4 mr-1" />
                              Saída
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getOrigemBadge(transacao.origem)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transacao.categoria}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {transacao.descricao}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transacao.aluno?.nome_completo || "-"}
                        </td>
                        <td
                          className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${
                            transacao.tipo === "ENTRADA"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transacao.tipo === "ENTRADA" ? "+" : "-"} R${" "}
                          {Number(transacao.valor).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(transacao.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transacao.metodo_pagamento || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
