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
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Unidade {
  id: string;
  nome: string;
  cnpj: string;
  paytime_establishment_id: string | number | null;
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

  // Helper para mapear gateway_id para nome
  const getGatewayName = (gateway_id: number): string => {
    const gateways: Record<number, string> = {
      4: "PAYTIME",
      5: "PAGSEGURO", 
      6: "CELCOIN",
    };
    return gateways[gateway_id] || `Gateway ${gateway_id}`;
  };

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

      console.log("🔄 Carregando dados de unidades e planos...");

      // Buscar todas as unidades (já vem com paytime_plans do banco de dados)
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
      
      console.log("📋 Unidades carregadas:", unidadesList.length);
      
      // Deduplica planos que podem estar duplicados no banco
      const unidadesComPlanosLimpos = unidadesList.map((u: Unidade) => {
        if (u.paytime_plans && u.paytime_plans.length > 0) {
          const uniquePlans = Array.from(
            new Map(u.paytime_plans.map(p => [p.id, p])).values()
          );
          
          if (uniquePlans.length !== u.paytime_plans.length) {
            console.warn(`⚠️ Planos duplicados encontrados em ${u.nome}: ${u.paytime_plans.length} → ${uniquePlans.length}`);
          }
          
          console.log(`💳 Planos para ${u.nome}:`, uniquePlans);
          
          return { ...u, paytime_plans: uniquePlans };
        }
        return u;
      });
      
      setUnidades(unidadesComPlanosLimpos);
      setFilteredUnidades(unidadesComPlanosLimpos);

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
        console.log("🏢 Establishments carregados:", establishmentsData.data?.length || 0);
        console.log("🏢 Detalhes dos establishments:", establishmentsData.data?.map((e: PaytimeEstablishment) => ({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
          document: e.document,
          status: e.status
        })));
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
        console.log("💳 Planos disponíveis:", plansData.data?.length || 0);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (unidade: Unidade) => {
    console.log("🔍 Abrindo modal para unidade:", unidade.nome);
    console.log("📌 Establishment ID da unidade:", unidade.paytime_establishment_id);
    console.log("📋 Establishments disponíveis:", establishments);
    console.log("📌 Planos da unidade (antes dedup):", unidade.paytime_plans);
    
    // Deduplicação dos planos (caso venham duplicados do banco)
    const uniquePlans = unidade.paytime_plans 
      ? Array.from(new Map(unidade.paytime_plans.map(p => [p.id, p])).values())
      : [];
    
    console.log("✅ Planos após dedup:", uniquePlans);
    
    setSelectedUnidade(unidade);
    setSelectedEstablishment(unidade.paytime_establishment_id?.toString() || "");
    setSelectedPlans(uniquePlans);
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

  // Helper para obter texto do establishment selecionado
  const getSelectedEstablishmentText = () => {
    if (!selectedEstablishment) return null;
    
    const est = establishments.find(e => e.id.toString() === selectedEstablishment.toString());
    
    if (est) {
      const firstName = est.first_name?.trim() || '';
      const lastName = est.last_name?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const document = est.document?.trim() || '';
      
      // Se tem nome e CNPJ
      if (fullName && document) {
        return `${fullName} - CNPJ: ${document}`;
      }
      // Se tem apenas nome
      if (fullName) {
        return `${fullName} (ID: ${est.id})`;
      }
      // Se tem apenas CNPJ
      if (document) {
        return `CNPJ: ${document} (ID: ${est.id})`;
      }
      // Se não tem nada
      return `Estabelecimento #${est.id}`;
    }
    
    return `Establishment ID: ${selectedEstablishment}`;
  };

  const handleSave = async () => {
    if (!selectedUnidade) return;

    try {
      setSaving(true);
      const token = localStorage.getItem("token");

      // 1. Atualizar establishment_id na unidade
      const updateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades/${selectedUnidade.id}`,
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
      
      if (!updateResponse.ok) {
        throw new Error(`Erro ao atualizar unidade: ${updateResponse.status}`);
      }

      // 2. Atualizar planos selecionados (com deduplicação)
      if (selectedEstablishment) {
        // Deduplica os planos antes de salvar
        const uniquePlans = Array.from(
          new Map(selectedPlans.map(p => [p.id, p])).values()
        );
        
        console.log("💾 Salvando planos:", uniquePlans);
        
        const plansResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/paytime/unidades/${selectedUnidade.id}/plans`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ plans: uniquePlans }),
          }
        );
        
        if (!plansResponse.ok) {
          throw new Error(`Erro ao atualizar planos: ${plansResponse.status}`);
        }
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

  const limparDuplicatasTodasUnidades = async () => {
    try {
      const token = localStorage.getItem("token");
      let count = 0;

      for (const unidade of unidades) {
        if (unidade.paytime_plans && unidade.paytime_plans.length > 0) {
          const uniquePlans = Array.from(
            new Map(unidade.paytime_plans.map(p => [p.id, p])).values()
          );

          if (uniquePlans.length !== unidade.paytime_plans.length) {
            console.log(`🧹 Limpando duplicatas de ${unidade.nome}`);
            
            await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/paytime/unidades/${unidade.id}/plans`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ plans: uniquePlans }),
              }
            );
            
            count++;
          }
        }
      }

      if (count > 0) {
        toast.success(`✅ Duplicatas removidas de ${count} unidade(s)!`);
        await carregarDados();
      } else {
        toast.success("✨ Nenhuma duplicata encontrada!");
      }
    } catch (error) {
      console.error("Erro ao limpar duplicatas:", error);
      toast.error("Erro ao limpar duplicatas");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🏢 Unidades & Planos Rykon-Pay
            </h1>
            <p className="text-gray-600 mt-1">
              Configure estabelecimentos e planos comerciais para cada unidade
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={limparDuplicatasTodasUnidades} 
              disabled={loading}
              variant="outline"
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Duplicatas
            </Button>
            <Button onClick={carregarDados} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Recarregar Dados
            </Button>
          </div>
        </div>

        {/* Banner Informativo */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Sobre esta Página
                </h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    Esta página mostra os <b>planos comerciais PayTime associados</b> a cada unidade. 
                    Os planos são salvos localmente quando você associa um plano na página <b>/admin/plans</b>.
                  </p>
                  
                  <div className="bg-white rounded-lg p-3 mt-3">
                    <p className="font-semibold mb-2">Como Associar Planos:</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li>Acesse a página <b>/admin/plans</b></li>
                      <li>Clique em &quot;Associar Plano&quot; no plano desejado</li>
                      <li>Selecione a unidade e configure os dados</li>
                      <li>O plano ficará salvo e aparecerá aqui automaticamente</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 mt-3">
                    <p className="font-semibold mb-2">Status Possíveis:</p>
                    <ul className="space-y-1 ml-4"
>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-gray-500" />
                        <span><b>Não Configurado</b> - Sem establishment_id vinculado</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span><b>Sem Planos</b> - Establishment configurado mas sem planos ativos</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span><b>N Planos</b> - Exibe quantos planos estão associados</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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

                {/* Mostrar planos associados */}
                {unidade.paytime_plans && unidade.paytime_plans.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Planos Associados</p>
                    <div className="space-y-1">
                      {unidade.paytime_plans.map((plan) => (
                        <div key={`unidade-${unidade.id}-plan-${plan.id}`} className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
                          <span className="text-xs text-gray-700">{plan.name}</span>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            ID: {plan.id}
                          </Badge>
                        </div>
                      ))}
                    </div>
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
              <div className="text-sm text-gray-600 mt-2">
                <div>CNPJ: <span className="font-semibold">{selectedUnidade?.cnpj}</span></div>
                {selectedUnidade?.paytime_establishment_id && (
                  <div>Establishment ID Atual: <span className="font-semibold">{selectedUnidade.paytime_establishment_id}</span></div>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Selecionar Establishment */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  🏢 Estabelecimento Rykon-Pay
                </label>
                
                {/* Aviso se establishment atual não está disponível */}
                {selectedUnidade?.paytime_establishment_id && 
                 !establishments.find(e => e.id.toString() === selectedUnidade.paytime_establishment_id?.toString() && e.status === "APPROVED") && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-semibold">Establishment atual não disponível</p>
                        <p className="text-xs mt-1">
                          O establishment ID {selectedUnidade.paytime_establishment_id} não está na lista de aprovados. 
                          Selecione outro ou verifique o status no PayTime.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <Select
                  value={selectedEstablishment}
                  onValueChange={setSelectedEstablishment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estabelecimento">
                      {selectedEstablishment ? (
                        <span className="block truncate text-gray-900">
                          {getSelectedEstablishmentText()}
                        </span>
                      ) : (
                        <span className="text-gray-500">Selecione um estabelecimento</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // Se o establishment atual não está em APPROVED, mostrar todos
                      const currentEstId = selectedUnidade?.paytime_establishment_id?.toString();
                      const isCurrentApproved = establishments.some(e => 
                        e.id.toString() === currentEstId && e.status === "APPROVED"
                      );
                      
                      const filteredEstablishments = isCurrentApproved || !currentEstId
                        ? establishments.filter(e => e.status === "APPROVED")
                        : establishments; // Mostra todos se o atual não é aprovado
                      
                      return filteredEstablishments.map((establishment) => (
                        <SelectItem
                          key={establishment.id}
                          value={establishment.id.toString()}
                        >
                          <div className="flex items-center justify-between gap-2 py-1">
                            <div className="flex flex-col flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                  {(() => {
                                    const firstName = establishment.first_name?.trim() || '';
                                    const lastName = establishment.last_name?.trim() || '';
                                    const fullName = `${firstName} ${lastName}`.trim();
                                    return fullName || `Estabelecimento #${establishment.id}`;
                                  })()}
                                </span>
                                {establishment.status !== "APPROVED" && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300"
                                  >
                                    {establishment.status}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-gray-600">
                                {establishment.document ? `CNPJ: ${establishment.document}` : 'Sem CNPJ'} • ID: {establishment.id}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedUnidade?.paytime_establishment_id && 
                   !establishments.find(e => e.id.toString() === selectedUnidade.paytime_establishment_id?.toString() && e.status === "APPROVED")
                    ? "Mostrando todos os estabelecimentos (incluindo não aprovados)"
                    : "Apenas estabelecimentos APROVADOS são listados"
                  }
                </p>
              </div>

              {/* Selecionar Planos */}
              {selectedEstablishment && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">
                      💳 Planos Comerciais Rykon-Pay
                    </label>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {availablePlans.length} {availablePlans.length === 1 ? 'plano disponível' : 'planos disponíveis'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Selecione os planos comerciais para esta unidade. Os planos marcados serão associados ao estabelecimento no PayTime.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-2 border rounded-lg">
                    {availablePlans.map((plan) => {
                      const isSelected = isPlanSelected(plan.id);

                      return (
                        <div
                          key={`plan-grid-${plan.id}`}
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
                              
                              <div className="text-xs text-gray-600 mb-2">
                                <div>Gateway: <span className="font-semibold">{getGatewayName(plan.gateway_id)}</span></div>
                                <div>ID do Plano: <span className="font-semibold">{plan.id}</span></div>
                              </div>
                              
                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-blue-100 text-blue-700"
                                >
                                  {plan.type === 'COMMERCIAL' ? '💼 Comercial' : plan.type}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-green-100 text-green-700"
                                >
                                  {plan.modality === 'ONLINE' ? '🌐 Online' : plan.modality === 'POS' ? '🏪 POS' : plan.modality}
                                </Badge>
                                {plan.active ? (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                    ✓ Ativo
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                    ✗ Inativo
                                  </Badge>
                                )}
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
                          <Badge key={`selected-plan-${plan.id}`} className="bg-green-600">
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
