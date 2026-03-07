"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarData, formatarMoeda } from "@/lib/utils/dateUtils";
import dayjs from "dayjs";
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowLeft,
  CreditCard,
  Loader2,
  QrCode,
  Landmark,
  Banknote,
  Wallet,
  TriangleAlert,
  X,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import ProcessarPagamentoModal from "@/components/financeiro/ProcessarPagamentoModal";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Zap } from "lucide-react";

interface Fatura {
  id: string;
  numero_fatura: string;
  descricao?: string;
  valor_original?: number | string;
  valor_total?: number;
  valor_pago?: number | string;
  status: "PENDENTE" | "PAGA" | "ATRASADA" | "CANCELADA";
  data_vencimento: string;
  data_pagamento?: string;
  metodo_pagamento?: string;
  observacoes?: string;
  card_info?: {
    brand?: string | null;
    last4?: string | null;
    holder?: string | null;
  } | null;
  token_salvo?: boolean;
  card_info_assinatura?: {
    brand?: string | null;
    last4?: string | null;
  } | null;
  assinatura?: {
    plano?: {
      nome: string;
      tipo?: string;
    };
    metodo_pagamento?: string;
  };
}

export default function MinhasFaturas() {
  const router = useRouter();
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [faturaParaPagar, setFaturaParaPagar] = useState<Fatura | null>(null);
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);
  const [faturasComPagamentoPendente, setFaturasComPagamentoPendente] = useState<Map<string, { metodo: string; temBarcode: boolean }>>(new Map());
  const [alertVencimentoDismissed, setAlertVencimentoDismissed] = useState(false);
  const [alertVencidaDismissed, setAlertVencidaDismissed] = useState(false);
  const [confirmTokenPagar, setConfirmTokenPagar] = useState<Fatura | null>(null);
  const [loadingTokenPay, setLoadingTokenPay] = useState(false);
  const [tokenPayError, setTokenPayError] = useState<string | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<string | undefined>(undefined);

  useEffect(() => {
    carregarMinhasFaturas();
  }, []);

  const carregarMinhasFaturas = async () => {
    try {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (!token || !userData) {
        console.error("❌ Token ou usuário não encontrado");
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
        console.error("❌ Erro ao buscar aluno:", alunoResponse.status, alunoResponse.statusText);
        setLoading(false);
        return;
      }

      const aluno = await alunoResponse.json();

      if (!aluno) {
        console.warn("⚠️ Nenhum aluno encontrado para este usuário");
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
        const faturasData: Fatura[] = await faturasResponse.json();

        // Cross-reference: se qualquer fatura tem token_salvo=true, usamos para todas as faturas CARTAO
        const cardInfoRef = faturasData
          .filter((f) => f.card_info?.last4)
          .sort((a, b) => (b.data_pagamento || "").localeCompare(a.data_pagamento || ""))[0]
          ?.card_info;
        const anyTokenSalvo = faturasData.some((f) => f.token_salvo);
        const cardInfoTokenRef = faturasData.find((f) => f.token_salvo && f.card_info_assinatura?.last4)?.card_info_assinatura
          || faturasData.find((f) => f.token_salvo && f.card_info?.last4)?.card_info
          || cardInfoRef;

        const enriched = faturasData.map((f) => {
          const isCartao = ["CARTAO", "CARTAO_CREDITO"].includes(
            (f.metodo_pagamento || f.assinatura?.metodo_pagamento || "").toUpperCase()
          );
          if (!isCartao) return f;

          const hasLast4 = !!(f.card_info?.last4 || f.card_info_assinatura?.last4);
          const enrichedCard = !hasLast4 && cardInfoRef
            ? { brand: cardInfoRef.brand, last4: cardInfoRef.last4 }
            : f.card_info_assinatura;

          // Se qualquer assinatura do aluno tem token salvo, todas as faturas CARTAO podem usar
          const tokenSalvo = f.token_salvo || (anyTokenSalvo && isCartao);

          return {
            ...f,
            token_salvo: tokenSalvo,
            card_info_assinatura: enrichedCard || (tokenSalvo && cardInfoTokenRef
              ? { brand: cardInfoTokenRef.brand, last4: cardInfoTokenRef.last4 }
              : f.card_info_assinatura),
          };
        });

        setFaturas(enriched);
        
        // Buscar transações pendentes para cada fatura
        await verificarTransacoesPendentes(enriched, token);
      } else {
        console.error("❌ Erro ao buscar faturas:", faturasResponse.status, faturasResponse.statusText);
      }

      setLoading(false);
    } catch (error) {
      console.error("💥 Erro ao carregar faturas:", error);
      setLoading(false);
    }
  };

  const verificarTransacoesPendentes = async (faturasData: Fatura[], token: string) => {
    try {
      const faturaIds = faturasData
        .filter(f => f.status === "PENDENTE" || f.status === "ATRASADA")
        .map(f => f.id);
      
      if (faturaIds.length === 0) {
        setFaturasComPagamentoPendente(new Map());
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transacoes?status=PENDENTE`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const transacoes = await response.json();
        const transacoesDasFaturas = transacoes.filter(
          (t: any) => t.fatura_id && faturaIds.includes(t.fatura_id)
        );

        const mapaFaturas = new Map<string, { metodo: string; temBarcode: boolean }>();
        for (const t of transacoesDasFaturas) {
          mapaFaturas.set(t.fatura_id, {
            metodo: t.metodo_pagamento || "",
            temBarcode: !!(t.paytime_metadata?.barcode || t.paytime_metadata?.digitable_line),
          });
        }
        setFaturasComPagamentoPendente(mapaFaturas);

        // Sincronizar status de todos os pagamentos pendentes com o Paytime automaticamente.
        // Garante que pagamentos feitos externamente (sem webhook chegando no backend) sejam detectados.
        for (const transacao of transacoesDasFaturas) {
          try {
            const statusRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/financeiro/pagamentos-online/status/${transacao.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.pago === true || statusData.status === "CONFIRMADA") {
                // Boleto foi pago — recarregar faturas para refletir o status atualizado
                console.log(`✅ Transação ${transacao.id} confirmada — recarregando faturas`);
                await carregarMinhasFaturas();
                return;
              }
            }
          } catch (e) {
            // Ignorar erros individuais de sync
          }
        }
      }
    } catch (error) {
      console.error("⚠️ Erro ao verificar transações:", error);
    }
  };

  // Removidas - usando formatarData e formatarMoeda do dateUtils

  const handlePagarOnline = (fatura: Fatura) => {
    // Se tem cartão salvo, mostra diálogo de confirmação rápida
    if (fatura.token_salvo) {
      setTokenPayError(null);
      setConfirmTokenPagar(fatura);
      return;
    }
    abrirModalPagamento(fatura);
  };

  const abrirModalPagamento = (fatura: Fatura, initialTab?: string) => {
    const faturaParaModal = {
      ...fatura,
      valor_total: parseFloat(fatura.valor_original?.toString() || "0"),
      metodo_pagamento: fatura.metodo_pagamento || fatura.assinatura?.metodo_pagamento,
    };
    setFaturaParaPagar(faturaParaModal as any);
    setModalInitialTab(initialTab);
    setModalPagamentoOpen(true);
  };

  const alterarCartao = (fatura: Fatura) => {
    setConfirmTokenPagar(null);
    abrirModalPagamento(fatura, "cartao");
  };

  const pagarFaturaComToken = async () => {
    if (!confirmTokenPagar) return;
    setLoadingTokenPay(true);
    setTokenPayError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/faturas/${confirmTokenPagar.id}/pagar-com-token`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "Erro ao processar pagamento");
      }
      if (data.success === false && data.status !== 'PENDING') {
        throw new Error(data.error || "Pagamento não processado. Tente novamente.");
      }
      setConfirmTokenPagar(null);
      await carregarMinhasFaturas();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao processar pagamento. Tente novamente.";
      setTokenPayError(msg);
    } finally {
      setLoadingTokenPay(false);
    }
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

  // Alertas: apenas PIX ou BOLETO
  const isPIXouBoleto = (f: Fatura) => {
    const m = (f.metodo_pagamento || f.assinatura?.metodo_pagamento || "").toUpperCase();
    return m === "PIX" || m === "BOLETO";
  };

  const hoje = dayjs().startOf("day");
  const daqui4Dias = hoje.add(4, "day");

  const faturasVencendoEmBreve = faturas.filter((f) => {
    if (f.status !== "PENDENTE") return false;
    if (!isPIXouBoleto(f)) return false;
    const venc = dayjs(f.data_vencimento);
    return (venc.isSame(hoje, "day") || venc.isAfter(hoje)) && (venc.isSame(daqui4Dias, "day") || venc.isBefore(daqui4Dias));
  });

  const faturasVencidas = faturas.filter((f) => {
    if (!isPIXouBoleto(f)) return false;
    if (f.status === "ATRASADA" || f.status === "VENCIDA") return true;
    // PENDENTE mas com vencimento no passado (job ainda não rodou)
    if (f.status === "PENDENTE" && dayjs(f.data_vencimento).startOf("day").isBefore(hoje)) return true;
    return false;
  });

  const diasParaVencer = (dataVencimento: string) => {
    return dayjs(dataVencimento).startOf("day").diff(hoje, "day");
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

      {/* ── Alerta: fatura vencida ─────────────────────────────── */}
      {faturasVencidas.length > 0 && !alertVencidaDismissed && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-900 shadow-sm">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1 text-sm">
            <p className="font-bold text-red-700">
              {faturasVencidas.length === 1
                ? "Fatura vencida — risco de bloqueio de acesso!"
                : `${faturasVencidas.length} faturas vencidas — risco de bloqueio de acesso!`}
            </p>
            <p className="mt-0.5 text-red-700">
              {faturasVencidas.length === 1
                ? `A fatura ${faturasVencidas[0].numero_fatura} (${formatarMoeda(parseFloat(faturasVencidas[0].valor_original?.toString()) || 0)}) está em atraso via ${(faturasVencidas[0].metodo_pagamento || faturasVencidas[0].assinatura?.metodo_pagamento || "PIX/Boleto").toUpperCase() === "PIX" ? "Pix" : "Boleto"}. Regularize agora para evitar a suspensão imediata do seu acesso à academia.`
                : `Você possui ${faturasVencidas.length} faturas em atraso via Pix/Boleto. Regularize sua situação agora para evitar a suspensão do seu acesso à academia.`}
            </p>
          </div>
          <button
            onClick={() => setAlertVencidaDismissed(true)}
            className="ml-2 rounded p-1 hover:bg-red-100 text-red-500"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Alerta: vencimento próximo ────────────────────────────── */}
      {faturasVencendoEmBreve.length > 0 && !alertVencimentoDismissed && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-orange-900 shadow-sm">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
          <div className="flex-1 text-sm">
            <p className="font-bold text-orange-700">
              {faturasVencendoEmBreve.length === 1
                ? "Sua fatura vence em breve — não deixe para a última hora!"
                : `${faturasVencendoEmBreve.length} faturas vencem nos próximos 4 dias!`}
            </p>
            <p className="mt-0.5 text-orange-700">
              {faturasVencendoEmBreve.length === 1 ? (() => {
                const f = faturasVencendoEmBreve[0];
                const dias = diasParaVencer(f.data_vencimento);
                const metodo = (f.metodo_pagamento || f.assinatura?.metodo_pagamento || "").toUpperCase() === "PIX" ? "Pix" : "Boleto";
                return dias === 0
                  ? `A fatura ${f.numero_fatura} (${formatarMoeda(parseFloat(f.valor_original?.toString()) || 0)}) vence HOJE via ${metodo}. Pague agora para manter seu acesso garantido.`
                  : `A fatura ${f.numero_fatura} (${formatarMoeda(parseFloat(f.valor_original?.toString()) || 0)}) vence em ${dias} dia${dias > 1 ? "s" : ""} via ${metodo}. Realize o pagamento com antecedência para evitar contratempos.`;
              })() : `Você tem ${faturasVencendoEmBreve.length} faturas via Pix/Boleto com vencimento nos próximos 4 dias. Pague com antecedência para manter seu acesso à academia.`}
            </p>
          </div>
          <button
            onClick={() => setAlertVencimentoDismissed(true)}
            className="ml-2 rounded p-1 hover:bg-orange-100 text-orange-500"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
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
                <p className="text-sm text-gray-600">Em Atraso</p>
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
                <p className="text-sm text-gray-600">Próximo Vencimento</p>
                {totais.proximoVencimento ? (
                  <p className="text-lg font-bold text-blue-600">
                    {formatarData(totais.proximoVencimento.data_vencimento)}
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 text-left">Nº Fatura</th>
                  <th className="px-4 py-3 text-left">Plano / Descrição</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Pagamento</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-left">Pago em</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((fatura) => {
                  const metodo = (
                    fatura.metodo_pagamento ||
                    fatura.assinatura?.metodo_pagamento ||
                    ""
                  ).toUpperCase();

                  const metodoBadge = (() => {
                    // Badge de cartão: mostra bandeira + últimos 4 dígitos
                    if (metodo === "CARTAO_CREDITO" || metodo === "CARTAO") {
                      // card_info vem de transação confirmada; card_info_assinatura é fallback da assinatura (faturas pendentes)
                      const brand = (fatura.card_info?.brand || fatura.card_info_assinatura?.brand || "").toUpperCase();
                      const last4 = fatura.card_info?.last4 || fatura.card_info_assinatura?.last4;

                      const BrandIcon = () => {
                        if (brand === "MASTERCARD" || brand === "MASTER") return (
                          <svg viewBox="0 0 38 24" width="38" height="24" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:3}}>
                            <rect width="38" height="24" rx="3" fill="#252525"/>
                            <circle cx="15" cy="12" r="7" fill="#EB001B"/>
                            <circle cx="23" cy="12" r="7" fill="#F79E1B"/>
                            <path d="M19 6.8a7 7 0 0 1 0 10.4A7 7 0 0 1 19 6.8z" fill="#FF5F00"/>
                          </svg>
                        );
                        if (brand === "VISA") return (
                          <svg viewBox="0 0 38 24" width="38" height="24" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:3}}>
                            <rect width="38" height="24" rx="3" fill="#1A1F71"/>
                            <text x="5" y="17" fontFamily="Arial" fontWeight="bold" fontSize="13" fill="white" letterSpacing="1">VISA</text>
                          </svg>
                        );
                        if (brand === "ELO") return (
                          <svg viewBox="0 0 38 24" width="38" height="24" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:3}}>
                            <rect width="38" height="24" rx="3" fill="#000"/>
                            <text x="5" y="17" fontFamily="Arial" fontWeight="bold" fontSize="14" fill="#FFD700" letterSpacing="0.5">elo</text>
                          </svg>
                        );
                        if (brand === "AMEX" || brand === "AMERICAN_EXPRESS") return (
                          <svg viewBox="0 0 38 24" width="38" height="24" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:3}}>
                            <rect width="38" height="24" rx="3" fill="#2E77BC"/>
                            <text x="3" y="16" fontFamily="Arial" fontWeight="bold" fontSize="9" fill="white">AMEX</text>
                          </svg>
                        );
                        if (brand === "HIPERCARD") return (
                          <svg viewBox="0 0 38 24" width="38" height="24" xmlns="http://www.w3.org/2000/svg" style={{borderRadius:3}}>
                            <rect width="38" height="24" rx="3" fill="#B3131F"/>
                            <text x="2" y="16" fontFamily="Arial" fontWeight="bold" fontSize="8.5" fill="white">HIPER</text>
                          </svg>
                        );
                        return <CreditCard className="h-4 w-4 text-blue-600" />;
                      };

                      return (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <BrandIcon />
                            <span className="text-xs text-gray-700 font-mono">
                              {last4 ? `•••• ${last4}` : "Cartão"}
                            </span>
                          </div>
                          {fatura.token_salvo && (["PENDENTE", "ATRASADA", "VENCIDA"] as string[]).includes(fatura.status) && (
                            <button
                              className="text-[10px] text-blue-500 hover:text-blue-700 underline underline-offset-2 text-left w-fit"
                              onClick={() => alterarCartao(fatura)}
                            >
                              Alterar cartão
                            </button>
                          )}
                        </div>
                      );
                    }
                    if (metodo === "PIX") return (
                      <Badge className="bg-green-100 text-green-800 gap-1 font-normal">
                        <QrCode className="h-3 w-3" /> Pix
                      </Badge>
                    );
                    if (metodo === "BOLETO") return (
                      <Badge className="bg-orange-100 text-orange-800 gap-1 font-normal">
                        <Landmark className="h-3 w-3" /> Boleto
                      </Badge>
                    );
                    if (metodo === "DINHEIRO") return (
                      <Badge className="bg-emerald-100 text-emerald-800 gap-1 font-normal">
                        <Banknote className="h-3 w-3" /> Dinheiro
                      </Badge>
                    );
                    if (metodo === "TRANSFERENCIA") return (
                      <Badge className="bg-purple-100 text-purple-800 gap-1 font-normal">
                        <Wallet className="h-3 w-3" /> Transferência
                      </Badge>
                    );
                    return metodo ? <Badge className="bg-gray-100 text-gray-700 font-normal">{metodo}</Badge> : null;
                  })();

                  return (
                    <tr key={fatura.id} className="border-b hover:bg-gray-50 transition-colors">
                      {/* Nº Fatura */}
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {fatura.numero_fatura}
                        {faturasComPagamentoPendente.has(fatura.id) && (() => {
                          const info = faturasComPagamentoPendente.get(fatura.id)!;
                          const éBoleto = info.metodo === "BOLETO";
                          if (éBoleto && info.temBarcode) {
                            return (
                              <div className="mt-1">
                                <Badge className="bg-orange-100 text-orange-800 gap-1 text-[10px]">
                                  <Landmark className="h-2.5 w-2.5" />
                                  Boleto gerado
                                </Badge>
                              </div>
                            );
                          }
                          if (éBoleto && !info.temBarcode) {
                            return (
                              <div className="mt-1">
                                <Badge className="bg-blue-100 text-blue-800 gap-1 text-[10px]">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  Gerando boleto...
                                </Badge>
                              </div>
                            );
                          }
                          // PIX ou outros
                          return (
                            <div className="mt-1">
                              <Badge className="bg-blue-100 text-blue-800 gap-1 text-[10px]">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                Processando
                              </Badge>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Plano / Descrição */}
                      <td className="px-4 py-3 text-gray-800">
                        {fatura.assinatura?.plano?.nome ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium">{fatura.assinatura.plano.nome}</span>
                            {fatura.assinatura.plano.tipo && (() => {
                              const periodoMap: Record<string, { label: string; color: string }> = {
                                MENSAL:    { label: "Mensal",    color: "bg-blue-100 text-blue-700" },
                                TRIMESTRAL:{ label: "Trimestral",color: "bg-cyan-100 text-cyan-700" },
                                SEMESTRAL: { label: "Semestral", color: "bg-purple-100 text-purple-700" },
                                ANUAL:     { label: "Anual",     color: "bg-green-100 text-green-700" },
                                AVULSO:    { label: "Avulso",    color: "bg-gray-100 text-gray-600" },
                              };
                              const cfg = periodoMap[fatura.assinatura!.plano!.tipo!] ?? { label: fatura.assinatura!.plano!.tipo!, color: "bg-gray-100 text-gray-600" };
                              return (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold w-fit ${cfg.color}`}>
                                  {cfg.label}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-500">{fatura.descricao || "—"}</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">{getStatusBadge(fatura.status)}</td>

                      {/* Método de Pagamento */}
                      <td className="px-4 py-3">{metodoBadge ?? <span className="text-gray-400">—</span>}</td>

                      {/* Vencimento */}
                      <td className="px-4 py-3 text-gray-600">
                        {formatarData(fatura.data_vencimento)}
                      </td>

                      {/* Pago em */}
                      <td className="px-4 py-3 text-gray-600">
                        {fatura.status === "PAGA" && fatura.data_pagamento
                          ? formatarData(fatura.data_pagamento)
                          : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Valor */}
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatarMoeda(parseFloat(fatura.valor_original?.toString()) || 0)}
                        {fatura.status === "ATRASADA" && (
                          <div className="text-[10px] text-red-500 font-normal mt-0.5">em atraso</div>
                        )}
                      </td>

                      {/* Ação */}
                      <td className="px-4 py-3 text-center">
                        {(["PENDENTE", "ATRASADA", "VENCIDA"] as string[]).includes(fatura.status) ? (() => {
                          const isCartao = ["CARTAO", "CARTAO_CREDITO"].includes(metodo);
                          const last4Disp = fatura.card_info?.last4 || fatura.card_info_assinatura?.last4;

                          return (
                            <div className="flex flex-col items-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => handlePagarOnline(fatura)}
                              >
                                {fatura.token_salvo ? (
                                  <>
                                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                                    Pagar •••• {last4Disp || "cartão"}
                                  </>
                                ) : isCartao && last4Disp ? (
                                  <>
                                    <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                                    Pagar •••• {last4Disp}
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                                    Pagar
                                  </>
                                )}
                              </Button>
                              {(fatura.token_salvo || (isCartao && last4Disp)) && (
                                <button
                                  className="text-[11px] text-blue-600 underline underline-offset-2 hover:text-blue-800"
                                  onClick={() => alterarCartao(fatura)}
                                >
                                  Alterar cartão
                                </button>
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

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

      {/* Confirmação Pagar com Cartão Salvo */}
      <AlertDialog open={!!confirmTokenPagar} onOpenChange={(open) => { if (!open && !loadingTokenPay) setConfirmTokenPagar(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              Confirmar pagamento
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              Cobrar{" "}
              <span className="font-semibold text-gray-900">{formatarMoeda(parseFloat(confirmTokenPagar?.valor_original?.toString() || "0"))}</span>{" "}
              no cartão salvo:{" "}
              <span className="inline-flex items-center gap-1.5 bg-gray-100 rounded px-2 py-0.5 text-sm font-medium text-gray-800">
                <CreditCard className="h-3.5 w-3.5 text-gray-500" />
                {confirmTokenPagar?.card_info_assinatura?.brand || "Cartão"} •••• {confirmTokenPagar?.card_info_assinatura?.last4 || "----"}
              </span>
              {tokenPayError && (
                <span className="block text-sm text-red-600 bg-red-50 rounded px-3 py-2 mt-2">{tokenPayError}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              onClick={pagarFaturaComToken}
              disabled={loadingTokenPay}
            >
              {loadingTokenPay ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processando...</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" />Confirmar cobrança</>
              )}
            </Button>
            <AlertDialogCancel
              disabled={loadingTokenPay}
              onClick={() => { setConfirmTokenPagar(null); if (confirmTokenPagar) alterarCartao(confirmTokenPagar); }}
              className="w-full"
            >
              Alterar cartão
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Pagamento */}
      <ProcessarPagamentoModal
        fatura={faturaParaPagar}
        open={modalPagamentoOpen}
        onClose={() => setModalPagamentoOpen(false)}
        onSuccess={handlePagamentoSuccess}
        initialTab={modalInitialTab}
      />
    </div>
  );
}
