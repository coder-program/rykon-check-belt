"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Loader2,
  Save,
  Search,
  CheckCircle2,
  XCircle,
  Settings,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Unidade {
  id: string;
  nome: string;
  cnpj: string;
  paytime_establishment_id: string | null;
  paytime_plans: Array<{ id: number; active: boolean; name: string }> | null;
}

interface PaytimeEstablishment {
  id: number;
  document: string;
  first_name: string;
  last_name: string;
  status: string;
}

interface PaytimePlan {
  id: number;
  name: string;
  gateway_id: number;
  active: boolean;
  type: string;
  modality: string;
}

export default function UnidadesPlanosPage() {
  const [loading, setLoading] = useState(true);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [filteredUnidades, setFilteredUnidades] = useState<Unidade[]>([]);
  const [establishments, setEstablishments] = useState<PaytimeEstablishment[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PaytimePlan[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<Unidade | null>(null);
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>("");
  const [selectedPlans, setSelectedPlans] = useState<Array<{ id: number; active: boolean; name: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = unidades.filter(
        (u) =>
          u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.cnpj.includes(searchTerm)
      );
      setFilteredUnidades(filtered);
    } else {
      setFilteredUnidades(unidades);
    }
  }, [searchTerm, unidades]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Buscar todas as unidades
      const unidadesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!unidadesResponse.ok) throw new Error("Erro ao buscar unidades");
      const unidadesData = await unidadesResponse.json();
      
      // O endpoint retorna { items, page, pageSize, total, hasNextPage }
      const unidadesList = unidadesData.items || unidadesData;
      
      setUnidades(Array.isArray(unidadesList) ? unidadesList : []);
      setFilteredUnidades(Array.isArray(unidadesList) ? unidadesList : []);

      // Buscar estabelecimentos Paytime
      const establishmentsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (establishmentsResponse.ok) {
        const establishmentsData = await establishmentsResponse.json();
        setEstablishments(establishmentsData.data || []);
      }

      // Buscar planos comerciais Paytime (gateway_id = 4)
      const plansResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/plans?filters=${encodeURIComponent(
          JSON.stringify({ gateway_id: 4, active: true })
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setAvailablePlans(plansData.data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (unidade: Unidade) => {
    setSelectedUnidade(unidade);
    setSelectedEstablishment(unidade.paytime_establishment_id || "");
    setSelectedPlans(unidade.paytime_plans || []);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUnidade(null);
    setSelectedEstablishment("");
    setSelectedPlans([]);
  };

  const isPlanSelected = (planId: number): boolean => {
    return selectedPlans.some((p) => p.id === planId && p.active);
  };

  const handleTogglePlan = (plan: PaytimePlan) => {
    if (isPlanSelected(plan.id)) {
      setSelectedPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } else {
      setSelectedPlans((prev) => [
        ...prev,
        { id: plan.id, active: true, name: plan.name },
      ]);
    }
  };

  const handleSave = async () => {
    if (!selectedUnidade) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      // 1. Atualizar establishment_id na unidade
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/people/unidades/${selectedUnidade.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paytime_establishment_id: selectedEstablishment || null,
          }),
        }
      );

      // 2. Atualizar planos selecionados
      if (selectedEstablishment) {
        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/paytime/unidades/${selectedUnidade.id}/plans`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ plans: selectedPlans }),
          }
        );
      }

      toast.success("✅ Configuração salva com sucesso!");
      handleCloseModal();
      await carregarDados();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (unidade: Unidade) => {
    if (!unidade.paytime_establishment_id) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
          <XCircle className="h-3 w-3 mr-1" />
          Não Configurado
        </Badge>
      );
    }

    const plansCount = unidade.paytime_plans?.length || 0;
    if (plansCount === 0) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          Sem Planos
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {plansCount} Planos
      </Badge>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🏢 Unidades & Planos Rykon-Pay
          </h1>
          <p className="text-gray-600 mt-1">
            Configure estabelecimentos e planos comerciais para cada unidade
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Unidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUnidades.map((unidade) => (
            <Card key={unidade.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {unidade.nome}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      CNPJ: {unidade.cnpj}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {getStatusBadge(unidade)}
                </div>

                {unidade.paytime_establishment_id && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Establishment ID</p>
                    <Badge className="bg-blue-600">
                      {unidade.paytime_establishment_id}
                    </Badge>
                  </div>
                )}

                <Button
                  onClick={() => handleOpenModal(unidade)}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configurar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal de Configuração */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar {selectedUnidade?.nome}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Selecionar Establishment */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  🏢 Estabelecimento Rykon-Pay
                </label>
                <Select
                  value={selectedEstablishment}
                  onValueChange={setSelectedEstablishment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {establishments
                      .filter((e) => e.status === "APPROVED")
                      .map((establishment) => (
                        <SelectItem
                          key={establishment.id}
                          value={establishment.id.toString()}
                        >
                          {establishment.first_name} - {establishment.document} (ID:{" "}
                          {establishment.id})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Apenas estabelecimentos APROVADOS são listados
                </p>
              </div>

              {/* Selecionar Planos */}
              {selectedEstablishment && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    💳 Planos Comerciais Rykon-Pay
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Selecione os planos comerciais para esta unidade
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border rounded-lg">
                    {availablePlans.map((plan) => {
                      const isSelected = isPlanSelected(plan.id);

                      return (
                        <div
                          key={plan.id}
                          className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                            isSelected
                              ? "border-green-500 bg-green-50"
                              : "border-gray-200 hover:border-blue-300"
                          }`}
                          onClick={() => handleTogglePlan(plan)}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleTogglePlan(plan)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                                <span className="font-semibold text-sm">
                                  {plan.name}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-blue-100 text-blue-700"
                                >
                                  {plan.type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-green-100 text-green-700"
                                >
                                  {plan.modality}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedPlans.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        ✅ {selectedPlans.length} planos selecionados:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPlans.map((plan) => (
                          <Badge key={plan.id} className="bg-green-600">
                            {plan.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
