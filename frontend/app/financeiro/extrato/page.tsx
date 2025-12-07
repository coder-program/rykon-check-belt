"use client";

import { useState, useEffect } from "react";
import ProtegerRotaFinanceira from "@/components/financeiro/ProtegerRotaFinanceira";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  Filter,
} from "lucide-react";
import FiltroUnidade from "@/components/financeiro/FiltroUnidade";

interface Transacao {
  id: string;
  tipo: "RECEITA" | "DESPESA" | "TRANSFERENCIA";
  origem: string;
  categoria?: string;
  valor: number;
  descricao?: string;
  data_transacao: string;
  unidade_id?: string;
  unidade_nome?: string;
  aluno_id?: string;
  aluno_nome?: string;
  created_at: string;
}

export default function Extrato() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [isFranqueado, setIsFranqueado] = useState(false);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("todas");
  const [unidadeId, setUnidadeId] = useState<string>("");

  useEffect(() => {
    // Definir datas padrão (último mês)
    const hoje = new Date();
    const umMesAtras = new Date();
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);

    setDataFim(hoje.toISOString().split("T")[0]);
    setDataInicio(umMesAtras.toISOString().split("T")[0]);

    // Detectar franqueado e carregar unidades
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);

      const isFranqueadoUser = user.perfis?.some(
        (p: any) =>
          (typeof p === "string" && p.toLowerCase() === "franqueado") ||
          (typeof p === "object" && p?.nome?.toLowerCase() === "franqueado")
      );

      setIsFranqueado(isFranqueadoUser);
      setUnidadeId(user.unidade_id || "");

      if (isFranqueadoUser) {
        carregarUnidades();
      }
    }
  }, []);

  const carregarUnidades = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades?pageSize=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const unidadesData = data.items || data;
        setUnidades(unidadesData);
      }
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
    }
  };

  useEffect(() => {
    if (dataInicio && dataFim) {
      carregarTransacoes();
    }
  }, [dataInicio, dataFim, tipoFilter, categoriaFilter, unidadeSelecionada]);

  const carregarTransacoes = async () => {
    try {
      const token = localStorage.getItem("token");
      const unidadeAtual =
        unidadeSelecionada === "todas" ? "" : unidadeSelecionada;
      const unidadeParam = unidadeAtual || unidadeId;

      // Franqueados podem ver todas as unidades (unidadeParam vazio)
      if (!unidadeParam && !isFranqueado) {
        console.warn("⚠️ Usuário sem unidade_id - aguardando dados do usuário");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        data_inicio: dataInicio,
        data_fim: dataFim,
      });

      if (unidadeParam) {
        params.append("unidade_id", unidadeParam);
      }

      if (tipoFilter !== "all") {
        params.append("tipo", tipoFilter);
      }

      if (categoriaFilter !== "all") {
        params.append("categoria", categoriaFilter);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transacoes?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTransacoes(data);
      } else {
        console.error(
          " Erro na resposta:",
          response.status,
          await response.text()
        );
      }
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      setLoading(false);
    }
  };

  const handleExportar = () => {
    // Criar CSV
    const headers = ["Data", "Tipo", "Origem", "Descrição", "Valor"];
    const rows = transacoes.map((t) => [
      formatDate(t.data || t.data_transacao),
      t.tipo,
      t.origem,
      t.descricao || "-",
      Number(t.valor || 0).toFixed(2),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato_${dataInicio}_${dataFim}.csv`;
    a.click();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTipoBadge = (tipo: string) => {
    const badges = {
      RECEITA: (
        <Badge className="bg-green-100 text-green-800">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          Receita
        </Badge>
      ),
      ENTRADA: (
        <Badge className="bg-green-100 text-green-800">
          <ArrowUpRight className="h-3 w-3 mr-1" />
          Receita
        </Badge>
      ),
      DESPESA: (
        <Badge className="bg-red-100 text-red-800">
          <ArrowDownRight className="h-3 w-3 mr-1" />
          Despesa
        </Badge>
      ),
      SAIDA: (
        <Badge className="bg-red-100 text-red-800">
          <ArrowDownRight className="h-3 w-3 mr-1" />
          Despesa
        </Badge>
      ),
      TRANSFERENCIA: (
        <Badge className="bg-blue-100 text-blue-800">Transferência</Badge>
      ),
    };
    return badges[tipo as keyof typeof badges] || null;
  };

  const totais = {
    receitas: transacoes
      .filter((t) => t.tipo === "RECEITA" || t.tipo === "ENTRADA")
      .reduce((sum, t) => sum + Number(t.valor || 0), 0),
    despesas: transacoes
      .filter((t) => t.tipo === "DESPESA" || t.tipo === "SAIDA")
      .reduce((sum, t) => sum + Number(t.valor || 0), 0),
    saldo: 0,
  };
  totais.saldo = totais.receitas - totais.despesas;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando extrato...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Extrato Financeiro
          </h1>
          <p className="text-gray-600 mt-1">Histórico completo de transações</p>
        </div>
        <Button onClick={handleExportar}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtro de Unidade */}
      <FiltroUnidade
        unidades={unidades}
        unidadeSelecionada={unidadeSelecionada}
        onUnidadeChange={(value) => {
          setUnidadeSelecionada(value);
        }}
        isFranqueado={isFranqueado}
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Receitas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totais.receitas)}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totais.despesas)}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Saldo do Período</p>
                <p
                  className={`text-2xl font-bold ${
                    totais.saldo >= 0 ? "text-blue-600" : "text-orange-600"
                  }`}
                >
                  {formatCurrency(totais.saldo)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Data Início
              </label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Data Fim
              </label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tipo
              </label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="RECEITA">Receitas</SelectItem>
                  <SelectItem value="DESPESA">Despesas</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferências</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Origem
              </label>
              <Select
                value={categoriaFilter}
                onValueChange={setCategoriaFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="MENSALIDADE">Mensalidade</SelectItem>
                  <SelectItem value="MATRICULA">Matrícula</SelectItem>
                  <SelectItem value="GRADUACAO">Graduação</SelectItem>
                  <SelectItem value="EVENTO">Evento</SelectItem>
                  <SelectItem value="PRODUTO">Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>Transações ({transacoes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transacoes.map((transacao) => (
              <div
                key={transacao.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    {transacao.tipo === "RECEITA" ||
                    transacao.tipo === "ENTRADA" ? (
                      <ArrowUpRight className="h-6 w-6 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {getTipoBadge(transacao.tipo)}
                      <Badge variant="outline">{transacao.origem}</Badge>
                    </div>
                    <p className="font-semibold text-gray-900 mt-1">
                      {transacao.descricao || "Sem descrição"}
                    </p>
                    {transacao.unidade_nome && (
                      <p className="text-sm text-gray-600">
                        🏢 Unidade: {transacao.unidade_nome}
                      </p>
                    )}
                    {transacao.aluno_nome && (
                      <p className="text-sm text-gray-600">
                        👤 Aluno: {transacao.aluno_nome}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(transacao.data || transacao.data_transacao)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-bold ${
                      transacao.tipo === "RECEITA" ||
                      transacao.tipo === "ENTRADA"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {transacao.tipo === "RECEITA" ||
                    transacao.tipo === "ENTRADA"
                      ? "+"
                      : "-"}
                    {formatCurrency(Number(transacao.valor || 0))}
                  </p>
                </div>
              </div>
            ))}
            {transacoes.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  Nenhuma transação encontrada
                </p>
                <p className="text-sm mt-2">
                  Tente ajustar os filtros ou o período selecionado
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
