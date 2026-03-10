"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle,
  Send,
  Download,
  Filter,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FaturaRelatorio {
  id: string;
  numero_fatura: string;
  aluno_id: string;
  aluno_nome: string;
  aluno_telefone: string;
  aluno_email: string;
  descricao: string;
  valor_total: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: string;
  link_pagamento?: string;
  dias_ate_vencimento?: number;
  dias_em_atraso?: number;
  unidade_nome?: string;
}

interface Estatisticas {
  total_pagas: number;
  valor_total_pagas: number;
  total_vencidas: number;
  valor_total_vencidas: number;
  total_pendentes: number;
  valor_total_pendentes: number;
  total_proximas_vencer: number;
  valor_total_proximas_vencer: number;
  taxa_inadimplencia: number;
}

interface RelatorioCompleto {
  estatisticas: Estatisticas;
  faturas_pagas: FaturaRelatorio[];
  faturas_vencidas: FaturaRelatorio[];
  faturas_pendentes: FaturaRelatorio[];
  faturas_proximas_vencer: FaturaRelatorio[];
}

export default function RelatoriosFinanceirosPage() {
  const queryClient = useQueryClient();
  const [selectedUnidade, setSelectedUnidade] = useState<string>("");
  const [mes, setMes] = useState<string>(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [ano, setAno] = useState<string>(String(new Date().getFullYear()));
  const [selectedTab, setSelectedTab] = useState<
    "vencidas" | "proximas" | "pagas" | "pendentes"
  >("vencidas");
  const [selectedFaturas, setSelectedFaturas] = useState<Set<string>>(
    new Set()
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "vencidas"
  );

  // Buscar unidades
  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-financeiro"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Erro ao buscar unidades");
      const data = await res.json();
      return data.items || data || [];
    },
  });

  // Buscar relatório
  const {
    data: relatorio,
    isLoading,
    refetch,
  } = useQuery<RelatorioCompleto>({
    queryKey: ["relatorio-financeiro", selectedUnidade, mes, ano],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (selectedUnidade) params.append("unidade_id", selectedUnidade);
      if (mes) params.append("mes", mes);
      if (ano) params.append("ano", ano);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/relatorios-financeiros?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Erro ao buscar relatório");
      return res.json();
    },
  });

  // Mutation para enviar cobranças
  const enviarCobrancasMutation = useMutation({
    mutationFn: async (faturas: FaturaRelatorio[]) => {
      const rykonNotifyUrl = process.env.NEXT_PUBLIC_RYKON_NOTIFY_URL;
      const rykonNotifyToken = process.env.NEXT_PUBLIC_RYKON_NOTIFY_TOKEN;
      if (!rykonNotifyUrl) throw new Error("NEXT_PUBLIC_RYKON_NOTIFY_URL não configurado");

      const semTelefone = faturas.filter((f) => !f.aluno_telefone);
      if (semTelefone.length > 0) {
        const nomes = semTelefone.slice(0, 3).map((f) => f.aluno_nome).join(", ");
        const extra = semTelefone.length > 3 ? ` e mais ${semTelefone.length - 3}` : "";
        if (!confirm(`⚠️ ${semTelefone.length} aluno(s) sem telefone serão ignorados:\n${nomes}${extra}\n\nContinuar?`)) {
          throw new Error("Cancelado pelo usuário");
        }
      }

      const comTelefone = faturas.filter((f) => f.aluno_telefone);
      if (comTelefone.length === 0) throw new Error("Nenhuma fatura com telefone cadastrado");

      const res = await fetch(`${rykonNotifyUrl}/messages/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(rykonNotifyToken ? { Authorization: `Bearer ${rykonNotifyToken}` } : {}),
        },
        body: JSON.stringify({
          unidade_id: selectedUnidade || "default",
          mensagem:
            "Olá {{nome}}, sua fatura de R$ {{valor}} venceu em {{vencimento}}. Regularize seu pagamento para evitar restrições de acesso.",
          destinatarios: comTelefone.map((f) => ({
            telefone: f.aluno_telefone,
            aluno_id: f.aluno_id,
            variaveis: {
              nome: f.aluno_nome,
              valor: f.valor_total.toFixed(2),
              vencimento: format(new Date(f.data_vencimento), "dd/MM/yyyy"),
            },
          })),
        }),
      });
      if (!res.ok) throw new Error("Erro ao enviar cobranças");
      return res.json();
    },
    onSuccess: (data) => {
      alert(
        `✅ Cobranças enviadas!\n\nMensagens enfileiradas: ${data.total || data.enfileiradas || "—"}\n\nAs mensagens serão enviadas em breve.`
      );
      setSelectedFaturas(new Set());
      refetch();
    },
    onError: (error: Error) => {
      if (error.message !== "Cancelado pelo usuário") {
        alert(`❌ Erro ao enviar cobranças: ${error.message}`);
      }
    },
  });

  // Mutation para enviar lembretes
  const enviarLembretesMutation = useMutation({
    mutationFn: async (faturas: FaturaRelatorio[]) => {
      const rykonNotifyUrl = process.env.NEXT_PUBLIC_RYKON_NOTIFY_URL;
      const rykonNotifyToken = process.env.NEXT_PUBLIC_RYKON_NOTIFY_TOKEN;
      if (!rykonNotifyUrl) throw new Error("NEXT_PUBLIC_RYKON_NOTIFY_URL não configurado");

      const comTelefone = faturas.filter((f) => f.aluno_telefone);
      if (comTelefone.length === 0) throw new Error("Nenhuma fatura com telefone cadastrado");

      const res = await fetch(`${rykonNotifyUrl}/messages/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(rykonNotifyToken ? { Authorization: `Bearer ${rykonNotifyToken}` } : {}),
        },
        body: JSON.stringify({
          unidade_id: selectedUnidade || "default",
          mensagem:
            "Olá {{nome}}, sua fatura de R$ {{valor}} vence em {{vencimento}}. Pague em dia e evite juros!",
          destinatarios: comTelefone.map((f) => ({
            telefone: f.aluno_telefone,
            aluno_id: f.aluno_id,
            variaveis: {
              nome: f.aluno_nome,
              valor: f.valor_total.toFixed(2),
              vencimento: format(new Date(f.data_vencimento), "dd/MM/yyyy"),
              dias: String(f.dias_ate_vencimento ?? ""),
            },
          })),
        }),
      });
      if (!res.ok) throw new Error("Erro ao enviar lembretes");
      return res.json();
    },
    onSuccess: (data) => {
      alert(
        `✅ Lembretes enviados!\n\nMensagens enfileiradas: ${data.total || data.enfileiradas || "—"}\n\nAs mensagens serão enviadas em breve.`
      );
      refetch();
    },
    onError: (error: Error) => {
      alert(`❌ Erro ao enviar lembretes: ${error.message}`);
    },
  });

  const toggleFatura = (faturaId: string) => {
    const newSet = new Set(selectedFaturas);
    if (newSet.has(faturaId)) {
      newSet.delete(faturaId);
    } else {
      newSet.add(faturaId);
    }
    setSelectedFaturas(newSet);
  };

  const toggleAll = (faturas: FaturaRelatorio[]) => {
    const ids = faturas.map((f) => f.id);
    const allSelected = ids.every((id) => selectedFaturas.has(id));

    if (allSelected) {
      const newSet = new Set(selectedFaturas);
      ids.forEach((id) => newSet.delete(id));
      setSelectedFaturas(newSet);
    } else {
      const newSet = new Set(selectedFaturas);
      ids.forEach((id) => newSet.add(id));
      setSelectedFaturas(newSet);
    }
  };

  const handleEnviarCobrancas = () => {
    if (selectedFaturas.size === 0) {
      alert("Selecione pelo menos uma fatura");
      return;
    }

    const todasFaturas = [
      ...(relatorio?.faturas_vencidas || []),
      ...(relatorio?.faturas_pendentes || []),
      ...(relatorio?.faturas_proximas_vencer || []),
      ...(relatorio?.faturas_pagas || []),
    ];
    const faturasSelecionadas = todasFaturas.filter((f) =>
      selectedFaturas.has(f.id)
    );

    if (
      confirm(
        `Enviar cobrança via WhatsApp para ${faturasSelecionadas.length} aluno(s)?`
      )
    ) {
      enviarCobrancasMutation.mutate(faturasSelecionadas);
    }
  };

  const handleEnviarLembretes = (dias?: number) => {
    let faturasParaLembrete = relatorio?.faturas_proximas_vencer || [];
    if (dias !== undefined) {
      faturasParaLembrete = faturasParaLembrete.filter(
        (f) => f.dias_ate_vencimento !== undefined && f.dias_ate_vencimento <= dias
      );
    }

    if (faturasParaLembrete.length === 0) {
      alert(
        dias !== undefined
          ? `Nenhuma fatura vencendo em até ${dias} dias encontrada.`
          : "Nenhuma fatura próxima do vencimento encontrada."
      );
      return;
    }

    const mensagem =
      dias !== undefined
        ? `Enviar lembretes para ${faturasParaLembrete.length} fatura(s) que vencem em até ${dias} dias?`
        : `Enviar lembretes para ${faturasParaLembrete.length} fatura(s) próximas a vencer?`;

    if (confirm(mensagem)) {
      enviarLembretesMutation.mutate(faturasParaLembrete);
    }
  };

  const exportarCSV = (faturas: FaturaRelatorio[], tipo: string) => {
    const headers = [
      "Número",
      "Aluno",
      "Telefone",
      "Email",
      "Valor",
      "Vencimento",
      "Status",
      "Unidade",
    ];
    const rows = faturas.map((f) => [
      f.numero_fatura,
      f.aluno_nome,
      f.aluno_telefone,
      f.aluno_email,
      `R$ ${f.valor_total.toFixed(2)}`,
      format(new Date(f.data_vencimento), "dd/MM/yyyy"),
      f.status,
      f.unidade_nome || "N/A",
    ]);

    const csv =
      headers.join(";") + "\n" + rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${tipo}-${mes}-${ano}.csv`;
    link.click();
  };

  const renderTable = (faturas: FaturaRelatorio[], tipo: string) => {
    const allSelected =
      faturas.length > 0 &&
      faturas.every((f) => selectedFaturas.has(f.id));

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleAll(faturas)}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Número
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Aluno
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Telefone
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Valor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vencimento
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {faturas.map((fatura) => (
              <tr
                key={fatura.id}
                className={`hover:bg-gray-50 ${selectedFaturas.has(fatura.id) ? "bg-blue-50" : ""}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedFaturas.has(fatura.id)}
                    onChange={() => toggleFatura(fatura.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {fatura.numero_fatura}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {fatura.aluno_nome}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {fatura.aluno_telefone || "-"}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                  R$ {fatura.valor_total.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {format(new Date(fatura.data_vencimento), "dd/MM/yyyy")}
                  {fatura.dias_em_atraso !== undefined && (
                    <span className="ml-2 text-xs text-red-600 font-medium">
                      ({fatura.dias_em_atraso}d atraso)
                    </span>
                  )}
                  {fatura.dias_ate_vencimento !== undefined && (
                    <span className="ml-2 text-xs text-orange-600 font-medium">
                      ({fatura.dias_ate_vencimento}d restantes)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      fatura.status === "PAGA"
                        ? "bg-green-100 text-green-800"
                        : fatura.status === "VENCIDA"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {fatura.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {faturas.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhuma fatura encontrada
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  const stats = relatorio?.estatisticas;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-7 w-7 text-blue-600" />
          Relatórios Financeiros
        </h1>
        <p className="text-gray-600 mt-1">
          Visualize faturas, analise inadimplência e envie cobranças via WhatsApp
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unidade
            </label>
            <select
              value={selectedUnidade}
              onChange={(e) => setSelectedUnidade(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas as unidades</option>
              {unidades.map((unidade: any) => (
                <option key={unidade.id} value={unidade.id}>
                  {unidade.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m).padStart(2, "0")}>
                  {format(new Date(2000, m - 1, 1), "MMMM", { locale: ptBR })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano
            </label>
            <select
              value={ano}
              onChange={(e) => setAno(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i
              ).map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => refetch()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Faturas Pagas</p>
              <p className="text-2xl font-bold text-green-600">
                {stats?.total_pagas || 0}
              </p>
              <p className="text-sm text-gray-500">
                R$ {(stats?.valor_total_pagas || 0).toFixed(2)}
              </p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Faturas Vencidas</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.total_vencidas || 0}
              </p>
              <p className="text-sm text-gray-500">
                R$ {(stats?.valor_total_vencidas || 0).toFixed(2)}
              </p>
            </div>
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Próximas a Vencer</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats?.total_proximas_vencer || 0}
              </p>
              <p className="text-sm text-gray-500">
                R$ {(stats?.valor_total_proximas_vencer || 0).toFixed(2)}
              </p>
            </div>
            <Clock className="h-10 w-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa Inadimplência</p>
              <p className="text-2xl font-bold text-purple-600">
                {(stats?.taxa_inadimplencia || 0).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500">
                {stats?.total_pendentes || 0} pendentes
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Ações em Massa */}
      {selectedFaturas.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedFaturas.size} fatura(s) selecionada(s)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFaturas(new Set())}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white transition-colors"
              >
                Limpar Seleção
              </button>
              <button
                onClick={handleEnviarCobrancas}
                disabled={enviarCobrancasMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {enviarCobrancasMutation.isPending
                  ? "Enviando..."
                  : "Enviar WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ações Rápidas */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleEnviarLembretes(undefined)}
            disabled={enviarLembretesMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Calendar className="h-4 w-4" />
            Enviar Lembretes (Config. Unidade)
          </button>
          <button
            onClick={() => handleEnviarLembretes(3)}
            disabled={enviarLembretesMutation.isPending}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Calendar className="h-4 w-4" />
            Enviar Lembretes (3 dias)
          </button>
          <button
            onClick={() => handleEnviarLembretes(7)}
            disabled={enviarLembretesMutation.isPending}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Calendar className="h-4 w-4" />
            Enviar Lembretes (7 dias)
          </button>
        </div>
      </div>

      {/* Tabelas de Faturas */}
      <div className="space-y-4">
        {/* Faturas Vencidas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div
            onClick={() =>
              setExpandedSection(
                expandedSection === "vencidas" ? null : "vencidas"
              )
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setExpandedSection(expandedSection === "vencidas" ? null : "vencidas")}
            className="w-full px-6 py-4 flex items-center justify-between bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold text-red-900">
                Faturas Vencidas ({relatorio?.faturas_vencidas.length || 0})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportarCSV(relatorio?.faturas_vencidas || [], "vencidas");
                }}
                className="px-3 py-1 bg-white border border-red-300 rounded text-sm text-red-700 hover:bg-red-50 flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
              {expandedSection === "vencidas" ? (
                <ChevronUp className="h-5 w-5 text-red-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-red-600" />
              )}
            </div>
          </div>
          {expandedSection === "vencidas" && (
            <div className="p-4">
              {renderTable(relatorio?.faturas_vencidas || [], "vencidas")}
            </div>
          )}
        </div>

        {/* Faturas Próximas a Vencer */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div
            onClick={() =>
              setExpandedSection(
                expandedSection === "proximas" ? null : "proximas"
              )
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setExpandedSection(expandedSection === "proximas" ? null : "proximas")}
            className="w-full px-6 py-4 flex items-center justify-between bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-orange-900">
                Próximas a Vencer ({relatorio?.faturas_proximas_vencer.length || 0})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportarCSV(
                    relatorio?.faturas_proximas_vencer || [],
                    "proximas-vencer"
                  );
                }}
                className="px-3 py-1 bg-white border border-orange-300 rounded text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
              {expandedSection === "proximas" ? (
                <ChevronUp className="h-5 w-5 text-orange-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-orange-600" />
              )}
            </div>
          </div>
          {expandedSection === "proximas" && (
            <div className="p-4">
              {renderTable(
                relatorio?.faturas_proximas_vencer || [],
                "proximas"
              )}
            </div>
          )}
        </div>

        {/* Faturas Pagas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div
            onClick={() =>
              setExpandedSection(expandedSection === "pagas" ? null : "pagas")
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setExpandedSection(expandedSection === "pagas" ? null : "pagas")}
            className="w-full px-6 py-4 flex items-center justify-between bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">
                Faturas Pagas ({relatorio?.faturas_pagas.length || 0})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportarCSV(relatorio?.faturas_pagas || [], "pagas");
                }}
                className="px-3 py-1 bg-white border border-green-300 rounded text-sm text-green-700 hover:bg-green-50 flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
              {expandedSection === "pagas" ? (
                <ChevronUp className="h-5 w-5 text-green-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-green-600" />
              )}
            </div>
          </div>
          {expandedSection === "pagas" && (
            <div className="p-4">
              {renderTable(relatorio?.faturas_pagas || [], "pagas")}
            </div>
          )}
        </div>

        {/* Faturas Pendentes */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div
            onClick={() =>
              setExpandedSection(
                expandedSection === "pendentes" ? null : "pendentes"
              )
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setExpandedSection(expandedSection === "pendentes" ? null : "pendentes")}
            className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Faturas Pendentes ({relatorio?.faturas_pendentes.length || 0})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportarCSV(relatorio?.faturas_pendentes || [], "pendentes");
                }}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
              {expandedSection === "pendentes" ? (
                <ChevronUp className="h-5 w-5 text-gray-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600" />
              )}
            </div>
          </div>
          {expandedSection === "pendentes" && (
            <div className="p-4">
              {renderTable(relatorio?.faturas_pendentes || [], "pendentes")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
