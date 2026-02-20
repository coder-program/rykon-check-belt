"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAntifraud } from "@/hooks/useAntifraud";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Assinatura {
  id: string;
  aluno_nome?: string;
  plano_nome?: string;
  valor: number;
  status: string;
  dados_pagamento?: {
    last4?: string;
    brand?: string;
    exp_month?: string;
    exp_year?: string;
  };
}

interface AtualizarCartaoModalProps {
  assinatura: Assinatura | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AtualizarCartaoModal({
  assinatura,
  open,
  onClose,
  onSuccess,
}: AtualizarCartaoModalProps) {
  const { generateSessionId, loadClearSaleScript, sessionId } = useAntifraud();

  const [cardData, setCardData] = useState({
    number: "",
    holder_name: "",
    expiration_month: "",
    expiration_year: "",
    cvv: "",
  });

  const [billingAddress, setBillingAddress] = useState({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    complement: "",
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);

  // Carregar ClearSale quando modal abrir
  useEffect(() => {
    if (open) {
      const initAntifraud = async () => {
        try {
          await loadClearSaleScript();
          await generateSessionId();
          console.log("✅ ClearSale Session ID gerado para atualização de cartão");
        } catch (error) {
          console.error("⚠️ Erro ao carregar ClearSale:", error);
        }
      };
      initAntifraud();
    }
  }, [open, loadClearSaleScript, generateSessionId]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setCardData({
        number: "",
        holder_name: "",
        expiration_month: "",
        expiration_year: "",
        cvv: "",
      });
      setBillingAddress({
        street: "",
        number: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: "",
        complement: "",
      });
      setShowSuccess(false);
      setSuccessData(null);
    }
  }, [open]);

