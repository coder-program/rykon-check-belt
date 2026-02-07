"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
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
import { PaytimePlan } from "@/types/paytime";

interface ActivateGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentId: number;
  establishmentName: string;
  onSuccess?: () => void;
}

interface SelectedPlan {
  id: number;
  name: string;
  active: boolean;
}

export function ActivateGatewayModal({
  isOpen,
  onClose,
  establishmentId,
  establishmentName,
  onSuccess,
}: ActivateGatewayModalProps) {
  const [step, setStep] = useState<"select" | "banking" | "subpaytime">(
    "select"
  );
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<PaytimePlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<SelectedPlan[]>([]);

  // Banking form
  const [bankingData, setBankingData] = useState({
    reference_id: `BANKING-${establishmentId}-${Date.now()}`,
    fees_banking_id: "2",
  });

  // SubPaytime form
  const [subpaytimeData, setSubpaytimeData] = useState({
    reference_id: `SUBPAYTIME-${establishmentId}-${Date.now()}`,
    statement_descriptor: "",
  });

  useEffect(() => {
    if (step === "subpaytime" && plans.length === 0) {
      loadPlans();
    }
  }, [step]);

  const loadPlans = async () => {
    try {
      setLoadingPlans(true);

      // Buscar planos do gateway SubPaytime (ID 4)
      const params = new URLSearchParams({
        page: "1",
        perPage: "100",
        filters: JSON.stringify({ gateway_id: 4, active: true }),
        sorters: JSON.stringify([{ column: "name", direction: "ASC" }]),
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/plans?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar planos");
      }

      const data = await response.json();
      setPlans(data.data || []);
    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      toast.error("Erro ao carregar planos comerciais");
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleActivateBanking = async () => {
    if (!bankingData.fees_banking_id) {
      toast.error("Selecione o pacote de tarifas");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        reference_id: bankingData.reference_id,
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
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao ativar Banking");
      }

      const result = await response.json();

      toast.success("Banking ativado com sucesso!");

      // Buscar URL do KYC
      if (result.id) {
        const gatewayResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways/${result.id}`
        );

        if (gatewayResponse.ok) {
          const gatewayData = await gatewayResponse.json();
          if (gatewayData.metadata?.url_documents_copy) {
            toast.success(
              "URL do KYC obtida! Será exibida nos detalhes do estabelecimento",
              { duration: 5000 }
            );
          }
        }
      }

      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error("Erro ao ativar Banking:", error);
      toast.error(error.message || "Erro ao ativar Banking");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSubPaytime = async () => {
    if (!subpaytimeData.statement_descriptor.trim()) {
      toast.error("Informe o nome que aparecerá na fatura");
      return;
    }

    if (subpaytimeData.statement_descriptor.length > 22) {
      toast.error("O nome na fatura deve ter no máximo 22 caracteres");
      return;
    }

    if (selectedPlans.length === 0) {
      toast.error("Selecione pelo menos um plano comercial");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        reference_id: subpaytimeData.reference_id,
        gateway_id: 4,
        active: true,
        form_receipt: "PAYTIME",
        statement_descriptor: subpaytimeData.statement_descriptor,
        plans: selectedPlans.map((p) => ({ id: p.id, active: p.active })),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Erro ao ativar SubPaytime");
      }

      toast.success("SubPaytime ativado com sucesso!");
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error("Erro ao ativar SubPaytime:", error);
      toast.error(error.message || "Erro ao ativar SubPaytime");
    } finally {
      setLoading(false);
    }
  };

  const togglePlan = (plan: PaytimePlan) => {
    const exists = selectedPlans.find((p) => p.id === plan.id);

    if (exists) {
      setSelectedPlans(selectedPlans.filter((p) => p.id !== plan.id));
    } else {
      setSelectedPlans([
        ...selectedPlans,
        { id: plan.id, name: plan.name, active: true },
      ]);
    }
  };

  const handleClose = () => {
    setStep("select");
    setBankingData({
      reference_id: `BANKING-${establishmentId}-${Date.now()}`,
      fees_banking_id: "2",
    });
    setSubpaytimeData({
      reference_id: `SUBPAYTIME-${establishmentId}-${Date.now()}`,
      statement_descriptor: "",
    });
    setSelectedPlans([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🔌 Ativar Gateway
          </DialogTitle>
          <DialogDescription>
            Estabelecimento: <strong>{establishmentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Selecionar Gateway */}
          {step === "select" && (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Escolha qual gateway deseja ativar para este estabelecimento:
              </div>

              <div className="grid gap-4">
                {/* Banking */}
                <button
                  onClick={() => setStep("banking")}
                  className="flex items-start gap-4 rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                    <span className="text-2xl">🏦</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      Banking Paytime
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Serviços bancários, transferências e P2P. Obrigatório
                      para split de pagamentos.
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        Gateway ID: 6
                      </span>
                    </div>
                  </div>
                </button>

                {/* SubPaytime */}
                <button
                  onClick={() => setStep("subpaytime")}
                  className="flex items-start gap-4 rounded-lg border-2 border-gray-200 p-4 text-left transition-all hover:border-purple-500 hover:bg-purple-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">SubPaytime</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Plataforma de subadquirência para processamento de
                      pagamentos com split.
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                        Gateway ID: 4
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Formulário Banking */}
          {step === "banking" && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("select")}
              >
                ← Voltar
              </Button>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <div className="text-sm text-blue-800">
                    <strong>Importante:</strong> Após ativar o Banking, será
                    necessário completar o KYC (upload de documentos) para
                    aprovação final.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>ID de Referência</Label>
                  <Input
                    value={bankingData.reference_id}
                    onChange={(e) =>
                      setBankingData({
                        ...bankingData,
                        reference_id: e.target.value,
                      })
                    }
                    placeholder="Identificador único no seu sistema"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Use um ID único para identificar esta configuração
                  </p>
                </div>

                <div>
                  <Label>Pacote de Tarifas</Label>
                  <Select
                    value={bankingData.fees_banking_id}
                    onValueChange={(value) =>
                      setBankingData({ ...bankingData, fees_banking_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">Pacote Padrão (ID: 2)</SelectItem>
                      <SelectItem value="1">Pacote Premium (ID: 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handleActivateBanking} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Ativar Banking
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Formulário SubPaytime */}
          {step === "subpaytime" && (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("select")}
              >
                ← Voltar
              </Button>

              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-purple-600" />
                  <div className="text-sm text-purple-800">
                    <strong>Atenção:</strong> É recomendado ativar o Banking
                    antes do SubPaytime para garantir funcionamento completo do
                    split de pagamentos.
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>ID de Referência</Label>
                  <Input
                    value={subpaytimeData.reference_id}
                    onChange={(e) =>
                      setSubpaytimeData({
                        ...subpaytimeData,
                        reference_id: e.target.value,
                      })
                    }
                    placeholder="Identificador único no seu sistema"
                  />
                </div>

                <div>
                  <Label>Nome na Fatura (máx 22 caracteres)</Label>
                  <Input
                    value={subpaytimeData.statement_descriptor}
                    onChange={(e) =>
                      setSubpaytimeData({
                        ...subpaytimeData,
                        statement_descriptor: e.target.value.slice(0, 22),
                      })
                    }
                    placeholder="Ex: MINHA EMPRESA"
                    maxLength={22}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {subpaytimeData.statement_descriptor.length}/22 caracteres
                  </p>
                </div>

                <div>
                  <Label>Planos Comerciais *</Label>
                  {loadingPlans ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="mt-2 max-h-60 space-y-2 overflow-y-auto rounded-lg border p-3">
                      {plans.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Nenhum plano disponível
                        </p>
                      ) : (
                        plans.map((plan) => {
                          const isSelected = selectedPlans.some(
                            (p) => p.id === plan.id
                          );
                          return (
                            <label
                              key={plan.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                                isSelected
                                  ? "border-purple-500 bg-purple-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePlan(plan)}
                                className="h-4 w-4 text-purple-600"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {plan.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {plan.id} • {plan.modality}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {selectedPlans.length} plano(s) selecionado(s)
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handleActivateSubPaytime} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Ativar SubPaytime
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
