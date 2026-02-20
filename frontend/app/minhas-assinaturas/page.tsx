"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatarData, formatarMoeda } from "@/lib/utils/dateUtils";
import {
  CreditCard,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  PauseCircle,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import AtualizarCartaoModal from "@/components/financeiro/AtualizarCartaoModal";

interface Assinatura {
  id: string;
  plano: {
    id: string;
    nome: string;
    tipo: string;
  };
  aluno: {
    id: string;
    nome_completo: string;
  };
  status: "ATIVA" | "PAUSADA" | "CANCELADA" | "EXPIRADA" | "INADIMPLENTE";
  valor: number;
  metodo_pagamento: string;
  dia_vencimento: number;
  data_inicio: string;
  data_fim?: string;
  proxima_cobranca?: string;
  retry_count?: number;
  token_cartao?: string;
  dados_pagamento?: {
    last4?: string;
    brand?: string;
    exp_month?: string;
    exp_year?: string;
  };
}

export default function MinhasAssinaturas() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCartao, setModalCartao] = useState<{
    open: boolean;
    assinatura: Assinatura | null;
  }>({ open: false, assinatura: null });

  useEffect(() => {
    carregarAssinaturas();
  }, []);

  const carregarAssinaturas = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas/minhas`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // Se endpoint não existe, buscar todas e filtrar no frontend
        const allResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (allResponse.ok) {
          const data = await allResponse.json();
          // Filtrar apenas assinaturas do usuário logado
          const userInfo = JSON.parse(localStorage.getItem("user") || "{}");
          const minhas = data.filter(
            (a: any) =>
              a.aluno?.usuario_id === userInfo.id ||
              a.aluno?.responsavel_id === userInfo.id
          );
          setAssinaturas(minhas);
        }
      } else {
        const data = await response.json();
        setAssinaturas(data);
      }

      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar assinaturas:", error);
      toast.error("Erro ao carregar assinaturas");
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
    > = {
      ATIVA: { variant: "default", icon: CheckCircle },
      PAUSADA: { variant: "secondary", icon: PauseCircle },
      CANCELADA: { variant: "outline", icon: XCircle },
      EXPIRADA: { variant: "outline", icon: XCircle },
      INADIMPLENTE: { variant: "destructive", icon: AlertCircle },
    };

    const config = variants[status] || variants.ATIVA;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const handleAtualizarCartao = (assinatura: Assinatura) => {
    if (assinatura.metodo_pagamento !== "CARTAO") {
      toast.error("Esta assinatura não utiliza cartão de crédito");
      return;
    }

    setModalCartao({ open: true, assinatura });
  };

  const handleCartaoAtualizado = () => {
    toast.success("Cartão atualizado! Recarregando...");
    carregarAssinaturas();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Minhas Assinaturas</h1>
        <p className="text-gray-600 mt-1">
          Gerencie suas assinaturas e métodos de pagamento
        </p>
      </div>

      {assinaturas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Nenhuma assinatura encontrada
            </h3>
            <p className="text-gray-500 text-center">
              Você ainda não possui assinaturas ativas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {assinaturas.map((assinatura) => (
            <Card key={assinatura.id} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">
                      {assinatura.plano.nome}
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {assinatura.aluno.nome_completo}
                    </p>
                  </div>
                  {getStatusBadge(assinatura.status)}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Informações da Assinatura */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Valor Mensal</p>
                        <p className="font-semibold text-lg">
                          {formatarMoeda(assinatura.valor)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">
                          Dia de Vencimento
                        </p>
                        <p className="font-semibold">
                          Todo dia {assinatura.dia_vencimento}
                        </p>
                      </div>
                    </div>

                    {assinatura.proxima_cobranca && (
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="text-sm text-gray-600">
                            Próxima Cobrança
                          </p>
                          <p className="font-semibold">
                            {formatarData(assinatura.proxima_cobranca)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="text-sm text-gray-600">Início</p>
                        <p className="font-semibold">
                          {formatarData(assinatura.data_inicio)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Método de Pagamento */}
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard className="h-5 w-5 text-gray-700" />
                        <p className="font-semibold">Método de Pagamento</p>
                      </div>

                      {assinatura.metodo_pagamento === "CARTAO" ? (
                        <div className="space-y-3">
                          {assinatura.dados_pagamento?.last4 ? (
                            <>
                              <div className="space-y-1">
                                <p className="text-sm text-gray-600">Cartão</p>
                                <p className="font-mono font-semibold">
                                  **** **** ****{" "}
                                  {assinatura.dados_pagamento.last4}
                                </p>
                              </div>

                              {assinatura.dados_pagamento.brand && (
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-600">
                                    Bandeira
                                  </p>
                                  <p className="font-semibold">
                                    {assinatura.dados_pagamento.brand}
                                  </p>
                                </div>
                              )}

                              {assinatura.dados_pagamento.exp_month &&
                                assinatura.dados_pagamento.exp_year && (
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-600">
                                      Validade
                                    </p>
                                    <p className="font-semibold">
                                      {assinatura.dados_pagamento.exp_month}/
                                      {assinatura.dados_pagamento.exp_year}
                                    </p>
                                  </div>
                                )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Cartão não cadastrado
                            </p>
                          )}

                          <Button
                            onClick={() => handleAtualizarCartao(assinatura)}
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Atualizar Cartão
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">
                          {assinatura.metodo_pagamento}
                        </p>
                      )}
                    </div>

                    {/* Alertas */}
                    {assinatura.status === "INADIMPLENTE" && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-900">
                              Assinatura Inadimplente
                            </p>
                            <p className="text-sm text-red-700 mt-1">
                              {assinatura.retry_count && assinatura.retry_count >= 3
                                ? "Foram realizadas 3 tentativas de cobrança sem sucesso."
                                : "Não conseguimos processar o pagamento."}
                            </p>
                            {assinatura.metodo_pagamento === "CARTAO" && (
                              <p className="text-sm text-red-700 mt-1">
                                Atualize o cartão para reativar sua assinatura.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {assinatura.retry_count &&
                      assinatura.retry_count > 0 &&
                      assinatura.retry_count < 3 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-semibold text-yellow-900">
                                Atenção: Tentativa {assinatura.retry_count}/3
                              </p>
                              <p className="text-sm text-yellow-700 mt-1">
                                Houve falha no pagamento. Faremos nova tentativa
                                em breve.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Atualizar Cartão */}
      <AtualizarCartaoModal
        assinatura={modalCartao.assinatura}
        open={modalCartao.open}
        onClose={() => setModalCartao({ open: false, assinatura: null })}
        onSuccess={handleCartaoAtualizado}
      />
    </div>
  );
}