  const atualizarCartaoMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/financeiro/assinaturas/${assinatura?.id}/atualizar-cartao`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            card: {
              number: cardData.number.replace(/\s/g, ""),
              holder_name: cardData.holder_name.toUpperCase(),
              expiration_month: cardData.expiration_month.padStart(2, "0"),
              expiration_year: cardData.expiration_year,
              cvv: cardData.cvv,
            },
            billing_address: {
              street: billingAddress.street,
              number: billingAddress.number,
              neighborhood: billingAddress.neighborhood,
              city: billingAddress.city,
              state: billingAddress.state.toUpperCase(),
              zip_code: billingAddress.zip_code.replace(/\D/g, ""),
              complement: billingAddress.complement || undefined,
            },
            session_id: sessionId,
            antifraud_type: "IDPAY",
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar cartão");
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log("✅ Cartão atualizado com sucesso:", data);
      setSuccessData(data);
      setShowSuccess(true);
      
      toast.success(
        data.reativada
          ? "Cartão atualizado e assinatura reativada!"
          : "Cartão atualizado com sucesso!"
      );

      // Aguardar 2s e fechar
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    },
    onError: (error: any) => {
      console.error("❌ Erro ao atualizar cartão:", error);
      toast.error(error.message || "Erro ao atualizar cartão");
    },
  });

  const handleSubmit = () => {
    // Validações
    if (!cardData.number || cardData.number.replace(/\s/g, "").length < 13) {
      toast.error("Número do cartão inválido");
      return;
    }

    if (!cardData.holder_name || cardData.holder_name.length < 3) {
      toast.error("Nome do titular inválido");
      return;
    }

    if (!cardData.expiration_month || !cardData.expiration_year) {
      toast.error("Data de validade inválida");
      return;
    }

    if (!cardData.cvv || cardData.cvv.length < 3) {
      toast.error("CVV inválido");
      return;
    }

    // Validar endereço
    if (!billingAddress.street || !billingAddress.number || !billingAddress.neighborhood) {
      toast.error("Preencha o endereço de cobrança");
      return;
    }

    if (!billingAddress.city || !billingAddress.state || !billingAddress.zip_code) {
      toast.error("Preencha cidade, estado e CEP");
      return;
    }

    if (billingAddress.state.length !== 2) {
      toast.error("Estado deve ter 2 letras (ex: SP)");
      return;
    }

    if (billingAddress.zip_code.replace(/\D/g, "").length !== 8) {
      toast.error("CEP deve ter 8 dígitos");
      return;
    }

    atualizarCartaoMutation.mutate();
  };

  const formatCardNumber = (value: string) => {
    return value
      .replace(/\s/g, "")
      .replace(/(\d{4})/g, "$1 ")
      .trim();
  };

  if (!assinatura) return null;

  const cartaoAtual = assinatura.dados_pagamento;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Atualizar Cartão de Crédito
          </DialogTitle>
          <DialogDescription>
            {assinatura.status === "INADIMPLENTE" ? (
              <span className="text-red-600 font-medium">
                ⚠️ Sua assinatura será reativada após a validação do novo cartão
              </span>
            ) : (
              "Atualize os dados do cartão de crédito da assinatura"
            )}
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center justify-center text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {successData?.reativada
                  ? "Assinatura Reativada!"
                  : "Cartão Atualizado!"}
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>✅ Token salvo com segurança</p>
                <p>
                  💳 Cartão: **** **** **** {successData?.dados_cartao?.last4}
                </p>
                <p>🏦 Bandeira: {successData?.dados_cartao?.brand}</p>
                <p>
                  📅 Validade: {successData?.dados_cartao?.exp_month}/
                  {successData?.dados_cartao?.exp_year}
                </p>
                <p className="font-medium text-green-600 mt-4">
                  Status: {successData?.status}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informações da Assinatura */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {assinatura.plano_nome} - R${" "}
                    {assinatura.valor.toFixed(2)}/mês
                  </p>
                  <p className="text-xs text-gray-600">
                    Aluno: {assinatura.aluno_nome}
                  </p>
                  {cartaoAtual?.last4 && (
                    <p className="text-xs text-gray-500">
                      Cartão atual: **** **** **** {cartaoAtual.last4} (
                      {cartaoAtual.brand})
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                ⚠️ <strong>Atenção:</strong> Será realizada uma cobrança teste
                de R$ 1,00 para validar o cartão. O valor será estornado
                imediatamente.
              </AlertDescription>
            </Alert>

            {/* Dados do Cartão */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Dados do Novo Cartão</h3>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="number">Número do Cartão *</Label>
                  <Input
                    id="number"
                    placeholder="0000 0000 0000 0000"
                    value={cardData.number}
                    onChange={(e) =>
                      setCardData({
                        ...cardData,
                        number: formatCardNumber(e.target.value),
                      })
                    }
                    maxLength={19}
                  />
                </div>

                <div>
                  <Label htmlFor="holder">Nome do Titular (como no cartão) *</Label>
                  <Input
                    id="holder"
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

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="month">Mês *</Label>
                    <Select
                      value={cardData.expiration_month}
                      onValueChange={(value) =>
                        setCardData({ ...cardData, expiration_month: value })
                      }
                    >
                      <SelectTrigger id="month">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = (i + 1).toString().padStart(2, "0");
                          return (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="year">Ano *</Label>
                    <Select
                      value={cardData.expiration_year}
                      onValueChange={(value) =>
                        setCardData({ ...cardData, expiration_year: value })
                      }
                    >
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 15 }, (_, i) => {
                          const year = (new Date().getFullYear() + i).toString();
                          return (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="cvv">CVV *</Label>
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
                </div>
              </div>
            </div>

            {/* Endereço de Cobrança */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Endereço de Cobrança</h3>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="zip">CEP *</Label>
                    <Input
                      id="zip"
                      placeholder="00000000"
                      value={billingAddress.zip_code}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          zip_code: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      maxLength={8}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <Label htmlFor="street">Rua *</Label>
                    <Input
                      id="street"
                      placeholder="Nome da rua"
                      value={billingAddress.street}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          street: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="num">Número *</Label>
                    <Input
                      id="num"
                      placeholder="123"
                      value={billingAddress.number}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          number: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Nome do bairro"
                      value={billingAddress.neighborhood}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          neighborhood: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      placeholder="Apto, sala, etc"
                      value={billingAddress.complement}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          complement: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      placeholder="Nome da cidade"
                      value={billingAddress.city}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      placeholder="SP"
                      value={billingAddress.state}
                      onChange={(e) =>
                        setBillingAddress({
                          ...billingAddress,
                          state: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={atualizarCartaoMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={atualizarCartaoMutation.isPending}
                className="min-w-[120px]"
              >
                {atualizarCartaoMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Atualizar Cartão"
                )}
              </Button>
            </div>

            {/* Segurança */}
            <div className="text-xs text-gray-500 text-center">
              🔒 Seus dados são criptografados e processados com segurança
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
