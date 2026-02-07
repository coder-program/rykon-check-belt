"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Store,
  Globe,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Building2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  PaytimePlan,
  PLAN_TYPE_LABELS,
  PLAN_MODALITY_LABELS,
  PLAN_MODALITY_COLORS,
  GATEWAY_NAMES,
} from "@/types/paytime";

interface Unidade {
  id: string;
  nome: string;
  paytime_establishment_id: number | null;
}

interface EstablishmentWithPlans {
  establishment_id: number;
  unidade_nome: string;
  plans: Array<{ id: number; active: boolean }>;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PaytimePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [lastPage, setLastPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [gatewayFilter, setGatewayFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  
  // Estabelecimentos com planos associados
  const [establishmentsWithPlans, setEstablishmentsWithPlans] = useState<EstablishmentWithPlans[]>([]);
  
  // Modal de associação
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaytimePlan | null>(null);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string>("");
  const [referenceId, setReferenceId] = useState("");
  const [statementDescriptor, setStatementDescriptor] = useState("");
  const [associating, setAssociating] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        sorters: JSON.stringify([{ column: "name", direction: "ASC" }]),
      });

      // Construir filtros
      const filters: any = {};

      if (gatewayFilter !== "all") {
        filters.gateway_id = gatewayFilter;
      }

      if (typeFilter !== "all") {
        filters.type = typeFilter;
       
      }

      if (modalityFilter !== "all") {
        filters.modality = modalityFilter;
      }

      if (activeFilter !== "all") {
        filters.active = activeFilter === "true";
      
      }

