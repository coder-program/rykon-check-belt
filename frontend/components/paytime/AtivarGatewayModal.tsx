"use client";

import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Wallet,
  CreditCard,
  Building2,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";

interface AtivarGatewayModalProps {
  open: boolean;
  onClose: () => void;
  establishmentId: string;
  establishmentName: string;
}

interface Plan {
  id: number;
  name: string;
  description?: string;
}

interface GatewayConfig {
  id: number;
  gateway: {
    id: number;
    name: string;
  };
  status: string;
  active: boolean;
  form_receipt: string;
  gateway_key?: string;
  metadata?: any;
  created_at: string;
}

export default function AtivarGatewayModal({
  open,
  onClose,
  establishmentId,
  establishmentName,
}: AtivarGatewayModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("banking");
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingGateways, setLoadingGateways] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [kycUrl, setKycUrl] = useState<string | null>(null);

  // Banking Paytime (Gateway 6)
  const [bankingData, setBankingData] = useState({
    reference_id: "",
    fees_banking_id: "0",
  });

  // SubPaytime (Gateway 4)
  const [subPaytimeData, setSubPaytimeData] = useState({
    reference_id: "",
    statement_descriptor: "",
    selected_plans: [] as number[],
  });

  // BankAccount
  const [bankAccountData, setBankAccountData] = useState({
    reference_id: "",
    statement_descriptor: "",
    account_number: "",
    account_check_digit: "",
    routing_number: "",
    routing_check_digit: "",
    bank_code: "341",
    type: "CHECKING" as "CHECKING" | "SAVING",
    selected_plans: [] as number[],
    fees_banking_id: "0",
  });

  // Buscar gateways ativos do estabelecimento
  const fetchGateways = async () => {
    try {
      setLoadingGateways(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGateways(data.data || []);
      }
    } catch (error: any) {
      console.error("Erro ao buscar gateways:", error);
    } finally {
      setLoadingGateways(false);
    }
  };

  // Buscar planos disponíveis
  const fetchPlans = async () => {
    try {
      setLoadingPlans(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/plans`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlans(data.data || []);
      }
    } catch (error: any) {
      console.error("Erro ao buscar planos:", error);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchGateways();
      fetchPlans();
    }
  }, [open]);

  // Ativar Banking Paytime (Gateway 6)
  const ativarBanking = async () => {
    try {
      setLoading(true);
      setKycUrl(null);

      const token = localStorage.getItem("token");
      const payload = {
        reference_id: bankingData.reference_id || `BANKING_${Date.now()}`,
        gateway_id: 6,
        active: true,
        form_receipt: "PAYTIME",
        fees_banking_id: parseInt(bankingData.fees_banking_id),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao ativar Banking");
      }

      const result = await response.json();
      
      toast.success("Banking Paytime ativado com sucesso!");
      
      // Buscar URL do KYC
      if (result.metadata?.url_documents_copy) {
        setKycUrl(result.metadata.url_documents_copy);
        toast("URL do KYC disponível. Complete a jornada para aprovação.", {
          icon: "📄",
          duration: 5000,
        });
      }

      fetchGateways();
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar Banking");
    } finally {
      setLoading(false);
    }
  };

  // Ativar SubPaytime (Gateway 4)
  const ativarSubPaytime = async () => {
    try {
      if (!subPaytimeData.statement_descriptor) {
        toast.error("Descrição no extrato é obrigatória");
        return;
      }

      if (subPaytimeData.selected_plans.length === 0) {
        toast.error("Selecione pelo menos um plano");
        return;
      }

      setLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        reference_id: subPaytimeData.reference_id || `SUBPAYTIME_${Date.now()}`,
        gateway_id: 4,
        active: true,
        form_receipt: "PAYTIME",
        statement_descriptor: subPaytimeData.statement_descriptor,
        plans: subPaytimeData.selected_plans.map((id) => ({
          id,
          active: true,
        })),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao ativar SubPaytime");
      }

      toast.success("SubPaytime ativado com sucesso!");
      fetchGateways();
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar SubPaytime");
    } finally {
      setLoading(false);
    }
  };

  // Ativar BankAccount
  const ativarBankAccount = async () => {
    try {
      if (!bankAccountData.account_number || !bankAccountData.bank_code) {
        toast.error("Preencha os dados bancários obrigatórios");
        return;
      }

      if (bankAccountData.selected_plans.length === 0) {
        toast.error("Selecione pelo menos um plano");
        return;
      }

      setLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        reference_id: bankAccountData.reference_id || `BANKACCOUNT_${Date.now()}`,
        gateway_id: 4,
        active: true,
        form_receipt: "BANKACCOUNT",
        bank_account: {
          account_number: bankAccountData.account_number,
          account_check_digit: bankAccountData.account_check_digit,
          routing_number: bankAccountData.routing_number,
          routing_check_digit: bankAccountData.routing_check_digit || "",
          bank_code: bankAccountData.bank_code,
          type: bankAccountData.type,
        },
        statement_descriptor: bankAccountData.statement_descriptor || "Pagamento",
        plans: bankAccountData.selected_plans.map((id) => ({
          id,
          active: true,
        })),
        fees_banking_id: parseInt(bankAccountData.fees_banking_id),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao ativar BankAccount");
      }

      toast.success("Conta bancária configurada com sucesso!");
      fetchGateways();
    } catch (error: any) {
      toast.error(error.message || "Erro ao ativar conta bancária");
    } finally {
      setLoading(false);
    }
  };

  const copiarUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada para área de transferência!");
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      APPROVED: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      WAITING: "bg-blue-100 text-blue-800",
      ANALYZE: "bg-purple-100 text-purple-800",
      BLOCKED: "bg-red-100 text-red-800",
      CANCELED: "bg-gray-100 text-gray-800",
      DISAPPROVED: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ativar Gateway - {establishmentName}</DialogTitle>
          <DialogDescription>
            Configure gateways de pagamento para o estabelecimento
          </DialogDescription>
        </DialogHeader>

        {/* Gateways Ativos */}
        {loadingGateways ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : gateways.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Gateways Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {gateways.map((gw) => (
                  <div
                    key={gw.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {gw.gateway.id === 6 ? (
                          <Wallet className="h-4 w-4 text-blue-600" />
                        ) : (
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{gw.gateway.name}</p>
                        <p className="text-xs text-gray-500">
                          {gw.form_receipt} • Gateway ID: {gw.gateway.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(gw.status)}
                      {gw.active ? (
                        <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inativo</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="banking">
              <Wallet className="h-4 w-4 mr-2" />
              Banking
            </TabsTrigger>
            <TabsTrigger value="subpaytime">
              <CreditCard className="h-4 w-4 mr-2" />
              SubPaytime
            </TabsTrigger>
            <TabsTrigger value="bankaccount">
              <Building2 className="h-4 w-4 mr-2" />
              BankAccount
            </TabsTrigger>
          </TabsList>

          {/* BANKING PAYTIME */}
          <TabsContent value="banking" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Banking Paytime (Gateway ID 6)</CardTitle>
                <CardDescription>
                  Ative o Banking para habilitar saldo, extrato e transferências.
                  <strong className="text-yellow-600"> Requer conclusão do KYC após ativação.</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="banking-ref">Reference ID (Opcional)</Label>
                  <Input
                    id="banking-ref"
                    placeholder="Seu ID interno de referência"
                    value={bankingData.reference_id}
                    onChange={(e) =>
                      setBankingData({ ...bankingData, reference_id: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="banking-fees">ID Tarifa Bancária</Label>
                  <Input
                    id="banking-fees"
                    type="number"
                    placeholder="0"
                    value={bankingData.fees_banking_id}
                    onChange={(e) =>
                      setBankingData({ ...bankingData, fees_banking_id: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Consulte pacotes de tarifas na documentação
                  </p>
                </div>

                {kycUrl && (
                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        URL do KYC Disponível
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-700">
                        O cliente deve acessar este link e concluir a jornada de KYC para
                        que o Banking seja aprovado.
                      </p>
                      <div className="flex gap-2">
                        <Input value={kycUrl} readOnly className="flex-1" />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copiarUrl(kycUrl)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => window.open(kycUrl, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Abrir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={ativarBanking}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Ativar Banking Paytime
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUBPAYTIME */}
          <TabsContent value="subpaytime" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SubPaytime (Gateway ID 4)</CardTitle>
                <CardDescription>
                  Subadquirente Paytime para processar transações (PIX, Cartão, Boleto).
                  <strong className="text-yellow-600"> Requer Banking (ID 6) ativo e KYC aprovado.</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sub-ref">Reference ID (Opcional)</Label>
                  <Input
                    id="sub-ref"
                    placeholder="Seu ID interno de referência"
                    value={subPaytimeData.reference_id}
                    onChange={(e) =>
                      setSubPaytimeData({
                        ...subPaytimeData,
                        reference_id: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="sub-descriptor">
                    Descrição no Extrato <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sub-descriptor"
                    placeholder="Nome que aparecerá na fatura do cliente"
                    value={subPaytimeData.statement_descriptor}
                    onChange={(e) =>
                      setSubPaytimeData({
                        ...subPaytimeData,
                        statement_descriptor: e.target.value,
                      })
                    }
                    maxLength={22}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 22 caracteres
                  </p>
                </div>

                <div>
                  <Label>
                    Planos Comerciais <span className="text-red-500">*</span>
                  </Label>
                  {loadingPlans ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {plans.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Nenhum plano disponível
                        </p>
                      ) : (
                        plans.map((plan) => (
                          <label
                            key={plan.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={subPaytimeData.selected_plans.includes(plan.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSubPaytimeData({
                                    ...subPaytimeData,
                                    selected_plans: [
                                      ...subPaytimeData.selected_plans,
                                      plan.id,
                                    ],
                                  });
                                } else {
                                  setSubPaytimeData({
                                    ...subPaytimeData,
                                    selected_plans:
                                      subPaytimeData.selected_plans.filter(
                                        (id) => id !== plan.id
                                      ),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{plan.name}</p>
                              {plan.description && (
                                <p className="text-xs text-gray-500">
                                  {plan.description}
                                </p>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Selecione os planos que serão vinculados
                  </p>
                </div>

                <Button
                  onClick={ativarSubPaytime}
                  disabled={loading || !subPaytimeData.statement_descriptor || subPaytimeData.selected_plans.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Ativar SubPaytime
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BANKACCOUNT */}
          <TabsContent value="bankaccount" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conta Bancária (BankAccount)</CardTitle>
                <CardDescription>
                  Configure uma conta bancária externa para recebimento direto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bank-ref">Reference ID (Opcional)</Label>
                  <Input
                    id="bank-ref"
                    placeholder="Seu ID interno de referência"
                    value={bankAccountData.reference_id}
                    onChange={(e) =>
                      setBankAccountData({
                        ...bankAccountData,
                        reference_id: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank-code">
                      Código do Banco <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="bank-code"
                      placeholder="341"
                      value={bankAccountData.bank_code}
                      onChange={(e) =>
                        setBankAccountData({
                          ...bankAccountData,
                          bank_code: e.target.value,
                        })
                      }
                      maxLength={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ex: 341 (Itaú), 104 (Caixa)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="account-type">Tipo de Conta</Label>
                    <Select
                      value={bankAccountData.type}
                      onValueChange={(value: "CHECKING" | "SAVING") =>
                        setBankAccountData({ ...bankAccountData, type: value })
                      }
                    >
                      <SelectTrigger id="account-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CHECKING">Corrente</SelectItem>
                        <SelectItem value="SAVING">Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="routing">
                      Agência <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="routing"
                      placeholder="1234"
                      value={bankAccountData.routing_number}
                      onChange={(e) =>
                        setBankAccountData({
                          ...bankAccountData,
                          routing_number: e.target.value,
                        })
                      }
                      maxLength={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="routing-digit">Dígito Agência</Label>
                    <Input
                      id="routing-digit"
                      placeholder="9"
                      value={bankAccountData.routing_check_digit}
                      onChange={(e) =>
                        setBankAccountData({
                          ...bankAccountData,
                          routing_check_digit: e.target.value,
                        })
                      }
                      maxLength={1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account">
                      Conta <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="account"
                      placeholder="123456"
                      value={bankAccountData.account_number}
                      onChange={(e) =>
                        setBankAccountData({
                          ...bankAccountData,
                          account_number: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="account-digit">
                      Dígito Conta <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="account-digit"
                      placeholder="1"
                      value={bankAccountData.account_check_digit}
                      onChange={(e) =>
                        setBankAccountData({
                          ...bankAccountData,
                          account_check_digit: e.target.value,
                        })
                      }
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bank-descriptor">Descrição no Extrato</Label>
                  <Input
                    id="bank-descriptor"
                    placeholder="Nome que aparecerá na fatura"
                    value={bankAccountData.statement_descriptor}
                    onChange={(e) =>
                      setBankAccountData({
                        ...bankAccountData,
                        statement_descriptor: e.target.value,
                      })
                    }
                    maxLength={22}
                  />
                </div>

                <div>
                  <Label htmlFor="bank-fees">ID Tarifa Bancária</Label>
                  <Input
                    id="bank-fees"
                    type="number"
                    placeholder="0"
                    value={bankAccountData.fees_banking_id}
                    onChange={(e) =>
                      setBankAccountData({
                        ...bankAccountData,
                        fees_banking_id: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>
                    Planos Comerciais <span className="text-red-500">*</span>
                  </Label>
                  {loadingPlans ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {plans.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Nenhum plano disponível
                        </p>
                      ) : (
                        plans.map((plan) => (
                          <label
                            key={plan.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={bankAccountData.selected_plans.includes(
                                plan.id
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBankAccountData({
                                    ...bankAccountData,
                                    selected_plans: [
                                      ...bankAccountData.selected_plans,
                                      plan.id,
                                    ],
                                  });
                                } else {
                                  setBankAccountData({
                                    ...bankAccountData,
                                    selected_plans:
                                      bankAccountData.selected_plans.filter(
                                        (id) => id !== plan.id
                                      ),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{plan.name}</p>
                              {plan.description && (
                                <p className="text-xs text-gray-500">
                                  {plan.description}
                                </p>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={ativarBankAccount}
                  disabled={
                    loading ||
                    !bankAccountData.account_number ||
                    !bankAccountData.bank_code ||
                    bankAccountData.selected_plans.length === 0
                  }
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Ativar Conta Bancária
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
