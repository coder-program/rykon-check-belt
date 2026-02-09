"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  Zap,
  Search,
  CreditCard,
  Wallet,
  Filter,
  RefreshCcw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

interface Gateway {
  id: number;
  name: string;
  type: "ACQUIRER" | "BANKING";
  created_at: string;
  updated_at: string;
}

interface GatewaysResponse {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  data: Gateway[];
}

export default function GatewaysPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [lastPage, setLastPage] = useState(1);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Modal de detalhes
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("perPage", perPage.toString());

      // Filtro por tipo
      if (typeFilter !== "all") {
        const filters = { type: typeFilter };
        params.append("filters", JSON.stringify(filters));
      }
      // Busca
      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      // Ordenação padrão
      params.append(
        "sorters",
        JSON.stringify([{ column: "name", direction: "ASC" }])
      );

      const url = `${process.env.NEXT_PUBLIC_API_URL}/paytime/gateways?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao buscar gateways");
      }

      const data: GatewaysResponse = await response.json();

      setGateways(data.data);
      setTotal(data.total);
      setLastPage(data.lastPage);
    } catch (error: any) {
      console.error("❌ [GATEWAY] Erro:", error);
      toast.error(error.message || "Erro ao carregar gateways");
    } finally {
      setLoading(false);
    }
  };

  // Buscar sempre que page ou typeFilter mudarem
  React.useEffect(() => {
    fetchGateways();
  }, [page, typeFilter]);

  // Quando typeFilter muda, resetar para página 1
  React.useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  const handleSearch = () => {
    setPage(1);
    // Aguardar state update antes de buscar
    setTimeout(() => fetchGateways(), 50);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setPage(1);
  };

  const viewGatewayDetails = async (gatewayId: number) => {
    try {
      setLoadingDetails(true);
      setShowDetailsModal(true);
      
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/gateways/${gatewayId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao buscar detalhes do gateway");
      }

      const data = await response.json();
      console.log("📋 Detalhes do gateway:", data);
      setSelectedGateway(data);
    } catch (error: any) {
      console.error("❌ Erro ao buscar detalhes:", error);
      toast.error(error.message || "Erro ao carregar detalhes do gateway");
      setShowDetailsModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const getGatewayIcon = (type: string) => {
    switch (type) {
      case "ACQUIRER":
        return <CreditCard className="h-5 w-5" />;
      case "BANKING":
        return <Wallet className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getGatewayColor = (type: string) => {
    switch (type) {
      case "ACQUIRER":
        return "text-blue-600 bg-blue-50";
      case "BANKING":
        return "text-emerald-600 bg-emerald-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getGatewayDescription = (name: string) => {
    switch (name) {
      case "PAYTIME":
        return "SubPaytime - Plataforma de subadquirência com split de pagamentos";
      case "PAGSEGURO":
        return "Integração com PagSeguro para processamento de pagamentos";
      case "CELCOIN":
        return "Banking Paytime - Serviços bancários, transferências e P2P";
      default:
        return "Gateway de pagamento";
    }
  };

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/sistema")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-8 w-8 text-orange-600" />
                Gateways
              </h1>
              <p className="text-gray-600 mt-1">
                Provedores de pagamento e serviços bancários disponíveis
              </p>
            </div>

            <Button onClick={fetchGateways} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Informações sobre gateways */}
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Sobre os Gateways
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-orange-800">
            <div>
              <strong className="font-semibold">ACQUIRER (Adquirentes):</strong>
              <ul className="mt-1 ml-6 list-disc space-y-1">
                <li>
                  <strong>PAYTIME (ID: 4)</strong> - SubPaytime para split de
                  pagamentos e marketplace
                </li>
                <li>
                  <strong>PAGSEGURO (ID: 2)</strong> - Processamento com
                  PagSeguro
                </li>
              </ul>
            </div>
            <div>
              <strong className="font-semibold">
                BANKING (Serviços Bancários):
              </strong>
              <ul className="mt-1 ml-6 list-disc space-y-1">
                <li>
                  <strong>CELCOIN (ID: 6)</strong> - Banking Paytime para
                  transferências, saques e P2P
                </li>
              </ul>
            </div>
            <p className="text-xs italic mt-2">
              💡 Use o ID do gateway ao ativar serviços para estabelecimentos
              via API
            </p>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Busca */}
              <div className="md:col-span-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Filtro por Tipo */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Gateway" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="ACQUIRER">
                    🏦 ACQUIRER (Adquirentes)
                  </SelectItem>
                  <SelectItem value="BANKING">
                    💰 BANKING (Bancários)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botão Limpar */}
            {(searchTerm || typeFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="mt-4"
              >
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Lista de Gateways */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Gateways Disponíveis ({total})
              </CardTitle>
              <span className="text-sm text-gray-500">
                Página {page} de {lastPage}
              </span>
            </div>
            <CardDescription>
              Todos os provedores disponíveis na plataforma Paytime
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              </div>
            ) : gateways.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Zap className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Nenhum gateway encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gateways.map((gateway) => (
                  <div
                    key={gateway.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* Ícone e Badge */}
                        <div
                          className={`p-3 rounded-lg ${getGatewayColor(gateway.type)}`}
                        >
                          {getGatewayIcon(gateway.type)}
                        </div>

                        {/* Informações */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              {gateway.name}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded ${getGatewayColor(gateway.type)}`}
                            >
                              {gateway.type}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            {getGatewayDescription(gateway.name)}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>ID: {gateway.id}</span>
                            <span>•</span>
                            <span>
                              Criado:{" "}
                              {new Date(gateway.created_at).toLocaleDateString(
                                "pt-BR"
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewGatewayDetails(gateway.id)}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Paginação */}
            {!loading && gateways.length > 0 && lastPage > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <span className="text-sm text-gray-600">
                  Página {page} de {lastPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === lastPage}
                >
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedGateway && getGatewayIcon(selectedGateway.type)}
                Detalhes do Gateway
              </DialogTitle>
              <DialogDescription>
                Informações completas do provedor de pagamento
              </DialogDescription>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              </div>
            ) : selectedGateway ? (
              <div className="space-y-6">
                {/* Informações Principais */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${getGatewayColor(selectedGateway.type)}`}>
                      {getGatewayIcon(selectedGateway.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {selectedGateway.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getGatewayColor(selectedGateway.type)}`}>
                          {selectedGateway.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {getGatewayDescription(selectedGateway.name)}
                      </p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">ID:</span>
                          <span className="ml-2 font-semibold text-gray-900">
                            {selectedGateway.id}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className="ml-2 font-semibold text-green-600">
                            Ativo
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Data de Criação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">
                        {new Date(selectedGateway.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">
                        Última Atualização
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold">
                        {new Date(selectedGateway.updated_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Informações Técnicas */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-blue-900">
                      Informações Técnicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <strong className="font-semibold text-blue-900">Tipo de Gateway:</strong>
                      <p className="text-blue-800 mt-1">
                        {selectedGateway.type === "ACQUIRER" 
                          ? "🏦 ACQUIRER - Adquirente para processamento de pagamentos com cartão de crédito/débito"
                          : "💰 BANKING - Serviços bancários para transferências, saques e PIX"}
                      </p>
                    </div>

                    {selectedGateway.name === "PAYTIME" && (
                      <div>
                        <strong className="font-semibold text-blue-900">Funcionalidades:</strong>
                        <ul className="mt-1 ml-6 list-disc space-y-1 text-blue-800">
                          <li>Split de pagamentos automático</li>
                          <li>Marketplace com múltiplos vendedores</li>
                          <li>Gestão de repasses (liquidações)</li>
                          <li>Suporte a PIX, cartão e boleto</li>
                        </ul>
                      </div>
                    )}

                    {selectedGateway.name === "PAGSEGURO" && (
                      <div>
                        <strong className="font-semibold text-blue-900">Funcionalidades:</strong>
                        <ul className="mt-1 ml-6 list-disc space-y-1 text-blue-800">
                          <li>Processamento de cartões de crédito/débito</li>
                          <li>Boleto bancário</li>
                          <li>Transferência online (PIX via PagSeguro)</li>
                          <li>Antifraude incluído</li>
                        </ul>
                      </div>
                    )}

                    {selectedGateway.name === "CELCOIN" && (
                      <div>
                        <strong className="font-semibold text-blue-900">Funcionalidades:</strong>
                        <ul className="mt-1 ml-6 list-disc space-y-1 text-blue-800">
                          <li>Transferências bancárias (TED/DOC)</li>
                          <li>PIX - Pagamentos instantâneos</li>
                          <li>Saques para contas bancárias</li>
                          <li>Peer-to-peer (P2P)</li>
                          <li>Consulta de saldos</li>
                        </ul>
                      </div>
                    )}

                    <div className="pt-2 border-t border-blue-200">
                      <p className="text-xs italic text-blue-700">
                        💡 Use o ID <b>{selectedGateway.id}</b> ao ativar este gateway para estabelecimentos via API
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Ações */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Erro ao carregar detalhes
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
