"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  QrCode,
  FileText,
  Copy,
  CheckCircle,
  Loader2,
  X,
  AlertCircle,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { useAntifraud } from "@/hooks/useAntifraud";

interface Fatura {
  id: string;
  numero_fatura: string;
  descricao?: string;
  valor_total: number;
  data_vencimento: string;
  status: string;
  metodo_pagamento?: string;
}

interface ProcessarPagamentoModalProps {
  fatura: Fatura | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProcessarPagamentoModal({
  fatura,
  open,
  onClose,
  onSuccess,
}: ProcessarPagamentoModalProps) {
  const queryClient = useQueryClient();
  const { generateSessionId, loadClearSaleScript, sessionId } = useAntifraud();
  
  // Mapear método de pagamento para ID da tab
  const getTabFromMetodoPagamento = (metodo?: string): string => {
    if (!metodo) return "pix";
    const metodoUpper = metodo.toUpperCase();
    if (metodoUpper === "PIX") return "pix";
    if (metodoUpper === "BOLETO") return "boleto";
    if (metodoUpper === "CARTAO" || metodoUpper === "CARTÃO") return "cartao";
    return "pix"; // Default
  };
  
  // Métodos de pagamento permitidos para pagamento online
  const metodosOnline = ["PIX", "BOLETO", "CARTAO", "CARTÃO"];
  const metodoPermitePagamentoOnline = fatura?.metodo_pagamento 
    ? metodosOnline.includes(fatura.metodo_pagamento.toUpperCase())
    : true; // Se não tiver método definido, permite todos
  
  const [activeTab, setActiveTab] = useState(() => getTabFromMetodoPagamento(fatura?.metodo_pagamento));
  const [transacaoId, setTransacaoId] = useState<string | null>(null);

  // Estados PIX
  const [pixData, setPixData] = useState<any>(null);

  // Estados Cartão
  const [cardData, setCardData] = useState({
    number: "",
    holder_name: "",
    expiration_month: "",
    expiration_year: "",
    cvv: "",
    payment_type: "CREDIT" as "CREDIT" | "DEBIT",
    installments: 1,
  });

  // Estados Boleto
  const [boletoData, setBoletoData] = useState<any>(null);

  // Carregar ClearSale quando modal abrir
  useEffect(() => {
    if (open) {
      const initAntifraud = async () => {
        try {
          await loadClearSaleScript();
          await generateSessionId();
          console.log("✅ ClearSale Session ID gerado");
        } catch (error) {
          console.error("⚠️ Erro ao carregar ClearSale:", error);
        }
      };
      initAntifraud();
    }
  }, [open, loadClearSaleScript, generateSessionId]);
  
  // Estado para erro de dados faltantes
  const [dadosFaltantesError, setDadosFaltantesError] = useState<{
    message: string;
    campos_faltantes: string[];
    origem_dados: string;
    sugestao: string;
  } | null>(null);

  // Estado para formulário de completar dados
  const [mostrarFormularioCompleto, setMostrarFormularioCompleto] = useState(false);
  const [dadosCompletos, setDadosCompletos] = useState({
    cpf: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
  });

  // Mutation PIX
  const pagarComPixMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/pagamentos-online/pix`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            faturaId: fatura?.id,
            expiresIn: 3600, // 1 hora
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao processar pagamento PIX");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setPixData(data);
      setTransacaoId(data.transacao_id);
      toast.success("QR Code gerado! Escaneie o QR Code para pagar");
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar PIX: ${error.message}`);
    },
  });

  // Mutation Cartão
  const pagarComCartaoMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/pagamentos-online/cartao`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            faturaId: fatura?.id,
            paymentType: cardData.payment_type,
            installments: cardData.installments,
            interest: "ESTABLISHMENT",
            card: {
              number: cardData.number.replace(/\s/g, ""),
              holder_name: cardData.holder_name,
              expiration_month: cardData.expiration_month,
              expiration_year: cardData.expiration_year,
              cvv: cardData.cvv,
            },
            billing_address: {
              street: "Rua Principal",
              number: "123",
              neighborhood: "Centro",
              city: "Vitória",
              state: "ES",
              zip_code: "29090000",
            },
            // Campos de antifraude
            session_id: sessionId,
            antifraud_type: "CLEARSALE",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao processar pagamento");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "PAID" || data.status === "APPROVED") {
        toast.success(
          `✅ Pagamento aprovado! Cartão final ${data.card?.last4_digits || "****"}`
        );
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else if (data.status === "PENDING") {
        toast.success(
          `✅ Pagamento enviado com sucesso! Aguardando confirmação da operadora.`,
          { duration: 4000 }
        );
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        toast(
          `Pagamento registrado com status: ${data.status}. Verifique com a administração.`,
          { icon: "⏳", duration: 5000 }
        );
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 3000);
      }
    },
    onError: (error: any) => {
      toast.error(
        `❌ Erro ao processar pagamento: ${error.message || "Tente novamente"}`,
        { duration: 5000 }
      );
    },
  });

  // Mutation Boleto
  const pagarComBoletoMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/pagamentos-online/boleto`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            faturaId: fatura?.id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        // Se o erro tem informações estruturadas, incluir no throw
        const errorData = error.tipo_erro === 'DADOS_FALTANTES' ? error : null;
        const err: any = new Error(error.message || "Erro ao gerar boleto");
        err.errorData = errorData;
        throw err;
      }

      return response.json();
    },
    onSuccess: (data) => {
      setBoletoData(data);
      setTransacaoId(data.transacao_id);
      if (data.status === "PROCESSING") {
        toast("Gerando boleto... Aguarde um momento", { icon: "⏳" });
      } else {
        toast.success("Boleto gerado! Copie o código de barras para pagar");
      }
    },
    onError: (error: any) => {
      // Verificar se é erro de dados faltantes
      if (error.errorData?.tipo_erro === 'DADOS_FALTANTES') {
        setDadosFaltantesError({
          message: error.errorData.message,
          campos_faltantes: error.errorData.campos_faltantes || [],
          origem_dados: error.errorData.origem_dados || 'aluno',
          sugestao: error.errorData.sugestao || '',
        });
      } else {
        toast.error(`Erro ao gerar boleto: ${error.message}`);
      }
    },
  });

  // Mutation para completar dados e gerar boleto
  const completarDadosMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/pagamentos-online/boleto/completar-dados`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...dadosCompletos,
            faturaId: fatura?.id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao salvar dados");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Dados salvos! Gerando boleto...");
      setDadosFaltantesError(null);
      setMostrarFormularioCompleto(false);
      setBoletoData(data);
      setTransacaoId(data.transacao_id);
      if (data.status === "PROCESSING") {
        toast("Gerando boleto... Aguarde um momento", { icon: "⏳" });
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar dados: ${error.message}`);
    },
  });

  // Polling para verificar status do PIX
  const { data: statusPix } = useQuery({
    queryKey: ["status-pix", transacaoId],
    queryFn: async () => {
      if (!transacaoId) return null;
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/pagamentos-online/status/${transacaoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.json();
    },
    enabled: !!transacaoId && activeTab === "pix",
    refetchInterval: 5000, // Polling a cada 5 segundos
  });

  // Polling para verificar status do Cartão
  const { data: statusCartao } = useQuery({
    queryKey: ["status-cartao", transacaoId],
    queryFn: async () => {
      if (!transacaoId) return null;
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/pagamentos-online/status/${transacaoId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!transacaoId && activeTab === "cartao",
    refetchInterval: 5000, // Polling a cada 5 segundos
  });

  // Polling para verificar status do Boleto
  const { data: statusBoleto } = useQuery({
    queryKey: ["status-boleto", transacaoId],
    queryFn: async () => {
      if (!transacaoId) return null;
      
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/financeiro/pagamentos-online/status/${transacaoId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        // Se 404 ou outro erro, parar polling
        if (!response.ok) {
          console.error(`Erro ao verificar status do boleto: ${response.status}`);
          // Marcar como erro para parar polling
          setBoletoData({
            ...boletoData,
            status: "ERROR",
          });
          return null;
        }
        
        const data = await response.json();
        
        // Verificar se é erro de timeout
        if (data.status === 'ERROR' && data.timeout) {
          toast.error(data.error_message || 'Boleto expirou. Gerando novo boleto...');
          setBoletoData({
            status: 'TIMEOUT',
            error_message: data.error_message,
          });
          return null;
        }
        
        // Se o boleto foi atualizado com os dados do Paytime, atualizar boletoData
        if (data.paytime_metadata) {
          const metadata = data.paytime_metadata;
          if (metadata.barcode || metadata.digitable_line || metadata.pdf_url) {
            setBoletoData({
              ...boletoData,
              barcode: metadata.barcode,
              digitable_line: metadata.digitable_line,
              pdf_url: metadata.pdf_url,
              due_date: metadata.due_date,
              status: metadata.status,
            });
          }
        }
        
        return data;
      } catch (error) {
        console.error("Erro no polling do boleto:", error);
        // Marcar como erro para parar polling
        setBoletoData({
          ...boletoData,
          status: "ERROR",
        });
        return null;
      }
    },
    enabled: !!transacaoId && activeTab === "boleto" && boletoData?.status === "PROCESSING",
    refetchInterval: 3000, // Polling a cada 3 segundos
  });

  // Verificar se Cartão foi aprovado
  if (statusCartao && (statusCartao.status === 'CONFIRMADA' || statusCartao.paytime_metadata?.status === 'PAID' || statusCartao.paytime_metadata?.status === 'APPROVED')) {
    toast.success(
      `✅ Pagamento aprovado! Transação confirmada.`,
      { duration: 4000 }
    );
    setTimeout(() => {
      onSuccess();
      handleClose();
    }, 2000);
  }

  // Verificar se PIX foi pago
  if (statusPix?.pago && pixData) {
    toast({
      title: "Pagamento confirmado!",
      description: "Seu PIX foi recebido com sucesso",
    });
    setTimeout(() => {
      onSuccess();
      handleClose();
    }, 2000);
  }

  const copiarTexto = (texto: string, tipo: string) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${tipo} copiado para a área de transferência!`);
  };

  const handleClose = () => {
    setPixData(null);
    setBoletoData(null);
    setTransacaoId(null);
    setDadosFaltantesError(null);
    setMostrarFormularioCompleto(false);
    setDadosCompletos({
      cpf: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
    });
    setCardData({
      number: "",
      holder_name: "",
      expiration_month: "",
      expiration_year: "",
      cvv: "",
      payment_type: "CREDIT",
      installments: 1,
    });
    onClose();
  };

  if (!fatura) return null;
  
  // Verificar se o método de pagamento permite pagamento online
  if (!metodoPermitePagamentoOnline) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento não disponível online</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
            <AlertCircle className="h-16 w-16 mx-auto text-yellow-500" />
            <div>
              <p className="text-lg font-semibold mb-2">
                Fatura #{fatura.numero_fatura}
              </p>
              <p className="text-muted-foreground">
                Método de pagamento: <strong>{fatura.metodo_pagamento}</strong>
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-800">
              <p className="font-semibold mb-1">⚠️ Pagamento Presencial</p>
              <p>
                Esta fatura está configurada para pagamento em {fatura.metodo_pagamento}.
                Por favor, dirija-se à recepção da sua unidade para efetuar o pagamento.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Determinar quais tabs mostrar baseado no método de pagamento
  const metodoPagamentoUpper = fatura.metodo_pagamento?.toUpperCase();
  const mostrarApenasMetodoDefinido = !!fatura.metodo_pagamento;
  
  const mostrarPix = !mostrarApenasMetodoDefinido || metodoPagamentoUpper === "PIX";
  const mostrarCartao = !mostrarApenasMetodoDefinido || metodoPagamentoUpper === "CARTAO" || metodoPagamentoUpper === "CARTÃO";
  const mostrarBoleto = !mostrarApenasMetodoDefinido || metodoPagamentoUpper === "BOLETO";
  
  // Contar quantas tabs serão mostradas para ajustar o grid
  const numTabs = [mostrarPix, mostrarCartao, mostrarBoleto].filter(Boolean).length;
  const gridClass = numTabs === 3 ? "grid-cols-3" : numTabs === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pagar Fatura #{fatura.numero_fatura}</DialogTitle>
          <DialogDescription>
            Valor: R$ {Number(fatura.valor_total).toFixed(2)}
            {fatura.metodo_pagamento && (
              <span className="block mt-1 text-xs">
                💳 Método: {fatura.metodo_pagamento}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${gridClass}`}>
            {mostrarPix && (
              <TabsTrigger value="pix">
                <QrCode className="w-4 h-4 mr-2" />
                PIX
              </TabsTrigger>
            )}
            {mostrarCartao && (
              <TabsTrigger value="cartao">
                <CreditCard className="w-4 h-4 mr-2" />
                Cartão
              </TabsTrigger>
            )}
            {mostrarBoleto && (
              <TabsTrigger value="boleto">
                <FileText className="w-4 h-4 mr-2" />
                Boleto
              </TabsTrigger>
            )}
          </TabsList>

          {/* ABA PIX */}
          <TabsContent value="pix" className="space-y-4">
            {!pixData ? (
              <div className="text-center py-8">
                <p className="mb-4 text-muted-foreground">
                  Clique no botão abaixo para gerar o QR Code PIX
                </p>
                <Button
                  onClick={() => pagarComPixMutation.mutate()}
                  disabled={pagarComPixMutation.isPending}
                  size="lg"
                >
                  {pagarComPixMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Gerar QR Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg">
                  <QRCodeSVG value={pixData.qr_code} size={256} />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Escaneie o QR Code com seu aplicativo bancário
                  </p>
                </div>

                {pixData.qr_code ? (
                  <div className="space-y-2">
                    <Label>Código PIX Copia e Cola</Label>
                    <div className="flex gap-2">
                      <Input
                        value={pixData.qr_code}
                        readOnly
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copiarTexto(pixData.qr_code, "Código PIX")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cole este código no seu aplicativo bancário para pagar
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Código PIX não disponível. Use o QR Code acima para realizar o pagamento.
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Aguardando pagamento...
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    O status será atualizado automaticamente quando o pagamento
                    for confirmado
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA CARTÃO */}
          <TabsContent value="cartao" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="card_number">Número do Cartão</Label>
                <Input
                  id="card_number"
                  placeholder="0000 0000 0000 0000"
                  value={cardData.number}
                  onChange={(e) => {
                    const value = e.target.value
                      .replace(/\D/g, "")
                      .replace(/(\d{4})(?=\d)/g, "$1 ");
                    setCardData({ ...cardData, number: value });
                  }}
                  maxLength={19}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="holder_name">Nome no Cartão</Label>
                <Input
                  id="holder_name"
                  placeholder="NOME COMPLETO"
                  value={cardData.holder_name}
                  onChange={(e) =>
                    setCardData({
                      ...cardData,
                      holder_name: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="expiration">Validade</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="MM"
                    value={cardData.expiration_month}
                    onChange={(e) =>
                      setCardData({
                        ...cardData,
                        expiration_month: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    maxLength={2}
                  />
                  <Input
                    placeholder="AAAA"
                    value={cardData.expiration_year}
                    onChange={(e) =>
                      setCardData({
                        ...cardData,
                        expiration_year: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    maxLength={4}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  type="password"
                  value={cardData.cvv}
                  onChange={(e) =>
                    setCardData({
                      ...cardData,
                      cvv: e.target.value.replace(/\D/g, ""),
                    })
                  }
                  maxLength={4}
                />
              </div>

              <div className="col-span-2">
                <Label>Tipo de Pagamento</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={
                      cardData.payment_type === "CREDIT"
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      setCardData({ ...cardData, payment_type: "CREDIT" })
                    }
                  >
                    Crédito
                  </Button>
                  <Button
                    type="button"
                    variant={
                      cardData.payment_type === "DEBIT" ? "default" : "outline"
                    }
                    onClick={() =>
                      setCardData({ ...cardData, payment_type: "DEBIT" })
                    }
                  >
                    Débito
                  </Button>
                </div>
              </div>

              {cardData.payment_type === "CREDIT" && (
                <div className="col-span-2">
                  <Label htmlFor="installments">Parcelas</Label>
                  <select
                    id="installments"
                    className="w-full p-2 border rounded-md"
                    value={cardData.installments}
                    onChange={(e) =>
                      setCardData({
                        ...cardData,
                        installments: parseInt(e.target.value),
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                      <option key={i} value={i}>
                        {i}x de R${" "}
                        {(fatura.valor_total / i).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => pagarComCartaoMutation.mutate()}
              disabled={
                pagarComCartaoMutation.isPending ||
                !cardData.number ||
                !cardData.holder_name ||
                !cardData.expiration_month ||
                !cardData.expiration_year ||
                !cardData.cvv
              }
            >
              {pagarComCartaoMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Pagar R$ {Number(fatura.valor_total).toFixed(2)}
            </Button>
          </TabsContent>

          {/* ABA BOLETO */}
          <TabsContent value="boleto" className="space-y-4">
            {/* Alert de Dados Faltantes */}
            {dadosFaltantesError && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-amber-900 text-lg">
                        Dados necessários não encontrados
                      </h3>
                      <p className="text-amber-800 mt-1">
                        {dadosFaltantesError.message}
                      </p>
                    </div>

                    {/* Campos Faltantes */}
                    <div className="bg-white rounded-md p-3 border border-amber-200">
                      <p className="text-sm font-medium text-amber-900 mb-2">
                        Campos que precisam ser preenchidos:
                      </p>
                      <ul className="space-y-1">
                        {dadosFaltantesError.campos_faltantes.map((campo, index) => (
                          <li key={index} className="text-sm text-amber-800 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-amber-600 rounded-full"></span>
                            {campo === 'cpf' && 'CPF'}
                            {campo === 'endereco.cep' && 'CEP'}
                            {campo === 'endereco.cidade' && 'Cidade'}
                            {campo.includes('endereco') && !['endereco.cep', 'endereco.cidade'].includes(campo) && 'Endereço completo'}
                            {!campo.includes('cpf') && !campo.includes('endereco') && campo}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Sugestão */}
                    <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-1 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        O que fazer:
                      </p>
                      <p className="text-sm text-blue-800">
                        {dadosFaltantesError.sugestao}
                      </p>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3 pt-2">
                      {!mostrarFormularioCompleto && (
                        <Button
                          onClick={() => setMostrarFormularioCompleto(true)}
                          className="flex-1"
                        >
                          📝 Preencher Agora
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          setDadosFaltantesError(null);
                          setMostrarFormularioCompleto(false);
                        }}
                        variant="outline"
                      >
                        Fechar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Formulário de Completar Dados */}
                {mostrarFormularioCompleto && (
                  <div className="mt-6 pt-6 border-t border-amber-200">
                    <h4 className="font-semibold text-amber-900 mb-4">
                      Complete os dados abaixo:
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* CPF */}
                      <div>
                        <Label htmlFor="cpf">CPF *</Label>
                        <Input
                          id="cpf"
                          value={dadosCompletos.cpf}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                            setDadosCompletos({...dadosCompletos, cpf: value});
                          }}
                          maxLength={11}
                          placeholder="00000000000"
                        />
                      </div>

                      {/* CEP */}
                      <div>
                        <Label htmlFor="cep">CEP *</Label>
                        <Input
                          id="cep"
                          value={dadosCompletos.cep}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                            setDadosCompletos({...dadosCompletos, cep: value});
                          }}
                          maxLength={8}
                          placeholder="00000000"
                        />
                      </div>

                      {/* Logradouro */}
                      <div className="col-span-2">
                        <Label htmlFor="logradouro">Logradouro *</Label>
                        <Input
                          id="logradouro"
                          value={dadosCompletos.logradouro}
                          onChange={(e) => setDadosCompletos({...dadosCompletos, logradouro: e.target.value})}
                          placeholder="Rua, Avenida, etc."
                        />
                      </div>

                      {/* Número */}
                      <div>
                        <Label htmlFor="numero">Número *</Label>
                        <Input
                          id="numero"
                          value={dadosCompletos.numero}
                          onChange={(e) => setDadosCompletos({...dadosCompletos, numero: e.target.value})}
                          placeholder="123"
                        />
                      </div>

                      {/* Complemento */}
                      <div>
                        <Label htmlFor="complemento">Complemento</Label>
                        <Input
                          id="complemento"
                          value={dadosCompletos.complemento}
                          onChange={(e) => setDadosCompletos({...dadosCompletos, complemento: e.target.value})}
                          placeholder="Apto, Bloco, etc."
                        />
                      </div>

                      {/* Bairro */}
                      <div className="col-span-2">
                        <Label htmlFor="bairro">Bairro *</Label>
                        <Input
                          id="bairro"
                          value={dadosCompletos.bairro}
                          onChange={(e) => setDadosCompletos({...dadosCompletos, bairro: e.target.value})}
                          placeholder="Nome do bairro"
                        />
                      </div>

                      {/* Cidade */}
                      <div>
                        <Label htmlFor="cidade">Cidade *</Label>
                        <Input
                          id="cidade"
                          value={dadosCompletos.cidade}
                          onChange={(e) => setDadosCompletos({...dadosCompletos, cidade: e.target.value})}
                          placeholder="Nome da cidade"
                        />
                      </div>

                      {/* Estado */}
                      <div>
                        <Label htmlFor="estado">Estado (UF) *</Label>
                        <Input
                          id="estado"
                          value={dadosCompletos.estado}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase().slice(0, 2);
                            setDadosCompletos({...dadosCompletos, estado: value});
                          }}
                          maxLength={2}
                          placeholder="SP"
                        />
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    <Button
                      onClick={() => completarDadosMutation.mutate()}
                      disabled={completarDadosMutation.isPending || !dadosCompletos.cpf || !dadosCompletos.cep || !dadosCompletos.cidade}
                      className="w-full mt-4"
                      size="lg"
                    >
                      {completarDadosMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      💾 Salvar e Gerar Boleto
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {!boletoData ? (
              <div className="text-center py-8">
                {!dadosFaltantesError && (
                  <p className="mb-4 text-muted-foreground">
                    Clique no botão abaixo para gerar o boleto
                  </p>
                )}
                <Button
                  onClick={() => pagarComBoletoMutation.mutate()}
                  disabled={pagarComBoletoMutation.isPending || !!dadosFaltantesError}
                  size="lg"
                >
                  {pagarComBoletoMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Gerar Boleto
                </Button>
                {dadosFaltantesError && (
                  <p className="mt-3 text-sm text-amber-700">
                    Complete seu cadastro antes de gerar o boleto
                  </p>
                )}
              </div>
            ) : boletoData.status === "TIMEOUT" ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-8 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-lg font-medium text-orange-900 mb-2">
                    ⏱️ Tempo esgotado
                  </p>
                  <p className="text-sm text-orange-700 text-center max-w-md">
                    {boletoData.error_message || "O boleto ficou muito tempo em processamento e foi cancelado automaticamente."}
                  </p>
                  <p className="text-xs text-orange-600 mt-2 text-center max-w-md">
                    Isso pode acontecer quando há problemas temporários com o gateway de pagamento.
                  </p>
                  <Button
                    onClick={() => {
                      setBoletoData(null);
                      setTransacaoId(null);
                      pagarComBoletoMutation.mutate();
                    }}
                    className="mt-4"
                  >
                    Gerar Novo Boleto
                  </Button>
                </div>
              </div>
            ) : boletoData.status === "ERROR" ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-lg font-medium text-red-900 mb-2">
                    ⚠️ Erro ao processar boleto
                  </p>
                  <p className="text-sm text-red-700 text-center max-w-md">
                    Houve um problema ao verificar o status do boleto. Por favor, tente gerar novamente.
                  </p>
                  <Button
                    onClick={() => {
                      setBoletoData(null);
                      setTransacaoId(null);
                    }}
                    className="mt-4"
                    variant="outline"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            ) : boletoData.status === "PROCESSING" && !boletoData.barcode ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-lg">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                  <p className="text-lg font-medium text-blue-900">
                    Gerando boleto...
                  </p>
                  <p className="text-sm text-blue-700 mt-2 text-center max-w-md">
                    Estamos processando seu boleto. Isso pode levar alguns segundos.
                    Os dados serão atualizados automaticamente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {boletoData.barcode && (
                  <div className="space-y-2">
                    <Label>Código de Barras</Label>
                    <div className="flex gap-2">
                      <Input
                        value={boletoData.barcode}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          copiarTexto(boletoData.barcode, "Código de Barras")
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {boletoData.digitable_line && (
                  <div className="space-y-2">
                    <Label>Linha Digitável</Label>
                    <div className="flex gap-2">
                      <Input
                        value={boletoData.digitable_line}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          copiarTexto(
                            boletoData.digitable_line,
                            "Linha Digitável"
                          )
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {boletoData.due_date && (
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-amber-900">
                      Vencimento:{" "}
                      {new Date(boletoData.due_date).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Pague em qualquer banco até a data de vencimento
                    </p>
                  </div>
                )}

                {boletoData.pdf_url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(boletoData.pdf_url, "_blank")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Baixar PDF do Boleto
                  </Button>
                )}

                {!boletoData.barcode && !boletoData.digitable_line && boletoData.status !== "PROCESSING" && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-yellow-900">
                      Boleto em processamento
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      O boleto foi criado mas ainda está sendo processado. As informações serão atualizadas em breve.
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
