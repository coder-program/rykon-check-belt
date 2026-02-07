"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowLeft,
  CreditCard,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ProcessarPagamentoModal from "@/components/financeiro/ProcessarPagamentoModal";

interface Fatura {
  id: string;
  numero_fatura: string;
  valor_original?: number | string;
  valor_pago?: number | string;
  status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
  data_vencimento: string;
  data_pagamento?: string;
  metodo_pagamento?: string;
  observacoes?: string;
}

export default function MinhasFaturas() {
  const router = useRouter();
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [faturaParaPagar, setFaturaParaPagar] = useState<Fatura | null>(null);
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);

  useEffect(() => {
    carregarMinhasFaturas();
  }, []);

  const carregarMinhasFaturas = async () => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (!token || !userData) {
        console.error("Token ou usuário não encontrado");
        setLoading(false);
        return;
      }

      const user = JSON.parse(userData);

      // Buscar o aluno_id do usuário logado
      const alunoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/alunos/usuario/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!alunoResponse.ok) {
        console.error("Erro ao buscar aluno:", alunoResponse.statusText);
        setLoading(false);
        return;
      }

      const aluno = await alunoResponse.json();

      if (!aluno) {
        console.warn("Nenhum aluno encontrado para este usuário");
        setLoading(false);
        return;
      }

      // Buscar faturas do aluno
      const faturasResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/faturas/aluno/${aluno.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (faturasResponse.ok) {
        const faturasData = await faturasResponse.json();
        setFaturas(faturasData);
      } else {
        console.error("Erro ao buscar faturas:", faturasResponse.statusText);
      }

      setLoading(false);
    } catch (error) {
      console.error(" Erro ao carregar faturas:", error);
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
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const handlePagarOnline = (fatura: Fatura) => {
    setFaturaParaPagar(fatura);
    setModalPagamentoOpen(true);
  };

  const handlePagamentoSuccess = () => {
    carregarMinhasFaturas();
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDENTE: (
        <Badge className="bg-yellow-100 text-yellow-800">
          <Clock className="mr-1 h-3 w-3" />
          Pendente
        </Badge>
      ),
      PAGA: (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Paga
        </Badge>
      ),
      ATRASADA: (
        <Badge className="bg-red-100 text-red-800">
          <AlertCircle className="mr-1 h-3 w-3" />
          Atrasada
        </Badge>
      ),
      CANCELADA: <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>,
    };
    return badges[status as keyof typeof badges] || null;
  };

  const totais = {
    pendente: faturas
      .filter((f) => f.status === "PENDENTE")
      .reduce((sum, f) => sum + (parseFloat(f.valor_original?.toString()) || 0), 0),
    atrasada: faturas
      .filter((f) => f.status === "ATRASADA")
      .reduce((sum, f) => sum + (parseFloat(f.valor_original?.toString()) || 0), 0),
    proximoVencimento: faturas
      .filter((f) => f.status === "PENDENTE")
      .sort(
        (a, b) =>
          new Date(a.data_vencimento).getTime() -
          new Date(b.data_vencimento).getTime()
      )[0],
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando suas faturas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Minhas Faturas</h1>
          <p className="text-gray-600 mt-1">Acompanhe seus pagamentos</p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
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
                <p className="text-sm text-gray-600">Em Atraso</p>
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
                <p className="text-sm text-gray-600">Próximo Vencimento</p>
                {totais.proximoVencimento ? (
                  <p className="text-lg font-bold text-blue-600">
                    {formatDate(totais.proximoVencimento.data_vencimento)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Nenhuma pendente</p>
                )}
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Faturas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {faturas.map((fatura) => (
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
                  <p className="text-sm text-gray-500 mt-1">
                    Vencimento: {formatDate(fatura.data_vencimento)}
                  </p>
                  {fatura.status === "PAGA" && fatura.data_pagamento && (
                    <p className="text-xs text-green-600 mt-1">
                      Pago em {formatDate(fatura.data_pagamento)} via{" "}
                      {fatura.metodo_pagamento}
                    </p>
                  )}
                </div>
                <div className="text-right">
                {(fatura.status === "PENDENTE" ||
                  fatura.status === "ATRASADA") && (
                  <Button
                    onClick={() => handlePagarOnline(fatura)}
                    className="ml-4"
                    variant="default"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pagar Online
                  </Button>
                )}
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(parseFloat(fatura.valor_original?.toString()) || 0)}
                  </p>
                  {fatura.status === "ATRASADA" && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Pagamento em atraso
                    </p>
                  )}
                </div>
              </div>
            ))}
            {faturas.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma fatura encontrada</p>
                <p className="text-sm mt-2">
                  Você não possui faturas cadastradas no momento
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informação de Pagamento */}
      {(totais.pendente > 0 || totais.atrasada > 0) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900">Como Pagar</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Entre em contato com a recepção da sua unidade para efetuar o
                  pagamento. Você pode pagar via PIX, cartão, dinheiro ou
                  boleto.
                </p>
                {totais.atrasada > 0 && (
                  <p className="text-sm text-red-600 font-semibold mt-2">
                    ⚠️ Você possui faturas em atraso. Regularize sua situação
                    para continuar treinando.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Pagamento */}
      <ProcessarPagamentoModal
        fatura={faturaParaPagar}
        open={modalPagamentoOpen}
        onClose={() => setModalPagamentoOpen(false)}
        onSuccess={handlePagamentoSuccess}
      />
    </div>
  );
}
