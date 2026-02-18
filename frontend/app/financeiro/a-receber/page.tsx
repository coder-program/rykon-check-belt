"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatarData, formatarMoeda } from "@/lib/utils/dateUtils";
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
import {
  DollarSign,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  X,
  Plus,
  Receipt,
} from "lucide-react";
import FiltroUnidade from "@/components/financeiro/FiltroUnidade";
import { useFiltroUnidade } from "@/hooks/useFiltroUnidade";
import { toast } from "react-hot-toast";

interface Fatura {
  id: string;
  numero_fatura: string;
  assinatura_id: string;
  aluno_id: string;
  aluno_nome?: string;
  valor_original: number;
  valor_pago: number;
  status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
  data_vencimento: string;
  data_pagamento?: string;
  metodo_pagamento?: string;
  observacoes?: string;
  created_at: string;
}

export default function ContasAReceber() {
  const queryClient = useQueryClient();
  const {
    isFranqueado,
    unidades,
    unidadeSelecionada,
    unidadeIdAtual,
    setUnidadeSelecionada,
  } = useFiltroUnidade();
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [filteredFaturas, setFilteredFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerandoFaturas, setGerandoFaturas] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);
  const [showPagarDialog, setShowPagarDialog] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState("");
  const [valorPago, setValorPago] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [mensagemModal, setMensagemModal] = useState<{
    aberto: boolean;
    titulo: string;
    descricao: string;
    tipo: "sucesso" | "erro";
  }>({
    aberto: false,
    titulo: "",
    descricao: "",
    tipo: "sucesso",
  });

  useEffect(() => {
    carregarFaturas();
  }, [unidadeSelecionada]);

  useEffect(() => {
    filtrarFaturas();
  }, [faturas, searchTerm, statusFilter]);

  const carregarFaturas = async () => {
    try {
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();
      if (unidadeIdAtual) {
        params.append("unidadeId", unidadeIdAtual);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/faturas?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFaturas(data);
      }
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar faturas:", error);
      setLoading(false);
    }
  };

  const filtrarFaturas = () => {
    let filtered = faturas;

    if (statusFilter !== "all") {
      filtered = filtered.filter((f) => f.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (f) =>
          f.numero_fatura.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.aluno_nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFaturas(filtered);
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

  const handlePagarFatura = async () => {
    if (!selectedFatura || !metodoPagamento || !valorPago) {
      mostrarMensagem(
        "Atenção",
        "Preencha todos os campos obrigatórios",
        "erro"
      );
      return;
    }

    // Validar valor maior que zero
    const valorNumerico = parseFloat(valorPago);
    if (valorNumerico <= 0) {
      mostrarMensagem(
        "Valor Inválido",
        "O valor do pagamento deve ser maior que zero",
        "erro"
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/faturas/${selectedFatura.id}/baixar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            metodo_pagamento: metodoPagamento,
            valor_pago: parseFloat(valorPago),
            observacoes,
          }),
        }
      );

      if (response.ok) {
        setShowPagarDialog(false);
        setSelectedFatura(null);
        setMetodoPagamento("");
        setValorPago("");
        setObservacoes("");
        carregarFaturas();
        queryClient.invalidateQueries({ queryKey: ["transacoes"] });
        mostrarMensagem(
          "Sucesso!",
          "Pagamento registrado com sucesso!",
          "sucesso"
        );
      } else {
        mostrarMensagem("Erro", "Erro ao registrar pagamento", "erro");
      }
    } catch (error) {
      console.error("Erro ao pagar fatura:", error);
      mostrarMensagem("Erro", "Erro ao registrar pagamento", "erro");
    }
  };

  const handleCancelarFatura = async () => {
    if (!selectedFatura) return;

    if (!motivoCancelamento.trim()) {
      mostrarMensagem(
        "Atenção",
        "Por favor, informe o motivo do cancelamento.",
        "erro"
      );
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/faturas/${selectedFatura.id}/cancelar`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            motivo: motivoCancelamento,
          }),
        }
      );

      if (response.ok) {
        setShowCancelarDialog(false);
        setSelectedFatura(null);
        setMotivoCancelamento("");
        carregarFaturas();
        queryClient.invalidateQueries({ queryKey: ["transacoes"] });
        mostrarMensagem(
          "Sucesso!",
          "Fatura cancelada com sucesso!",
          "sucesso"
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        mostrarMensagem(
          "Erro",
          errorData.message || "Erro ao cancelar fatura",
          "erro"
        );
      }
    } catch (error) {
      console.error("Erro ao cancelar fatura:", error);
      mostrarMensagem("Erro", "Erro ao cancelar fatura", "erro");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDENTE: (
        <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
      ),
      PAGA: <Badge className="bg-green-100 text-green-800">Paga</Badge>,
      ATRASADA: <Badge className="bg-red-100 text-red-800">Atrasada</Badge>,
      CANCELADA: <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>,
    };
    return badges[status as keyof typeof badges] || null;
  };

  // Removidas - usando formatarData e formatarMoeda do dateUtils

  const totais = {
    pendente: faturas
      .filter((f) => f.status === "PENDENTE")
      .reduce((sum, f) => sum + Number(f.valor_original || 0), 0),
    atrasada: faturas
      .filter((f) => f.status === "ATRASADA")
      .reduce((sum, f) => sum + Number(f.valor_original || 0), 0),
    paga: faturas
      .filter((f) => f.status === "PAGA")
      .reduce((sum, f) => sum + Number(f.valor_pago || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando faturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas a Receber</h1>
          <p className="text-gray-600 mt-1">
            Gerencie as faturas e recebimentos
          </p>
        </div>
        <Button
          onClick={async () => {
            if (gerandoFaturas) return;
            
            setGerandoFaturas(true);
            try {
              const token = localStorage.getItem("token");
              const params = new URLSearchParams();
              if (unidadeIdAtual) {
                params.append("unidade_id", unidadeIdAtual);
              }

              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/faturas/gerar-faturas-assinaturas?${params}`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (response.ok) {
                const result = await response.json();
                queryClient.invalidateQueries({ queryKey: ["transacoes"] });

                if (result.geradas === 0) {
                  mostrarMensagem(
                    "Informação",
                    "Nenhuma fatura foi gerada.\n\nPossíveis motivos:\n- Não há assinaturas ativas\n- Já existem faturas deste mês\n- As assinaturas não pertencem a esta unidade",
                    "erro"
                  );
                } else {
                  mostrarMensagem(
                    "Sucesso!",
                    `${result.geradas} fatura(s) gerada(s) com sucesso!`,
                    "sucesso"
                  );
                }
                carregarFaturas();
              } else {
                const errorText = await response.text();
                console.error(" Erro:", errorText);
                mostrarMensagem(
                  "Erro",
                  `Erro ao gerar faturas: ${response.status}\n${errorText}`,
                  "erro"
                );
              }
            } catch (error) {
              console.error(" Erro ao gerar faturas:", error);
              const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
              mostrarMensagem(
                "Erro",
                `Erro ao gerar faturas: ${errorMessage}`,
                "erro"
              );
            } finally {
              setGerandoFaturas(false);
            }
          }}
          variant="outline"
          disabled={gerandoFaturas}
        >
          <Plus className="mr-2 h-4 w-4" />
          {gerandoFaturas ? "Gerando Faturas..." : "Gerar Faturas das Assinaturas"}
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
                  {formatarMoeda(totais.pendente)}
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
                  {formatarMoeda(totais.atrasada)}
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
                <p className="text-sm text-gray-600">Recebido no Mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatarMoeda(totais.paga)}
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número da fatura ou nome do aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="ATRASADA">Atrasada</SelectItem>
                <SelectItem value="PAGA">Paga</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Faturas */}
      <Card>
        <CardHeader>
          <CardTitle>Faturas ({filteredFaturas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredFaturas.map((fatura) => (
              <div
                key={fatura.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-gray-900">
                      {fatura.numero_fatura}
                    </p>
                    {getStatusBadge(fatura.status)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Aluno: {fatura.aluno_nome || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Vencimento: {formatarData(fatura.data_vencimento)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    {formatarMoeda(Number(fatura.valor_original) || 0)}
                  </p>
                  {fatura.status === "PAGA" && fatura.data_pagamento && (
                    <div className="mt-1 space-y-2">
                      <p className="text-xs text-gray-500">
                        Pago em {formatarData(fatura.data_pagamento)}
                      </p>
                      <Button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem("token");
                            const response = await fetch(
                              `${process.env.NEXT_PUBLIC_API_URL}/faturas/${fatura.id}/recibo`,
                              {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );

                            if (!response.ok) {
                              throw new Error("Erro ao gerar recibo");
                            }

                            // Converter resposta para blob e fazer download
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `recibo-${fatura.numero_fatura}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);

                            toast.success("Recibo gerado com sucesso!");
                          } catch (error) {
                            console.error("Erro ao gerar recibo:", error);
                            toast.error("Erro ao gerar recibo");
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Receipt className="mr-1 h-4 w-4" />
                        Gerar Comprovante
                      </Button>
                    </div>
                  )}
                  {(fatura.status === "PENDENTE" ||
                    fatura.status === "ATRASADA") && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => {
                          setSelectedFatura(fatura);
                          setValorPago(fatura.valor_original.toString());
                          setShowPagarDialog(true);
                        }}
                        size="sm"
                      >
                        <DollarSign className="mr-1 h-4 w-4" />
                        Registrar Pagamento
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedFatura(fatura);
                          setShowCancelarDialog(true);
                        }}
                        size="sm"
                        variant="destructive"
                      >
                        <X className="mr-1 h-4 w-4" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredFaturas.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhuma fatura encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Pagamento */}
      <Dialog open={showPagarDialog} onOpenChange={setShowPagarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Fatura
              </label>
              <Input value={selectedFatura?.numero_fatura || ""} disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Método de Pagamento
              </label>
              <Select
                value={metodoPagamento}
                onValueChange={setMetodoPagamento}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="CARTAO">
                    Cartão de Crédito/Débito
                  </SelectItem>
                  <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="TED">TED/DOC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Valor Pago
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Observações (opcional)
              </label>
              <Input
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Informações adicionais sobre o pagamento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagarDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePagarFatura}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cancelamento */}
      <Dialog open={showCancelarDialog} onOpenChange={setShowCancelarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Fatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Fatura
              </label>
              <Input value={selectedFatura?.numero_fatura || ""} disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Valor
              </label>
              <Input
                value={
                  selectedFatura
                    ? formatarMoeda(Number(selectedFatura.valor_original))
                    : ""
                }
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Motivo do Cancelamento *
              </label>
              <Input
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Aluno cancelou matrícula, fatura duplicada, etc."
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Atenção:</strong> Esta ação não pode ser desfeita. A fatura será marcada como CANCELADA.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelarDialog(false);
                setMotivoCancelamento("");
              }}
            >
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelarFatura}>
              Confirmar Cancelamento
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
            <AlertDialogAction
              onClick={() =>
                setMensagemModal({ ...mensagemModal, aberto: false })
              }
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
