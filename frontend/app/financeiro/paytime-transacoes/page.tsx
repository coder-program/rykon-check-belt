"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QrCode,
  CreditCard,
  FileText,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transacao {
  id: string;
  tipo: string;
  origem: string;
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  status: string;
  metodo_pagamento: string;
  paytime_transaction_id?: string;
  paytime_payment_type?: string;
  paytime_metadata?: any;
  aluno?: {
    nome_completo: string;
    cpf: string;
  };
  fatura?: {
    numero_fatura: string;
  };
}

export default function TransacoesPaytimePage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("all");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("all");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    carregarTransacoes();
  }, []);

  const carregarTransacoes = async () => {
    try {
      const token = localStorage.getItem("token");
      const unidadeAtual = localStorage.getItem("unidade_id");

      if (!token || !unidadeAtual) {
        console.error("Token ou unidade não encontrada");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transacoes?unidade_id=${unidadeAtual}&tipo=ENTRADA`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Filtrar apenas transações com Paytime
        const transacoesPaytime = data.filter((t: Transacao) => t.paytime_transaction_id);
        setTransacoes(transacoesPaytime);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      CONFIRMADA: "bg-green-100 text-green-800",
      PENDENTE: "bg-yellow-100 text-yellow-800",
      CANCELADA: "bg-red-100 text-red-800",
      ESTORNADA: "bg-gray-100 text-gray-800",
    };

    const labels = {
      CONFIRMADA: "Confirmada",
      PENDENTE: "Pendente",
      CANCELADA: "Cancelada",
      ESTORNADA: "Estornada",
    };

    return (
      <Badge className={styles[status as keyof typeof styles]}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getMetodoIcon = (metodo?: string) => {
    switch (metodo) {
      case "PIX":
        return <QrCode className="h-5 w-5 text-blue-600" />;
      case "CREDIT":
      case "DEBIT":
        return <CreditCard className="h-5 w-5 text-purple-600" />;
      case "BILLET":
        return <FileText className="h-5 w-5 text-orange-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMetodoLabel = (metodo?: string) => {
    const labels = {
      PIX: "PIX",
      CREDIT: "Cartão de Crédito",
      DEBIT: "Cartão de Débito",
      BILLET: "Boleto",
    };
    return labels[metodo as keyof typeof labels] || metodo;
  };

  const transacoesFiltradas = transacoes.filter((t) => {
    if (filtroStatus !== "all" && t.status !== filtroStatus) return false;
    if (filtroMetodo !== "all" && t.paytime_payment_type !== filtroMetodo) return false;
    if (busca && !t.descricao.toLowerCase().includes(busca.toLowerCase()) &&
        !t.aluno?.nome_completo.toLowerCase().includes(busca.toLowerCase()) &&
        !t.paytime_transaction_id?.includes(busca)) return false;
    return true;
  });

  const totais = {
    confirmadas: transacoesFiltradas.filter((t) => t.status === "CONFIRMADA").reduce((acc, t) => acc + Number(t.valor), 0),
    pendentes: transacoesFiltradas.filter((t) => t.status === "PENDENTE").reduce((acc, t) => acc + Number(t.valor), 0),
    canceladas: transacoesFiltradas.filter((t) => t.status === "CANCELADA").reduce((acc, t) => acc + Number(t.valor), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando transações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transações Paytime</h1>
          <p className="text-gray-600 mt-1">
            Pagamentos processados online via PIX, Cartão e Boleto
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totais.confirmadas)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(totais.pendentes)}
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
                <p className="text-sm text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totais.canceladas)}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar transação, aluno..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="CONFIRMADA">Confirmadas</SelectItem>
                <SelectItem value="PENDENTE">Pendentes</SelectItem>
                <SelectItem value="CANCELADA">Canceladas</SelectItem>
                <SelectItem value="ESTORNADA">Estornadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
              <SelectTrigger>
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Métodos</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="CREDIT">Cartão Crédito</SelectItem>
                <SelectItem value="DEBIT">Cartão Débito</SelectItem>
                <SelectItem value="BILLET">Boleto</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Transações */}
      <Card>
        <CardHeader>
          <CardTitle>
            {transacoesFiltradas.length} Transação(ões)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transacoesFiltradas.map((transacao) => (
              <div
                key={transacao.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="mt-1">
                    {getMetodoIcon(transacao.paytime_payment_type)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{transacao.descricao}</p>
                      {getStatusBadge(transacao.status)}
                    </div>

                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <p>
                        {transacao.aluno?.nome_completo} •{" "}
                        {getMetodoLabel(transacao.paytime_payment_type)}
                      </p>
                      <p className="text-xs">
                        ID Paytime: {transacao.paytime_transaction_id}
                      </p>
                      {transacao.fatura && (
                        <p className="text-xs">
                          Fatura: {transacao.fatura.numero_fatura}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(transacao.data)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold">
                    {formatCurrency(Number(transacao.valor))}
                  </p>
                </div>
              </div>
            ))}

            {transacoesFiltradas.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  Nenhuma transação encontrada
                </p>
                <p className="text-sm mt-2">
                  Ajuste os filtros ou tente uma nova busca
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
