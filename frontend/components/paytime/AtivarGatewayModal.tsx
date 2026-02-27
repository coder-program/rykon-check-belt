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
    fees_banking_id: "",
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
    fees_banking_id: "",
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
        
        // Buscar URL do KYC se houver Banking ativo em WAITING_KYC
        const bankingGateway = data.data?.find(
          (gw: any) => gw.gateway?.id === 6 && gw.status === "WAITING_KYC"
        );
        
        if (bankingGateway?.id) {
          await fetchBankingKycUrl(bankingGateway.id);
        }
        
        // Buscar dados do BankAccount ativo para preencher campos
        const bankAccountGateway = data.data?.find(
          (gw: any) => gw.gateway?.id === 4 && gw.form_receipt === "BANKACCOUNT" && gw.active === true
        );
        
        if (bankAccountGateway) {
          // Passar o gateway completo em vez de só o ID
          await loadBankAccountData(bankAccountGateway);
        } else {
        }
      }
    } catch (error: any) {
      console.error("Erro ao buscar gateways:", error);
    } finally {
      setLoadingGateways(false);
    }
  };
  
  // Carregar dados do BankAccount ativo nos campos
  const loadBankAccountData = async (gatewayData: any) => {
    try {
      
      // Se já tiver bank_account nos dados, usar direto
      if (gatewayData.bank_account) {
        setBankAccountData({
          reference_id: gatewayData.reference_id || "",
          bank_code: gatewayData.bank_account.bank_code || "341",
          account_number: gatewayData.bank_account.account_number || "",
          account_check_digit: gatewayData.bank_account.account_check_digit || "",
          routing_number: gatewayData.bank_account.routing_number || "",
          routing_check_digit: gatewayData.bank_account.routing_check_digit || "",
          type: gatewayData.bank_account.type || "CHECKING",
          statement_descriptor: gatewayData.statement_descriptor || "",
          selected_plans: gatewayData.plans?.map((p: any) => p.id) || [],
          fees_banking_id: gatewayData.fees_banking_id?.toString() || "",
        });
        return;
      }
      
      // Se não tiver bank_account, tentar buscar na API
      const token = localStorage.getItem("token");
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways/${gatewayData.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const gateway = await response.json();
        
        if (gateway.bank_account) {
          setBankAccountData({
            reference_id: gateway.reference_id || "",
            bank_code: gateway.bank_account.bank_code || "341",
            account_number: gateway.bank_account.account_number || "",
            account_check_digit: gateway.bank_account.account_check_digit || "",
            routing_number: gateway.bank_account.routing_number || "",
            routing_check_digit: gateway.bank_account.routing_check_digit || "",
            type: gateway.bank_account.type || "CHECKING",
            statement_descriptor: gateway.statement_descriptor || "",
            selected_plans: gateway.plans?.map((p: any) => p.id) || [],
            fees_banking_id: gateway.fees_banking_id?.toString() || "",
          });
        } else {
        }
      } else {
        console.error("❌ Erro ao buscar detalhes do gateway na API:", response.status);
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar dados do BankAccount:", error);
    }
  };
  
  // Buscar URL do KYC do Banking
  const fetchBankingKycUrl = async (gatewayConfigId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways/${gatewayConfigId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const gateway = await response.json();
        const url = gateway.metadata?.url_documents_copy || gateway.metadata?.url_kyc;
        if (url) {
          setKycUrl(url);
        }
      }
    } catch (error: any) {
      console.error("Erro ao buscar detalhes do gateway Banking:", error);
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

  // Verificar se gateway já está ativo
  const isGatewayActive = (gatewayId: number, formReceipt?: string) => {
    const result = gateways.some(
      (gw) =>
        gw.gateway?.id === gatewayId &&
        gw.active === true &&
        (!formReceipt || gw.form_receipt === formReceipt)
    );

    return result;
  };

  // Obter gateway ativo
  const getActiveGateway = (gatewayId: number, formReceipt?: string) => {
    return gateways.find(
      (gw) =>
        gw.gateway?.id === gatewayId &&
        gw.active === true &&
        (!formReceipt || gw.form_receipt === formReceipt)
    );
  };

  // Ativar Banking Paytime (Gateway 6)
  const ativarBanking = async () => {
    try {
      setLoading(true);
      setKycUrl(null);

      const token = localStorage.getItem("token");
      const payload: any = {
        reference_id: bankingData.reference_id || `BANKING_${Date.now()}`,
        gateway_id: 6,
        active: true,
        form_receipt: "PAYTIME",
        fees_banking_id: bankingData.fees_banking_id 
          ? parseInt(bankingData.fees_banking_id) 
          : 0, // 0 = usa taxa padrão do marketplace
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
        
        // Erro específico: Taxa bancária inválida
        if (error.code === "BNK000112" || error.message?.includes("Taxa Bancária não pertence ao Marketplace")) {
          toast.error(
            "⚠️ ID de Taxa Bancária inválido para este marketplace. Deixe o campo vazio para usar a taxa padrão (0).",
            { duration: 6000 }
          );
          throw new Error("Taxa bancária inválida");
        }
        
        throw new Error(error.message || "Erro ao ativar Banking");
      }

      const result = await response.json();
      
      toast.success("Banking Paytime ativado com sucesso!");
      
      // Buscar URL do KYC
      if (result.metadata?.url_documents_copy) {
        setKycUrl(result.metadata.url_documents_copy);
        toast("📄 URL do KYC disponível abaixo. Complete a jornada para aprovação total.", {
          duration: 6000,
        });
      }

      fetchGateways();
    } catch (error: any) {
      // Não exibir toast duplicado se já tratado acima
      if (!error.message?.includes("Taxa bancária inválida")) {
        toast.error(error.message || "Erro ao ativar Banking");
      }
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
        
        // Erro específico: Banking não aprovado
        if (error.code === "REG000109" || error.message?.includes("Banking não habilitado")) {
          toast.error(
            "⚠️ SubPaytime requer Banking aprovado. Etapas: 1) Ativar Banking (ID 6), 2) Completar KYC, 3) Aguardar aprovação Paytime, 4) Ativar SubPaytime.",
            { duration: 8000 }
          );
          throw new Error("Banking não habilitado");
        }
        
        throw new Error(error.message || "Erro ao ativar SubPaytime");
      }

      toast.success("SubPaytime ativado com sucesso!");
      fetchGateways();
    } catch (error: any) {
      // Não exibir toast duplicado se já tratado acima
      if (!error.message?.includes("Banking não habilitado")) {
        toast.error(error.message || "Erro ao ativar SubPaytime");
      }
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
      const payload: any = {
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
        fees_banking_id: bankAccountData.fees_banking_id 
          ? parseInt(bankAccountData.fees_banking_id) 
          : 0, // 0 = usa taxa padrão do marketplace
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
        
        // Erro específico: Banking não aprovado
        if (error.code === "REG000109" || error.message?.includes("Banking não habilitado")) {
          toast.error(
            "⚠️ Conta bancária requer Banking aprovado. Complete o KYC do Banking (ID 6) antes.",
            { duration: 6000 }
          );
          throw new Error("Banking não habilitado");
        }
        
        // Erro específico: Taxa bancária inválida
        if (error.code === "BNK000112" || error.message?.includes("Taxa Bancária não pertence ao Marketplace")) {
          toast.error(
            "⚠️ ID de Taxa Bancária inválido. Deixe o campo vazio para usar a taxa padrão (0).",
            { duration: 6000 }
          );
          throw new Error("Taxa bancária inválida");
        }
        
        throw new Error(error.message || "Erro ao ativar BankAccount");
      }

      toast.success("Conta bancária configurada com sucesso! SubPaytime agora pode processar transações.");
      fetchGateways();
    } catch (error: any) {
      // Não exibir toast duplicado se já tratado acima
      if (!error.message?.includes("Banking não habilitado") && !error.message?.includes("Taxa bancária inválida")) {
        toast.error(error.message || "Erro ao ativar conta bancária");
      }
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

        {/* URL do KYC Pendente */}
        {kycUrl && (
          <Card className="border-yellow-300 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                🎯 KYC Pendente - Ação Necessária
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Banking ativado com sucesso!</strong> Agora você precisa completar o cadastro biométrico para aprovação total.
                </p>
                <div className="bg-white p-3 rounded-lg border border-yellow-200">
                  <p className="text-xs font-semibold text-gray-600 mb-2">📋 Próximos passos:</p>
                  <ol className="text-sm text-gray-700 space-y-1 ml-5 list-decimal">
                    <li>Clique no botão "Completar KYC" abaixo</li>
                    <li>Envie documentos (RG, CPF, Comprovante de endereço)</li>
                    <li>Complete a verificação biométrica (selfie)</li>
                    <li>Aguarde análise da Paytime (1-3 dias úteis)</li>
                    <li>Status mudará para APPROVED quando aprovado</li>
                  </ol>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Input 
                  value={kycUrl} 
                  readOnly 
                  className="flex-1 bg-white text-xs" 
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copiarUrl(kycUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                  onClick={() => window.open(kycUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Completar KYC
                </Button>
              </div>
              
              <p className="text-xs text-yellow-700">
                ⚠️ <strong>Importante:</strong> SubPaytime só poderá ser ativado após o KYC ser aprovado pela Paytime.
              </p>
            </CardContent>
          </Card>
        )}

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
            {/* Aviso informativo */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">📋 Fluxo de Ativação do Banking:</p>
                    <ol className="space-y-1 ml-4 list-decimal">
                      <li><strong>Ativar Banking</strong> - Status muda para WAITING_KYC</li>
                      <li><strong>Acessar URL do KYC</strong> - Aparece abaixo após ativação</li>
                      <li><strong>Completar documentação</strong> - Enviar documentos e biometria</li>
                      <li><strong>Aguardar aprovação</strong> - Paytime analisa (1-3 dias úteis)</li>
                      <li><strong>Banking APPROVED</strong> - Aí pode ativar SubPaytime</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    disabled={isGatewayActive(6)}
                  />
                </div>

                <div>
                  <Label htmlFor="banking-fees">ID Tarifa Bancária (Opcional)</Label>
                  <Input
                    id="banking-fees"
                    type="number"
                    placeholder="Deixe vazio para usar padrão do marketplace"
                    value={bankingData.fees_banking_id}
                    onChange={(e) =>
                      setBankingData({ ...bankingData, fees_banking_id: e.target.value })
                    }
                    disabled={isGatewayActive(6)}
                  />
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Apenas preencha se souber o ID específico do marketplace. Deixar vazio usa a taxa padrão.
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

                {/* Gateway já ativo */}
                {isGatewayActive(6) && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-900">
                          <p className="font-semibold mb-1">✅ Banking já está ativo!</p>
                          <p className="text-xs">
                            Status: <strong>{getActiveGateway(6)?.status}</strong> • 
                            Gateway ID: <strong>{getActiveGateway(6)?.gateway?.id}</strong>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={ativarBanking}
                  disabled={loading || isGatewayActive(6)}
                  className="w-full"
                  size="lg"
                  title={isGatewayActive(6) ? "Banking já está ativo. Não é necessário ativar novamente." : ""}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ativando...
                    </>
                  ) : isGatewayActive(6) ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Banking Já Ativo
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
            {/* Aviso informativo */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-semibold mb-2">⚠️ Pré-requisito Obrigatório:</p>
                    <p className="mb-2">SubPaytime <strong>só pode ser ativado</strong> se:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li><strong>Banking (ID 6)</strong> estiver ativo</li>
                      <li><strong>KYC completado</strong> no link recebido após ativar Banking</li>
                      <li><strong>Status APPROVED</strong> confirmado pela Paytime (1-3 dias)</li>
                    </ul>
                    <p className="mt-2 text-xs">
                      💡 <strong>Erro "Banking não habilitado"?</strong> Volte à aba Banking, complete o KYC e aguarde aprovação.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    disabled={isGatewayActive(4, "PAYTIME")}
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
                    disabled={isGatewayActive(4, "PAYTIME")}
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
                            className={`flex items-center gap-2 p-2 rounded ${
                              isGatewayActive(4, "PAYTIME") 
                                ? "opacity-50 cursor-not-allowed" 
                                : "cursor-pointer hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={subPaytimeData.selected_plans.includes(plan.id)}
                              disabled={isGatewayActive(4, "PAYTIME")}
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

                {/* Gateway já ativo */}
                {isGatewayActive(4, "PAYTIME") && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-900">
                          <p className="font-semibold mb-1">✅ SubPaytime já está ativo neste estabelecimento!</p>
                          <p className="text-xs">
                            Status: <strong>{getActiveGateway(4, "PAYTIME")?.status}</strong> • 
                            Gateway ID: <strong>{getActiveGateway(4, "PAYTIME")?.gateway?.id}</strong>
                          </p>
                          <p className="text-xs mt-2 text-green-700">
                            🚨 <strong>Não é necessário ativar novamente.</strong> Você já pode processar transações.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={ativarSubPaytime}
                  disabled={loading || !subPaytimeData.statement_descriptor || subPaytimeData.selected_plans.length === 0 || isGatewayActive(4, "PAYTIME")}
                  className="w-full"
                  size="lg"
                  title={isGatewayActive(4, "PAYTIME") ? "SubPaytime já está ativo. Não é possível ativar novamente." : ""}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ativando...
                    </>
                  ) : isGatewayActive(4, "PAYTIME") ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      SubPaytime Já Ativo
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
            {/* Aviso informativo */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">ℹ️ Sobre Conta Bancária:</p>
                    <p className="mb-2">Configure uma conta bancária externa (Gateway 4 com form_receipt BANKACCOUNT) para recebimento direto via SubPaytime.</p>
                    <p className="text-xs">
                      <strong>Nota:</strong> Também requer Banking (ID 6) aprovado antes de ativar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    disabled={isGatewayActive(4, "BANKACCOUNT")}
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
                      disabled={isGatewayActive(4, "BANKACCOUNT")}
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
                      disabled={isGatewayActive(4, "BANKACCOUNT")}
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
                      disabled={isGatewayActive(4, "BANKACCOUNT")}
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
                      disabled={isGatewayActive(4, "BANKACCOUNT")}
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
                      disabled={isGatewayActive(4, "BANKACCOUNT")}
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
                      disabled={isGatewayActive(4, "BANKACCOUNT")}
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
                    disabled={isGatewayActive(4, "BANKACCOUNT")}
                  />
                </div>

                <div>
                  <Label htmlFor="bank-fees">ID Tarifa Bancária (Opcional)</Label>
                  <Input
                    id="bank-fees"
                    type="number"
                    placeholder="Deixe vazio para usar padrão do marketplace"
                    value={bankAccountData.fees_banking_id}
                    onChange={(e) =>
                      setBankAccountData({
                        ...bankAccountData,
                        fees_banking_id: e.target.value,
                      })
                    }
                    disabled={isGatewayActive(4, "BANKACCOUNT")}
                  />
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ Se houver erro "Taxa não pertence ao Marketplace", deixe este campo vazio.
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
                              disabled={isGatewayActive(4, "BANKACCOUNT")}
                              className={`rounded ${isGatewayActive(4, "BANKACCOUNT") ? "opacity-50 cursor-not-allowed" : ""}`}
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

                {/* Gateway já ativo - Bloqueado */}
                {isGatewayActive(4, "BANKACCOUNT") && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="flex gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-900">
                          <p className="font-semibold mb-1">✅ Conta bancária já configurada neste estabelecimento!</p>
                          <p className="text-xs">
                            Status: <strong>{getActiveGateway(4, "BANKACCOUNT")?.status}</strong> • 
                            Gateway ID: <strong>{getActiveGateway(4, "BANKACCOUNT")?.gateway?.id}</strong>
                          </p>
                          <p className="text-xs mt-2 text-green-700">
                            🚨 Não é necessário configurar novamente.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={ativarBankAccount}
                  disabled={
                    loading ||
                    !bankAccountData.account_number ||
                    !bankAccountData.bank_code ||
                    bankAccountData.selected_plans.length === 0 ||
                    isGatewayActive(4, "BANKACCOUNT")
                  }
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ativando...
                    </>
                  ) : isGatewayActive(4, "BANKACCOUNT") ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Conta Já Configurada
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