      if (Object.keys(filters).length > 0) {
        params.append("filters", JSON.stringify(filters));
      }

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      const paramsString = params.toString();
      const url = `${process.env.NEXT_PUBLIC_API_URL}/paytime/plans?${paramsString}`;
      const token = localStorage.getItem("token");

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar planos: ${response.statusText}`);
      }

      const data = await response.json();

      setPlans(data.data || []);
      setTotal(data.total || 0);
      setLastPage(data.lastPage || 1);
    } catch (error) {
      console.error("❌ [PLANS] Erro ao carregar planos:", error);
      toast.error("Erro ao carregar planos comerciais");
      setPlans([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchEstablishmentsWithPlans();
  }, [page, gatewayFilter, typeFilter, modalityFilter, activeFilter]);

  useEffect(() => {
    setPage(1);
  }, [gatewayFilter, typeFilter, modalityFilter, activeFilter]);

  // Carregar unidades quando abrir o modal
  useEffect(() => {
    if (showAssociateModal) {
      fetchUnidades();
    }
  }, [showAssociateModal]);

  const fetchUnidades = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Erro ao carregar unidades");

      const data = await response.json();
      // O endpoint retorna { items, page, pageSize, total, hasNextPage }
      const unidadesList = data.items || data;
      
      // Filtrar apenas unidades com establishment_id
      const unidadesComEstabelecimento = Array.isArray(unidadesList)
        ? unidadesList.filter(
            (u: Unidade) => u.paytime_establishment_id
          )
        : [];
      
      setUnidades(unidadesComEstabelecimento);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
      toast.error("Erro ao carregar unidades");
    }
  };

  const fetchEstablishmentsWithPlans = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Buscar unidades com establishment_id
      const unidadesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!unidadesResponse.ok) return;

      const unidadesData = await unidadesResponse.json();
      const unidadesList = unidadesData.items || unidadesData;
      
      if (!Array.isArray(unidadesList)) return;

      const unidadesComEstabelecimento = unidadesList.filter(
        (u: Unidade) => u.paytime_establishment_id
      );

      console.log("🔍 Unidades com establishment:", unidadesComEstabelecimento);

      // Para cada unidade, buscar os gateways ativos
      const establishmentsData: EstablishmentWithPlans[] = [];

      for (const unidade of unidadesComEstabelecimento) {
        try {
          const gatewaysResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${unidade.paytime_establishment_id}/gateways`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (gatewaysResponse.ok) {
            const gatewaysData = await gatewaysResponse.json();
            
            console.log(`📡 Gateways da unidade ${unidade.nome}:`, gatewaysData);
            
            // Procurar gateway SubPaytime (ID 4) com planos
            const subPaytimeGateway = gatewaysData.data?.find(
              (g: any) => g.gateway?.id === 4
            );

            console.log(`🔌 Gateway SubPaytime da ${unidade.nome}:`, subPaytimeGateway);

            if (subPaytimeGateway?.plans && subPaytimeGateway.plans.length > 0) {
              establishmentsData.push({
                establishment_id: unidade.paytime_establishment_id!,
                unidade_nome: unidade.nome,
                plans: subPaytimeGateway.plans,
              });
            }
          }
        } catch (error) {
          console.error(`Erro ao buscar gateways da unidade ${unidade.nome}:`, error);
        }
      }

      console.log("✅ Establishments com planos:", establishmentsData);
      setEstablishmentsWithPlans(establishmentsData);
    } catch (error) {
      console.error("Erro ao carregar estabelecimentos com planos:", error);
    }
  };

  const handleOpenAssociateModal = (plan: PaytimePlan) => {
    setSelectedPlan(plan);
    setShowAssociateModal(true);
    setSelectedUnidadeId("");
    setReferenceId("");
    setStatementDescriptor("");
  };

  const handleUnidadeChange = (unidadeId: string) => {
    setSelectedUnidadeId(unidadeId);
    
    const unidade = unidades.find((u) => u.id === unidadeId);
    if (unidade) {
      // Preencher apenas o Reference ID com nome da unidade formatado
      const refId = unidade.nome
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
      setReferenceId(refId);
    }
  };

  const handleCloseAssociateModal = () => {
    setShowAssociateModal(false);
    setSelectedPlan(null);
    setSelectedUnidadeId("");
    setReferenceId("");
    setStatementDescriptor("");
  };

  const handleAssociatePlan = async () => {
    if (!selectedPlan || !selectedUnidadeId) {
      toast.error("Selecione uma unidade");
      return;
    }

    if (!referenceId.trim()) {
      toast.error("Informe o Reference ID");
      return;
    }

    if (!statementDescriptor.trim()) {
      toast.error("Informe o Statement Descriptor");
      return;
    }

    try {
      setAssociating(true);
      const token = localStorage.getItem("token");
      
      const unidade = unidades.find((u) => u.id === selectedUnidadeId);
      if (!unidade?.paytime_establishment_id) {
        toast.error("Unidade sem establishment ID");
        return;
      }

      const establishmentId = unidade.paytime_establishment_id;

      // 1. Verificar gateways existentes
      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let bankingExists = false;
      let gateway4Exists = false;

      if (checkResponse.ok) {
        const existingGateways = await checkResponse.json();
        bankingExists = existingGateways.data?.some(
          (g: any) => g.gateway?.id === 6
        );
        gateway4Exists = existingGateways.data?.some(
          (g: any) => g.gateway?.id === 4
        );

        if (gateway4Exists) {
          toast.error("Gateway SubPaytime (ID 4) já está associado a este estabelecimento");
          return;
        }
      }

      // 2. Ativar Banking (ID 6) se não existir
      if (!bankingExists) {
        toast.loading("Ativando Gateway Banking...", { id: "banking" });
        
        const bankingBody = {
          reference_id: `${referenceId.trim()}-BANKING`,
          gateway_id: 6,
          active: true,
          form_receipt: "PAYTIME",
        };

        const bankingResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bankingBody),
          }
        );

        if (!bankingResponse.ok) {
          const errorData = await bankingResponse.json().catch(() => null);
          toast.dismiss("banking");
          throw new Error(errorData?.message || "Erro ao ativar Gateway Banking");
        }

        toast.success("Gateway Banking ativado!", { id: "banking" });
      }

      // 3. Ativar SubPaytime (ID 4) com o plano
      toast.loading("Associando plano ao estabelecimento...", { id: "plan" });
      
      const body = {
        reference_id: referenceId.trim(),
        gateway_id: 4,
        active: true,
        form_receipt: "PAYTIME",
        statement_descriptor: statementDescriptor.trim(),
        plans: [
          {
            id: selectedPlan.id,
            active: true,
          },
        ],
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${establishmentId}/gateways`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        toast.dismiss("plan");
        throw new Error(errorData?.message || "Erro ao associar plano");
      }

      toast.success("Plano associado com sucesso!", { id: "plan" });
      handleCloseAssociateModal();
      
      // Recarregar dados para atualizar os cards
      fetchEstablishmentsWithPlans();
    } catch (error: any) {
      console.error("Erro ao associar plano:", error);
      toast.error(error.message || "Erro ao associar plano");
    } finally {
      setAssociating(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchPlans();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setGatewayFilter("all");
    setTypeFilter("all");
    setModalityFilter("all");
    setActiveFilter("all");
    setPage(1);
  };

  const hasActiveFilters =
    searchTerm !== "" ||
    gatewayFilter !== "all" ||
    typeFilter !== "all" ||
    modalityFilter !== "all" ||
    activeFilter !== "all";

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case "ONLINE":
        return <Laptop className="h-4 w-4" />;
      case "PRESENCIAL":
        return <Store className="h-4 w-4" />;
      case "AMBOS":
        return <Globe className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              💳 Planos Comerciais
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie os planos comerciais disponíveis na plataforma Paytime
            </p>
          </div>
        </div>

        {/* Filtros e Busca */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Linha 1: Busca */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, tipo ou modalidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>

            {/* Linha 2: Filtros */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Filtro Gateway */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Gateway
                </label>
                <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Gateways</SelectItem>
                    <SelectItem value="2">PagSeguro</SelectItem>
                    <SelectItem value="4">SubPaytime</SelectItem>
                    <SelectItem value="6">Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="COMMERCIAL">Comercial</SelectItem>
                    <SelectItem value="CUSTOM">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Modalidade */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Modalidade
                </label>
                <Select
                  value={modalityFilter}
                  onValueChange={setModalityFilter}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Modalidades</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                    <SelectItem value="AMBOS">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="true">Ativos</SelectItem>
                    <SelectItem value="false">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botão Limpar Filtros */}
            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Contador de Resultados */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando {plans.length} de {total} plano(s)
          </span>
          <span>
            Página {page} de {lastPage}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {/* Grid de Planos */}
        {!loading && plans.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
              const modalityColor = PLAN_MODALITY_COLORS[plan.modality] || {
                bg: "bg-gray-50",
                text: "text-gray-700",
              };

              // Verificar quais unidades têm este plano
              const unidadesComPlano = establishmentsWithPlans.filter((est) =>
                est.plans.some((p) => p.id === plan.id && p.active)
              );

              return (
                <Card
                  key={plan.id}
                  className="overflow-hidden transition-all hover:shadow-lg"
                >
                  <div className="p-6">
                    {/* Header do Card */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {plan.name}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            ID: {plan.id}
                          </p>
                        </div>
                      </div>
                      {plan.active ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {/* Descrição */}
                    {plan.description && (
                      <p className="mb-4 text-sm text-gray-600 line-clamp-2">
                        {plan.description}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {/* Gateway */}
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                        {GATEWAY_NAMES[plan.gateway_id] || `Gateway ${plan.gateway_id}`}
                      </span>

                      {/* Tipo */}
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {PLAN_TYPE_LABELS[plan.type] || plan.type}
                      </span>

                      {/* Modalidade */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${modalityColor.bg} ${modalityColor.text}`}
                      >
                        {getModalityIcon(plan.modality)}
                        {PLAN_MODALITY_LABELS[plan.modality] || plan.modality}
                      </span>

                      {/* Antecipação */}
                      {plan.allow_anticipation && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          ⚡ Permite Antecipação
                        </span>
                      )}
                    </div>

                    {/* Detalhes */}
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Status:</span>
                        <span
                          className={`font-medium ${
                            plan.active ? "text-green-600" : "text-gray-400"
                          }`}
                        >
                          {plan.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Antecipação:</span>
                        <span className="font-medium text-gray-700">
                          {plan.allow_anticipation ? "Sim" : "Não"}
                        </span>
                      </div>

                      {plan.categories && plan.categories.length > 0 && (
                        <div className="flex items-start justify-between text-sm">
                          <span className="text-gray-500">Categorias:</span>
                          <span className="text-right font-medium text-gray-700">
                            {plan.categories.length} categoria(s)
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Criado:</span>
                        <span>
                          {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Atualizado:</span>
                        <span>
                          {new Date(plan.updated_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Unidades Associadas */}
                    {unidadesComPlano.length > 0 && (
                      <div className="mt-4 rounded-lg bg-green-50 p-3 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-900">
                            Plano Associado
                          </span>
                        </div>
                        <div className="space-y-1">
                          {unidadesComPlano.map((est) => (
                            <div
                              key={est.establishment_id}
                              className="text-xs text-green-700 flex items-center gap-1"
                            >
                              <Building2 className="h-3 w-3" />
                              {est.unidade_nome}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botão de Associar */}
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={() => handleOpenAssociateModal(plan)}
                        className="w-full"
                        variant="outline"
                        size="sm"
                      >
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Associar ao Estabelecimento
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Sem Resultados */}
        {!loading && plans.length === 0 && (
          <Card className="p-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Nenhum plano encontrado
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {hasActiveFilters
                ? "Tente ajustar os filtros ou buscar por outros termos"
                : "Não há planos comerciais disponíveis no momento"}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="mt-4"
              >
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros
              </Button>
            )}
          </Card>
        )}

        {/* Paginação */}
        {!loading && plans.length > 0 && lastPage > 1 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <span className="text-sm text-gray-600">
                Página {page} de {lastPage}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Modal de Associação */}
        {showAssociateModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-lg mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Associar Plano ao Estabelecimento
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedPlan.name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseAssociateModal}
                    disabled={associating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Selecionar Unidade */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Unidade / Estabelecimento *
                    </label>
                    <Select
                      value={selectedUnidadeId}
                      onValueChange={handleUnidadeChange}
                      disabled={associating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidades.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500">
                            Nenhuma unidade com estabelecimento cadastrado
                          </div>
                        ) : (
                          unidades.map((unidade) => (
                            <SelectItem key={unidade.id} value={unidade.id}>
                              {unidade.nome} (ID: {unidade.paytime_establishment_id})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reference ID */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Reference ID *
                    </label>
                    <Input
                      value={referenceId}
                      onChange={(e) => setReferenceId(e.target.value)}
                      placeholder="Ex: UNIDADE-SP-01 ou CONFIG-001"
                      disabled={associating}
                    />
                    <p className="text-xs text-gray-500">
                      <strong>Preenchido automaticamente com o nome da unidade.</strong> Você pode editar se necessário. Use para identificar esta configuração internamente.
                    </p>
                  </div>

                  {/* Statement Descriptor */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Statement Descriptor *
                    </label>
                    <Input
                      value={statementDescriptor}
                      onChange={(e) => setStatementDescriptor(e.target.value.toUpperCase())}
                      placeholder="Ex: TEAMCRUZ ACADEMIA ou RYKON SPORTS"
                      maxLength={22}
                      disabled={associating}
                    />
                    <p className="text-xs text-gray-500">
                      <strong>Nome que aparece na fatura do cartão do cliente.</strong> Use o nome da sua empresa/marca. Máximo 22 caracteres. Evite caracteres especiais.
                    </p>
                  </div>

                  {/* Informações do Plano */}
                  <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                    <h4 className="text-sm font-medium text-blue-900">
                      Informações do Plano
                    </h4>
                    <div className="space-y-1 text-xs text-blue-700">
                      <div className="flex justify-between">
                        <span>Gateway:</span>
                        <span className="font-medium">
                          SubPaytime (ID: 4)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Plano ID:</span>
                        <span className="font-medium">{selectedPlan.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Modalidade:</span>
                        <span className="font-medium">
                          {PLAN_MODALITY_LABELS[selectedPlan.modality]}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Antecipação:</span>
                        <span className="font-medium">
                          {selectedPlan.allow_anticipation ? "Sim" : "Não"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleCloseAssociateModal}
                      disabled={associating}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAssociatePlan}
                      disabled={
                        associating ||
                        !selectedUnidadeId ||
                        !referenceId.trim() ||
                        !statementDescriptor.trim()
                      }
                      className="flex-1"
                    >
                      {associating ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Associando...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Associar Plano
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
