"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  Search,
  MapPin,
  RefreshCw,
  Eye,
  Loader2,
  Edit,
  X,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
// import { paytimeService, type PaytimeEstablishment } from "@/lib/services/paytimeService";

interface Estabelecimento {
  id: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  status: string;
  tipo: string;
  risco: string;
  endereco_completo: string;
  cep: string;
  created_at: string;
  updated_at: string;
  paytime_data?: any;
}

export default function EstabelecimentosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEstabelecimento, setSelectedEstabelecimento] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    carregarEstabelecimentos();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1);
      carregarEstabelecimentos(1);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, statusFilter, tipoFilter]);

  const carregarEstabelecimentos = async (page: number = 1, showLoading: boolean = true) => {
    try {
      if (showLoading) setLoading(true);
      if (!showLoading) setIsRefreshing(true);
      
      // Preparar filtros
      const queryParams = new URLSearchParams();
      
      const filters: any = {};
      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }
      if (tipoFilter !== "all") {
        filters.type = tipoFilter;
      }
      
      if (Object.keys(filters).length > 0) {
        queryParams.append('filters', JSON.stringify(filters));
      }
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      queryParams.append('page', page.toString());
      queryParams.append('perPage', '20');
      queryParams.append('sorters', JSON.stringify([{ column: 'created_at', direction: 'desc' }]));

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erro ao carregar estabelecimentos: ${response.status}`);
      }

      const result = await response.json();
      setEstabelecimentos(result.data || []);
      
      // Verifica se __meta__ existe antes de acessar
      if (result.__meta__) {
        setCurrentPage(result.__meta__.current_page || 1);
        setTotalPages(result.__meta__.total_pages || 1);
        setTotal(result.__meta__.total || 0);
      } else {
        // Fallback se não houver metadados
        setCurrentPage(1);
        setTotalPages(1);
        setTotal(result.data?.length || 0);
      }
      
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar estabelecimentos do Paytime");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const verDetalhes = async (id: string) => {
    try {
      setLoadingDetails(true);
      setShowModal(true);
      
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Erro ao buscar detalhes");

      const data = await response.json();
      setSelectedEstabelecimento(data);
      setFormData({
        access_type: data.access_type || "ACQUIRER",
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone_number: data.phone_number || "",
        revenue: data.revenue || "",
        format: data.format || "",
        email: data.email || "",
        gmv: data.gmv || 0,
        birthdate: data.birthdate || "",
      });
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar detalhes");
      setShowModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoadingDetails(true);
      
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/paytime/establishments/${selectedEstabelecimento.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao atualizar");
      }

      toast.success("Estabelecimento atualizado com sucesso!");
      setEditMode(false);
      setShowModal(false);
      carregarEstabelecimentos(currentPage, false);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao atualizar estabelecimento");
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setSelectedEstabelecimento(null);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'default';
      case 'PENDING':
        return 'secondary';
      case 'RISK_ANALYSIS':
        return 'outline';
      case 'DISAPPROVED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDING': 'Pendente',
      'VALIDATION': 'Validação',
      'RISK_ANALYSIS': 'Análise de Risco',
      'APPROVED': 'Aprovado',
      'DISAPPROVED': 'Reprovado',
      'DISCREDITED': 'Descredenciado',
      'BACKGROUND_CHECK': 'Verificação'
    };
    return labels[status] || status;
  };

  const getTipoLabel = (tipo: string) => {
    return tipo === 'INDIVIDUAL' ? 'Pessoa Física' : 'Pessoa Jurídica';
  };

  const getRiscoColor = (risco: string) => {
    switch (risco) {
      case 'LOW': return 'text-green-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'HIGH': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <ProtectedRoute requiredPerfis={["ADMIN_SISTEMA"]}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/admin/sistema")}
            variant="outline"
            size="sm"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Estabelecimentos Paytime
              </h1>
              <p className="text-gray-600">
                Consulte todos os estabelecimentos integrados com Paytime
              </p>
            </div>
            <Button
              onClick={() => router.push("/admin/estabelecimentos/novo")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Estabelecimento
            </Button>
          </div>
        </div>

        {/* Search e Filtros */}
        <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Buscar por nome, CNPJ, email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="APPROVED">Aprovado</SelectItem>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="RISK_ANALYSIS">Análise de Risco</SelectItem>
                      <SelectItem value="DISAPPROVED">Reprovado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select value={tipoFilter} onValueChange={setTipoFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="INDIVIDUAL">Pessoa Física</SelectItem>
                      <SelectItem value="BUSINESS">Pessoa Jurídica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <p className="text-sm text-gray-600">
                  {total > 0 && (
                    <>Mostrando página {currentPage} de {totalPages} ({total} registros)</>  
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => carregarEstabelecimentos(currentPage, false)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Estabelecimentos */}
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="flex flex-col items-center">
                  <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-600">Carregando estabelecimentos...</p>
                </div>
              </CardContent>
            </Card>
          ) : estabelecimentos.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">
                  {searchTerm || statusFilter !== "all" || tipoFilter !== "all"
                    ? "Nenhum estabelecimento encontrado com os filtros aplicados"
                    : "Nenhum estabelecimento encontrado"}
                </p>
                {!(searchTerm || statusFilter !== "all" || tipoFilter !== "all") && (
                  <Button
                    onClick={() => carregarEstabelecimentos()}
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar Novamente
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {estabelecimentos.map((estabelecimento) => (
                <Card
                  key={estabelecimento.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {estabelecimento.nome}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {estabelecimento.cidade}/{estabelecimento.estado}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge variant={getStatusBadgeVariant(estabelecimento.status)}>
                          {getStatusLabel(estabelecimento.status)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {getTipoLabel(estabelecimento.tipo)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm mb-4">
                      <p className="text-gray-600">
                        <span className="font-medium">Documento:</span>{" "}
                        {estabelecimento.cnpj}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Email:</span>{" "}
                        {estabelecimento.email}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Telefone:</span>{" "}
                        {estabelecimento.telefone}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Risco:</span>{" "}
                        <span className={getRiscoColor(estabelecimento.risco)}>
                          {estabelecimento.risco}
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => verDetalhes(estabelecimento.id)}
                      >
                        <Eye className="w-3 h-3 mr-2" />
                        Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Paginação */}
          {!loading && totalPages > 1 && (
            <Card className="mt-6">
              <CardContent className="py-4">
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage(currentPage - 1);
                      carregarEstabelecimentos(currentPage - 1);
                    }}
                  >
                    Anterior
                  </Button>
                  
                  <span className="flex items-center px-4 text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage(currentPage + 1);
                      carregarEstabelecimentos(currentPage + 1);
                    }}
                  >
                    Próxima
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          {!loading && estabelecimentos.length > 0 && (
            <Card>
              <CardContent className="py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {total}
                    </p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {estabelecimentos.filter((e) => e.status === 'APPROVED').length}
                    </p>
                    <p className="text-sm text-gray-600">Aprovados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {estabelecimentos.filter((e) => e.status === 'PENDING').length}
                    </p>
                    <p className="text-sm text-gray-600">Pendentes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {estabelecimentos.filter((e) => e.tipo === 'BUSINESS').length}
                    </p>
                    <p className="text-sm text-gray-600">Empresas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modal de Detalhes/Edição */}
          {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    {editMode ? "Editar Estabelecimento" : "Detalhes do Estabelecimento"}
                  </CardTitle>
                  <CardDescription>
                    ID: {selectedEstabelecimento?.id}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={closeModal}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingDetails ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : selectedEstabelecimento ? (
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <Badge variant={getStatusBadgeVariant(selectedEstabelecimento.status)}>
                        {getStatusLabel(selectedEstabelecimento.status)}
                      </Badge>
                      <Badge variant="outline">
                        {getTipoLabel(selectedEstabelecimento.type)}
                      </Badge>
                      <Badge variant="outline">
                        Risco: {selectedEstabelecimento.risk}
                      </Badge>
                    </div>

                    {editMode ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Tipo de Acesso *</label>
                            <Select
                              value={formData.access_type}
                              onValueChange={(value) => setFormData({...formData, access_type: value})}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACQUIRER">Adquirência</SelectItem>
                                <SelectItem value="BANKING">Bancário</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Formato *</label>
                            <Select
                              value={formData.format}
                              onValueChange={(value) => setFormData({...formData, format: value})}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LTDA">LTDA</SelectItem>
                                <SelectItem value="SA">SA</SelectItem>
                                <SelectItem value="ME">ME</SelectItem>
                                <SelectItem value="MEI">MEI</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Nome/Razão Social *</label>
                            <Input
                              value={formData.first_name}
                              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Email *</label>
                            <Input
                              type="email"
                              value={formData.email}
                              onChange={(e) => setFormData({...formData, email: e.target.value})}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Telefone *</label>
                            <Input
                              value={formData.phone_number}
                              onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Receita *</label>
                            <Input
                              value={formData.revenue}
                              onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">GMV</label>
                            <Input
                              type="number"
                              value={formData.gmv}
                              onChange={(e) => setFormData({...formData, gmv: parseInt(e.target.value)})}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button onClick={handleUpdate} disabled={loadingDetails}>
                            {loadingDetails ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
                          </Button>
                          <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2">Informações Básicas</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <p><span className="text-gray-600">Nome:</span> {selectedEstabelecimento.first_name}</p>
                            <p><span className="text-gray-600">Documento:</span> {selectedEstabelecimento.document}</p>
                            <p><span className="text-gray-600">Email:</span> {selectedEstabelecimento.email}</p>
                            <p><span className="text-gray-600">Telefone:</span> {selectedEstabelecimento.phone_number}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Endereço</h3>
                          <p className="text-sm">{selectedEstabelecimento.address?.street}, {selectedEstabelecimento.address?.number} - {selectedEstabelecimento.address?.neighborhood}</p>
                          <p className="text-sm">{selectedEstabelecimento.address?.city}/{selectedEstabelecimento.address?.state} - CEP: {selectedEstabelecimento.address?.zip_code}</p>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button onClick={() => setEditMode(true)}>
                            <Edit className="w-4 h-4 mr-2" />Editar
                          </Button>
                          <Button variant="outline" onClick={closeModal}>Fechar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
