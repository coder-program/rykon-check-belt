"use client";

import { useState, useEffect } from "react";
import dayjs from "dayjs";
import ProtegerRotaFinanceira from "@/components/financeiro/ProtegerRotaFinanceira";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Trash2,
  Edit,
  DollarSign,
} from "lucide-react";
import FiltroUnidade from "@/components/financeiro/FiltroUnidade";
import { useFiltroUnidade } from "@/hooks/useFiltroUnidade";

interface Despesa {
  id: string;
  unidade_id: string;
  categoria: string;
  descricao: string;
  valor: number;
  recorrencia?: "UNICA" | "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
  data_vencimento: string;
  data_pagamento?: string;
  status: "A_PAGAR" | "PAGA" | "ATRASADA" | "CANCELADA" | "PARCIALMENTE_PAGA";
  metodo_pagamento?: string;
  aprovado: boolean;
  aprovado_por_id?: string;
  observacoes?: string;
  anexo_url?: string;
}

const CATEGORIAS_DESPESA = [
  "SISTEMA",
  "ALUGUEL",
  "LUZ",
  "AGUA",
  "INTERNET",
  "TELEFONE",
  "SALARIO",
  "FORNECEDOR",
  "MANUTENCAO",
  "MATERIAL",
  "LIMPEZA",
  "MARKETING",
  "TAXA",
  "OUTRO",
];

const RECORRENCIAS = [
  { value: "UNICA", label: "Única" },
  { value: "MENSAL", label: "Mensal" },
  { value: "TRIMESTRAL", label: "Trimestral" },
  { value: "SEMESTRAL", label: "Semestral" },
  { value: "ANUAL", label: "Anual" },
];

