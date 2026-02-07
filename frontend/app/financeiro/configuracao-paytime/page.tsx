"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface PaytimePlan {
  id: number;
  name: string;
  gateway_id: number;
  active: boolean;
  type: string;
  modality: string;
}

interface SelectedPlan {
  id: number;
  active: boolean;
  name: string;
}

export default function ConfiguracaoPaytime() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<PaytimePlan[]>([]);
  const [selectedPlans, setSelectedPlans] = useState<SelectedPlan[]>([]);
  const [unidadeId, setUnidadeId] = useState<string>("");
  const [unidadeNome, setUnidadeNome] = useState<string>("");
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUnidadeId(user.unidade_id);
      setUnidadeNome(user.unidade_nome || "Unidade");
    }
  }, []);

  useEffect(() => {
    if (unidadeId) {
      carregarDados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Buscar planos disponíveis na API Paytime (filtrar apenas SubPaytime - gateway_id = 4)
      const plansResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/plans?filters=${encodeURIComponent(JSON.stringify({ gateway_id: 4, active: true }))}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!plansResponse.ok) {
        throw new Error("Erro ao buscar planos disponíveis");
      }

      const plansData = await plansResponse.json();
      setAvailablePlans(plansData.data || []);

      // Buscar planos selecionados da unidade
      const selectedResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/unidades/${unidadeId}/plans`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (selectedResponse.ok) {
        const selectedData = await selectedResponse.json();
        setSelectedPlans(selectedData || []);
      }

      // Buscar informações da unidade para verificar establishment_id
      const unidadeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/people/unidades/${unidadeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (unidadeResponse.ok) {
        const unidadeData = await unidadeResponse.json();
        setEstablishmentId(unidadeData.paytime_establishment_id);
      }

    } catch (error: unknown) {
      console.error("Erro ao carregar dados:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao carregar configurações";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isPlanSelected = (planId: number): boolean => {
    return selectedPlans.some(p => p.id === planId && p.active);
  };

  const handleTogglePlan = (plan: PaytimePlan) => {
    setHasChanges(true);
    
    if (isPlanSelected(plan.id)) {
      // Remover plano
      setSelectedPlans(prev => prev.filter(p => p.id !== plan.id));
    } else {
      // Adicionar plano
      setSelectedPlans(prev => [
        ...prev,
        { id: plan.id, active: true, name: plan.name }
      ]);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/unidades/${unidadeId}/plans`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plans: selectedPlans }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao salvar planos");
      }

      toast.success("✅ Planos salvos com sucesso!");
      setHasChanges(false);
      await carregarDados();

    } catch (error: unknown) {
      console.error("Erro ao salvar planos:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao salvar planos";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getPlanTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      COMMERCIAL: "bg-blue-100 text-blue-800 border-blue-300",
      TECHNICAL: "bg-purple-100 text-purple-800 border-purple-300",
    };
    return colors[type] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getModalityBadge = (modality: string) => {
    const colors: Record<string, string> = {
      ONLINE: "bg-green-100 text-green-800 border-green-300",
      OFFLINE: "bg-orange-100 text-orange-800 border-orange-300",
    };
    return colors[modality] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!establishmentId) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle className="text-red-900">
                Estabelecimento Rykon-Pay não configurado
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              A unidade <strong>{unidadeNome}</strong> ainda não possui um estabelecimento Rykon-Pay vinculado.
              <br />
              Entre em contato com o administrador do sistema para configurar a integração Rykon-Pay.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ⚙️ Configuração Rykon-Pay
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie os planos comerciais para processamento de pagamentos
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* Informações da Unidade */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">📋 Unidade Atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Nome:</span>
            <span className="text-gray-900">{unidadeNome}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Establishment ID:</span>
            <Badge className="bg-blue-600">{establishmentId}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Planos Selecionados:</span>
            <Badge className="bg-green-600">{selectedPlans.length}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Planos Disponíveis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💳 Planos Comerciais Rykon-Pay
            <Badge variant="outline">{availablePlans.length} disponíveis</Badge>
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Selecione os planos comerciais que serão utilizados para processar pagamentos nesta unidade.
            Cada plano possui diferentes taxas e condições de processamento.
          </p>
        </CardHeader>
        <CardContent>
          {availablePlans.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3" />
              <p>Nenhum plano comercial disponível</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availablePlans.map((plan) => {
                const isSelected = isPlanSelected(plan.id);
                
                return (
                  <div
                    key={plan.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-green-500 bg-green-50 shadow-md"
                        : "border-gray-200 hover:border-blue-300 hover:shadow"
                    }`}
                    onClick={() => handleTogglePlan(plan)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleTogglePlan(plan)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          <h3 className="font-semibold text-gray-900">
                            {plan.name}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge 
                            variant="outline" 
                            className={getPlanTypeBadge(plan.type)}
                          >
                            {plan.type}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={getModalityBadge(plan.modality)}
                          >
                            {plan.modality}
                          </Badge>
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
                            ID: {plan.id}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Planos Selecionados - Resumo */}
      {selectedPlans.length > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Planos Selecionados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedPlans.map((plan) => (
                <Badge 
                  key={plan.id} 
                  className="bg-green-600 text-white py-2 px-3"
                >
                  {plan.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