export default function ContasAPagar() {
  const {
    isFranqueado,
    unidades,
    unidadeSelecionada,
    unidadeIdAtual,
    setUnidadeSelecionada,
  } = useFiltroUnidade();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [filteredDespesas, setFilteredDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [showBaixaDialog, setShowBaixaDialog] = useState(false);
  const [despesaBaixa, setDespesaBaixa] = useState<Despesa | null>(null);
  const [dataPagamento, setDataPagamento] = useState("");
  const [observacoesBaixa, setObservacoesBaixa] = useState("");
  const [mensagemModal, setMensagemModal] = useState<{
    aberto: boolean;
    titulo: string;
    descricao: string;
    tipo: "sucesso" | "erro" | "confirmacao";
    onConfirm?: () => void;
  }>({
    aberto: false,
    titulo: "",
    descricao: "",
    tipo: "sucesso",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBaixando, setIsBaixando] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    unidade_id: "",
    categoria: "",
    descricao: "",
    valor: "",
    recorrencia: "UNICA",
    data_vencimento: "",
    observacoes: "",
  });
  const [diaVencimento, setDiaVencimento] = useState<string>("");

  useEffect(() => {
    carregarDespesas();
  }, [unidadeSelecionada]);

  useEffect(() => {
    filtrarDespesas();
  }, [despesas, searchTerm, statusFilter, categoriaFilter, dataInicio, dataFim]);

  const carregarDespesas = async () => {
    try {
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();
      if (unidadeIdAtual) {
        params.append("unidadeId", unidadeIdAtual);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/despesas?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDespesas(data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar despesas:", error);
      setLoading(false);
    }
  };

  const filtrarDespesas = () => {
    let filtered = despesas;

    // Sempre filtrar despesas canceladas (excluídas logicamente)
    filtered = filtered.filter((d) => d.status !== "CANCELADA");

    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    if (categoriaFilter !== "all") {
      filtered = filtered.filter((d) => d.categoria === categoriaFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (d) =>
          d.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.categoria.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dataInicio) {
      filtered = filtered.filter(
        (d) => d.data_vencimento && !dayjs(d.data_vencimento).isBefore(dayjs(dataInicio), 'day')
      );
    }

    if (dataFim) {
      filtered = filtered.filter(
        (d) => d.data_vencimento && !dayjs(d.data_vencimento).isAfter(dayjs(dataFim), 'day')
      );
    }

    setFilteredDespesas(filtered);
  };

  const mostrarMensagem = (
    titulo: string,
    descricao: string,
    tipo: "sucesso" | "erro" = "sucesso"
  ) => {
    setMensagemModal({
      aberto: true,
      titulo,
      descricao,
      tipo,
    });
  };

  const mostrarConfirmacao = (
    titulo: string,
    descricao: string,
    onConfirm: () => void
  ) => {
    setMensagemModal({
      aberto: true,
      titulo,
      descricao,
      tipo: "confirmacao",
      onConfirm,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    // Validar valor maior que zero
    const valorNumerico = parseFloat(formData.valor);
    if (valorNumerico <= 0) {
      mostrarMensagem(
        "Valor Inválido",
        "O valor da despesa deve ser maior que zero",
        "erro"
      );
      return;
    }

    // Validar data de vencimento no ano vigente
    if (formData.data_vencimento) {
      const dataVencimento = dayjs(formData.data_vencimento);
      const anoAtual = dayjs().year();
      const anoVencimento = dataVencimento.year();

      if (anoVencimento !== anoAtual) {
        mostrarMensagem(
          "Data Inválida",
          `A data de vencimento deve ser do ano vigente (${anoAtual})`,
          "erro"
        );
        return;
      }
    }

    const userData = localStorage.getItem("user");
    const user = JSON.parse(userData || "{}");

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const url = editingDespesa
        ? `${process.env.NEXT_PUBLIC_API_URL}/despesas/${editingDespesa.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/despesas`;

      const payload = {
        ...formData,
        valor: parseFloat(formData.valor),
        unidade_id: formData.unidade_id || user.unidade_id,
      };

      const response = await fetch(url, {
        method: editingDespesa ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowDialog(false);
        resetForm();
        carregarDespesas();
        mostrarMensagem(
          "Sucesso!",
          editingDespesa ? "Despesa atualizada!" : "Despesa criada!",
          "sucesso"
        );
      } else {
        mostrarMensagem("Erro", "Erro ao salvar despesa", "erro");
      }
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      mostrarMensagem("Erro", "Erro ao salvar despesa", "erro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (despesa: Despesa) => {
    setEditingDespesa(despesa);
    setFormData({
      unidade_id: despesa.unidade_id,
      categoria: despesa.categoria,
      descricao: despesa.descricao,
      valor: despesa.valor.toString(),
      recorrencia: despesa.recorrencia || "UNICA",
      data_vencimento: despesa.data_vencimento.split("T")[0],
      observacoes: despesa.observacoes || "",
    });

    // Se for recorrente, extrair o dia do vencimento
    if (despesa.recorrencia && despesa.recorrencia !== "UNICA") {
      const dia = dayjs(despesa.data_vencimento).date();
      setDiaVencimento(dia.toString());
    } else {
      setDiaVencimento("");
    }

    setShowDialog(true);
  };

  const handleDelete = async (despesa: Despesa) => {
    // Validar se a despesa já foi paga
    if (despesa.status === "PAGA") {
      mostrarMensagem(
        "Ação não permitida",
        "Não é possível excluir uma despesa que já foi paga.",
        "erro"
      );
      return;
    }

    mostrarConfirmacao(
      "Excluir Despesa",
      "Deseja realmente excluir esta despesa?",
      async () => {
        if (isDeleting) {
          return;
        }

        setIsDeleting(despesa.id);
        try {
          const token = localStorage.getItem("token");
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/despesas/${despesa.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.ok) {
            await carregarDespesas();
            mostrarMensagem("Sucesso!", "Despesa excluída!", "sucesso");
          } else {
            const errorText = await response.text();
            console.error("❌ Erro ao excluir:", response.status, errorText);
            mostrarMensagem("Erro", "Erro ao excluir despesa", "erro");
          }
        } catch (error) {
          console.error("Erro ao excluir despesa:", error);
          mostrarMensagem("Erro", "Erro ao excluir despesa", "erro");
        } finally {
          setIsDeleting(null);
        }
      }
    );
  };

  const handleBaixa = async () => {
    if (!despesaBaixa) return;

    if (isBaixando) {
      return;
    }

    // Validar data de pagamento
    const dataSelecionada = dayjs(dataPagamento);
    const hoje = dayjs();

    // Verificar se a data está no ano atual
    if (dataSelecionada.year() !== hoje.year()) {
      mostrarMensagem(
        "Data Inválida",
        "A data de pagamento deve ser do ano vigente (" + hoje.year() + ").",
        "erro"
      );
      return;
    }

    // Verificar se a data não está no futuro
    if (dataSelecionada.isAfter(hoje, 'day')) {
      mostrarMensagem(
        "Data Inválida",
        "A data de pagamento não pode ser no futuro.",
        "erro"
      );
      return;
    }

    setIsBaixando(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/despesas/${despesaBaixa.id}/baixar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            data_pagamento:
              dataPagamento || dayjs().format('YYYY-MM-DD'),
            observacoes: observacoesBaixa,
          }),
        }
      );

      if (response.ok) {
        setShowBaixaDialog(false);
        setDespesaBaixa(null);
        setDataPagamento("");
        setObservacoesBaixa("");
        carregarDespesas();
        mostrarMensagem("Sucesso!", "Despesa paga com sucesso!", "sucesso");
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.message ||
          errorData?.error ||
          `Erro ao dar baixa na despesa (Status: ${response.status})`;
        console.error("Erro ao dar baixa:", errorData);
        mostrarMensagem("Erro", errorMessage, "erro");
      }
    } catch (error) {
      console.error("Erro ao dar baixa:", error);
      mostrarMensagem(
        "Erro",
        "Erro ao dar baixa na despesa: " +
          (error instanceof Error ? error.message : "Erro desconhecido"),
        "erro"
      );
    } finally {
      setIsBaixando(false);
    }
  };

  const openBaixaDialog = (despesa: Despesa) => {
    setDespesaBaixa(despesa);
    setDataPagamento(dayjs().format('YYYY-MM-DD'));
    setObservacoesBaixa("");
    setShowBaixaDialog(true);
  };

  const resetForm = () => {
    setEditingDespesa(null);
    setFormData({
      unidade_id: "",
      categoria: "",
      descricao: "",
      valor: "",
      recorrencia: "UNICA",
      data_vencimento: "",
      observacoes: "",
    });
    setDiaVencimento("");
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      A_PAGAR: <Badge className="bg-yellow-100 text-yellow-800">A Pagar</Badge>,
      PAGA: <Badge className="bg-green-100 text-green-800">Paga</Badge>,
      ATRASADA: <Badge className="bg-red-100 text-red-800">Atrasada</Badge>,
      CANCELADA: <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>,
      PARCIALMENTE_PAGA: (
        <Badge className="bg-blue-100 text-blue-800">Parcialmente Paga</Badge>
      ),
    };
    return badges[status as keyof typeof badges] || null;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return dayjs(date).format('DD/MM/YYYY');
  };

  const totais = {
    pendente: despesas
      .filter((d) => d.status === "A_PAGAR")
      .reduce((sum, d) => sum + Number(d.valor || 0), 0),
    atrasada: despesas
      .filter((d) => d.status === "ATRASADA")
      .reduce((sum, d) => sum + Number(d.valor || 0), 0),
    paga: despesas
      .filter((d) => d.status === "PAGA")
      .reduce((sum, d) => sum + Number(d.valor || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando despesas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas a Pagar</h1>
          <p className="text-gray-600 mt-1">Gerencie as despesas da unidade</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Despesa
        </Button>
      </div>

      {/* Filtro de Unidade */}
      <FiltroUnidade
        unidades={unidades}
        unidadeSelecionada={unidadeSelecionada}
        onUnidadeChange={setUnidadeSelecionada}
        isFranqueado={isFranqueado}
      />

      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(totais.pendente)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Atrasado</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totais.atrasada)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pago no Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totais.paga)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar despesas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIAS_DESPESA.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="A_PAGAR">A Pagar</SelectItem>
                  <SelectItem value="ATRASADA">Atrasada</SelectItem>
                  <SelectItem value="PAGA">Paga</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Vencimento (de)</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Vencimento (até)</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {(dataInicio || dataFim || searchTerm || statusFilter !== "all" || categoriaFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDataInicio("");
                    setDataFim("");
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCategoriaFilter("all");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Despesas */}
      <Card>
        <CardHeader>
          <CardTitle>Despesas ({filteredDespesas.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Descrição</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Recorrência</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-left">Pago em</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDespesas.map((despesa) => (
                  <tr key={despesa.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {despesa.descricao}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{despesa.categoria}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(despesa.status)}
                    </td>
                    <td className="px-4 py-3">
                      {despesa.recorrencia && despesa.recorrencia !== "UNICA" ? (
                        <Badge className="bg-blue-100 text-blue-800">{despesa.recorrencia}</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">Única</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(despesa.data_vencimento)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {despesa.data_pagamento ? formatDate(despesa.data_pagamento) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(despesa.valor)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {(despesa.status === "A_PAGAR" || despesa.status === "ATRASADA") && (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openBaixaDialog(despesa)}
                            title="Registrar Pagamento"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(despesa)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(despesa)}
                          disabled={despesa.status === "PAGA"}
                          className={despesa.status === "PAGA" ? "opacity-50 cursor-not-allowed" : ""}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDespesas.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhuma despesa encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Despesa */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDespesa ? "Editar Despesa" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seletor de Unidade (apenas para franqueados) */}
            {isFranqueado && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Unidade *
                </label>
                <Select
                  value={formData.unidade_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unidade_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        🏢 {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Categoria
                </label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoria: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_DESPESA.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Recorrência
                </label>
                <Select
                  value={formData.recorrencia}
                  onValueChange={(value) =>
                    setFormData({ ...formData, recorrencia: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RECORRENCIAS.map((rec) => (
                      <SelectItem key={rec.value} value={rec.value}>
                        {rec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Descrição
              </label>
              <Input
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Valor
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  required
                />
              </div>

              {/* Campo de vencimento condicional */}
              {formData.recorrencia === "UNICA" ? (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Data de Vencimento
                  </label>
                  <Input
                    type="date"
                    value={formData.data_vencimento}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        data_vencimento: e.target.value,
                      })
                    }
                    min={`${dayjs().year()}-01-01`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Data deve ser do ano vigente ({dayjs().year()})
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Dia do Vencimento (1-31)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 10"
                    value={diaVencimento}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setDiaVencimento(valor);

                      // Só atualiza data_vencimento se o valor for válido
                      const dia = parseInt(valor);
                      if (valor && dia >= 1 && dia <= 31) {
                        // Se estiver editando e já tiver uma data, preserva mês/ano
                        let novaDataDayjs;
                        if (formData.data_vencimento) {
                          novaDataDayjs = dayjs(formData.data_vencimento).date(dia);
                        } else {
                          // Se for nova despesa, tenta o mês atual; só avança para o próximo se o dia já passou
                          const hoje = dayjs();
                          const tentativa = hoje.date(dia);
                          novaDataDayjs = !tentativa.isBefore(hoje, 'day')
                            ? tentativa
                            : hoje.add(1, 'month').date(dia);
                        }
                        setFormData({
                          ...formData,
                          data_vencimento: novaDataDayjs.format('YYYY-MM-DD'),
                        });
                      } else if (!valor) {
                        // Limpa a data se o campo ficar vazio
                        setFormData({
                          ...formData,
                          data_vencimento: "",
                        });
                      }
                    }}
                    required
                  />
                  {diaVencimento &&
                    parseInt(diaVencimento) >= 1 &&
                    parseInt(diaVencimento) <= 31 && (
                      <p className="text-xs text-gray-500 mt-1">
                        A despesa vencerá todo dia {diaVencimento} do mês
                      </p>
                    )}
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Observações
              </label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Processando..."
                  : (editingDespesa ? "Atualizar" : "Criar") + " Despesa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Baixa */}
      <Dialog open={showBaixaDialog} onOpenChange={setShowBaixaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar Baixa em Despesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {despesaBaixa && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-900">
                  {despesaBaixa.descricao}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Categoria: {despesaBaixa.categoria}
                </p>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {formatCurrency(despesaBaixa.valor)}
                </p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Data do Pagamento *
              </label>
              <Input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                min={`${dayjs().year()}-01-01`}
                max={dayjs().format('YYYY-MM-DD')}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Apenas datas do ano vigente ({dayjs().year()})
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Observações (opcional)
              </label>
              <Textarea
                value={observacoesBaixa}
                onChange={(e) => setObservacoesBaixa(e.target.value)}
                rows={3}
                placeholder="Ex: Pago via PIX, comprovante anexado..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBaixaDialog(false)}
              disabled={isBaixando}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBaixa}
              className="bg-green-600 hover:bg-green-700"
              disabled={isBaixando}
            >
              {isBaixando ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Mensagem */}
      <AlertDialog
        open={mensagemModal.aberto}
        onOpenChange={(aberto) =>
          setMensagemModal({ ...mensagemModal, aberto })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{mensagemModal.titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {mensagemModal.descricao}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {mensagemModal.tipo === "confirmacao" ? (
              <>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    mensagemModal.onConfirm?.();
                    setMensagemModal({ ...mensagemModal, aberto: false });
                  }}
                >
                  Confirmar
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={() =>
                  setMensagemModal({ ...mensagemModal, aberto: false })
                }
              >
                OK
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
