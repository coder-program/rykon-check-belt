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
  Link as LinkIcon,
  Unlink,
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
  
  // Estados para gerenciar vínculos com unidades
  const [vinculatedUnidades, setVinculatedUnidades] = useState<any[]>([]);
  const [availableUnidades, setAvailableUnidades] = useState<any[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(false);
  const [selectedUnidadeToLink, setSelectedUnidadeToLink] = useState<string>("");
  const [searchUnidade, setSearchUnidade] = useState<string>("");

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

      // Carregar unidades vinculadas e disponíveis
      await Promise.all([
        carregarUnidadesVinculadas(id),
        carregarUnidades(),
      ]);
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
    setVinculatedUnidades([]);
    setAvailableUnidades([]);
    setSelectedUnidadeToLink("");
  };

  // Funções para gerenciar vínculos com unidades
  const carregarUnidades = async () => {
    try {
      setLoadingUnidades(true);
      console.log('🔍 Carregando lista de unidades...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/unidades`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error("Erro ao carregar unidades");

      const data = await response.json();
      console.log(`✅ Resposta da API:`, data);
      // Se for objeto paginado, pegar o array items
      const unidadesArray = Array.isArray(data) ? data : (data.items || []);
      console.log(`✅ ${unidadesArray.length} unidades carregadas:`, unidadesArray);
      setAvailableUnidades(unidadesArray);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar unidades");
      setAvailableUnidades([]);
    } finally {
      setLoadingUnidades(false);
    }
  };

  const carregarUnidadesVinculadas = async (establishmentId: string) => {
    try {
      setLoadingUnidades(true);
      console.log(`🔍 Carregando unidades vinculadas ao estabelecimento ${establishmentId}...`);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/paytime/establishments/${establishmentId}/unidades`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta:', errorText);
        throw new Error("Erro ao carregar unidades vinculadas");
      }

      const data = await response.json();
      console.log(`✅ ${Array.isArray(data) ? data.length : 0} unidades vinculadas:`, data);
      setVinculatedUnidades(data);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar unidades vinculadas");
    } finally {
      setLoadingUnidades(false);
    }
  };

  const vincularUnidade = async () => {
    if (!selectedUnidadeToLink || !selectedEstabelecimento) return;

    try {
      setLoadingUnidades(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/paytime/establishments/${selectedEstabelecimento.id}/vincular-unidade/${selectedUnidadeToLink}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao vincular unidade");
      }

      toast.success("Unidade vinculada com sucesso!");
      setSelectedUnidadeToLink("");
      setSearchUnidade("");
      await carregarUnidadesVinculadas(selectedEstabelecimento.id);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao vincular unidade");
    } finally {
      setLoadingUnidades(false);
    }
  };

  const desvincularUnidade = async (unidadeId: string) => {
    if (!selectedEstabelecimento) return;

    if (!confirm("Deseja realmente desvincular esta unidade?")) return;

    try {
      setLoadingUnidades(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/paytime/establishments/${selectedEstabelecimento.id}/desvincular-unidade/${unidadeId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao desvincular unidade");
      }

      toast.success("Unidade desvinculada com sucesso!");
      await carregarUnidadesVinculadas(selectedEstabelecimento.id);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao desvincular unidade");
    } finally {
      setLoadingUnidades(false);
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {estabelecimentos.map((estabelecimento) => (
                <Card
                  key={estabelecimento.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <div className="flex items-start gap-2 mb-2">
                        <Building2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
                          {estabelecimento.nome}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <Badge variant={getStatusBadgeVariant(estabelecimento.status)} className="text-xs">
                          {getStatusLabel(estabelecimento.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getTipoLabel(estabelecimento.tipo)}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 min-w-[60px]">Documento:</span>
                        <span className="font-medium text-gray-900 truncate">{estabelecimento.cnpj}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-600 truncate">
                          {estabelecimento.cidade}/{estabelecimento.estado}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${getRiscoColor(estabelecimento.risco)}`}>
                          Risco: {estabelecimento.risco}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => verDetalhes(estabelecimento.id)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-2" />
                      Ver Detalhes
                    </Button>
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
                            <p><span className="text-gray-600">Sobrenome:</span> {selectedEstabelecimento.last_name || "—"}</p>
                            <p><span className="text-gray-600">Documento:</span> {selectedEstabelecimento.document}</p>
                            <p><span className="text-gray-600">Tipo:</span> {getTipoLabel(selectedEstabelecimento.type)}</p>
                            <p><span className="text-gray-600">Email:</span> {selectedEstabelecimento.email}</p>
                            <p><span className="text-gray-600">Telefone:</span> {selectedEstabelecimento.phone_number}</p>
                            <p><span className="text-gray-600">Data Nascimento/Fundação:</span> {selectedEstabelecimento.birthdate || "—"}</p>
                            <p><span className="text-gray-600">Formato:</span> {selectedEstabelecimento.format || "—"}</p>
                            <p><span className="text-gray-600">Tipo de Acesso:</span> {selectedEstabelecimento.access_type}</p>
                            <p><span className="text-gray-600">Atividade Econômica:</span> {selectedEstabelecimento.activity_id || "—"}</p>
                          </div>
                        </div>

                        {selectedEstabelecimento.legal_representative && (
                          <div>
                            <h3 className="font-semibold mb-2">Representante Legal</h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <p><span className="text-gray-600">Nome:</span> {selectedEstabelecimento.legal_representative.first_name}</p>
                              <p><span className="text-gray-600">Sobrenome:</span> {selectedEstabelecimento.legal_representative.last_name}</p>
                              <p><span className="text-gray-600">CPF:</span> {selectedEstabelecimento.legal_representative.document}</p>
                              <p><span className="text-gray-600">Data Nascimento:</span> {selectedEstabelecimento.legal_representative.birthdate || "—"}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <h3 className="font-semibold mb-2">Endereço</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <p><span className="text-gray-600">CEP:</span> {selectedEstabelecimento.address?.zip_code}</p>
                            <p><span className="text-gray-600">Cidade:</span> {selectedEstabelecimento.address?.city}</p>
                            <p><span className="text-gray-600">Estado:</span> {selectedEstabelecimento.address?.state}</p>
                            <p><span className="text-gray-600">Bairro:</span> {selectedEstabelecimento.address?.neighborhood}</p>
                            <p><span className="text-gray-600">Logradouro:</span> {selectedEstabelecimento.address?.street}</p>
                            <p><span className="text-gray-600">Número:</span> {selectedEstabelecimento.address?.number}</p>
                            <p><span className="text-gray-600">Complemento:</span> {selectedEstabelecimento.address?.complement || "—"}</p>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Informações Financeiras</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <p><span className="text-gray-600">Receita:</span> {selectedEstabelecimento.revenue || "—"}</p>
                            <p><span className="text-gray-600">GMV:</span> {selectedEstabelecimento.gmv || "0"}</p>
                            <p><span className="text-gray-600">Inscrição Estadual:</span> {selectedEstabelecimento.state_registration || "—"}</p>
                            <p><span className="text-gray-600">Inscrição Municipal:</span> {selectedEstabelecimento.municipal_registration || "—"}</p>
                          </div>
                        </div>

                        {(selectedEstabelecimento.phones && selectedEstabelecimento.phones.length > 0) && (
                          <div>
                            <h3 className="font-semibold mb-2">Telefones Adicionais</h3>
                            <div className="space-y-1 text-sm">
                              {selectedEstabelecimento.phones.map((phone: any, idx: number) => (
                                <p key={idx}>
                                  <span className="text-gray-600">Telefone {idx + 1}:</span> {phone.number}
                                  {phone.type && <span className="text-gray-500 ml-2">({phone.type})</span>}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h3 className="font-semibold mb-2">Status e Datas</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <p><span className="text-gray-600">Status:</span> {getStatusLabel(selectedEstabelecimento.status)}</p>
                            <p><span className="text-gray-600">Nível de Risco:</span> <span className={getRiscoColor(selectedEstabelecimento.risk)}>{selectedEstabelecimento.risk}</span></p>
                            <p><span className="text-gray-600">Criado em:</span> {new Date(selectedEstabelecimento.created_at).toLocaleString('pt-BR')}</p>
                            <p><span className="text-gray-600">Atualizado em:</span> {new Date(selectedEstabelecimento.updated_at).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>

                        {/* Seção de Vínculos com Unidades TeamCruz */}
                        <div className="border-t pt-4">
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" />
                            Unidades Vinculadas
                          </h3>

                          {loadingUnidades ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {/* Lista de unidades vinculadas */}
                              {vinculatedUnidades.length > 0 ? (
                                <div className="space-y-2">
                                  {vinculatedUnidades.map((unidade: any) => (
                                    <div key={unidade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                      <div className="flex-1">
                                        <p className="font-medium">{unidade.nome}</p>
                                        <p className="text-sm text-gray-600">
                                          {unidade.cidade} - {unidade.estado}
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => desvincularUnidade(unidade.id)}
                                        disabled={loadingUnidades}
                                      >
                                        <Unlink className="w-4 h-4 mr-1" />
                                        Desvincular
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 py-2">
                                  Nenhuma unidade vinculada a este estabelecimento.
                                </p>
                              )}

                              {/* Formulário para vincular nova unidade */}
                              <div className="pt-4 border-t mt-4">
                                <div className="space-y-3">
                                  {/* Campo de busca */}
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                      placeholder="Busque por nome ou localização..."
                                      value={searchUnidade}
                                      onChange={(e) => setSearchUnidade(e.target.value)}
                                      className="pl-10"
                                    />
                                  </div>
                                  
                                  {/* Unidade selecionada */}
                                  {selectedUnidadeToLink && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Building2 className="w-4 h-4 text-blue-600" />
                                          <span className="text-sm font-medium text-blue-900">
                                            {availableUnidades.find(u => u.id === selectedUnidadeToLink)?.nome.toUpperCase()}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => setSelectedUnidadeToLink("")}
                                          className="text-blue-600 hover:text-blue-800"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Lista filtrada de unidades */}
                                  {searchUnidade && (
                                    <div className="max-h-60 overflow-y-auto border rounded-md bg-white shadow-sm">
                                      {(Array.isArray(availableUnidades) ? availableUnidades : [])
                                        .filter(u => !u.paytime_establishment_id)
                                        .filter(u => !vinculatedUnidades.find(v => v.id === u.id))
                                        .filter(u => {
                                          const search = searchUnidade.toLowerCase();
                                          return u.nome?.toLowerCase().includes(search) ||
                                                 u.cidade?.toLowerCase().includes(search) ||
                                                 u.estado?.toLowerCase().includes(search);
                                        })
                                        .map((unidade: any) => {
                                          const location = [unidade.cidade, unidade.estado].filter(Boolean).join('/');
                                          const isSelected = selectedUnidadeToLink === unidade.id;
                                          
                                          return (
                                            <div
                                              key={unidade.id}
                                              onClick={() => {
                                                setSelectedUnidadeToLink(unidade.id);
                                                setSearchUnidade('');
                                              }}
                                              className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                                                isSelected 
                                                  ? 'bg-blue-50 border-l-4 border-l-blue-600' 
                                                  : 'hover:bg-gray-50'
                                              }`}
                                            >
                                              <div className="flex items-start gap-2">
                                                <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                  <div className="font-medium text-sm text-gray-900">
                                                    {unidade.nome.toUpperCase()}
                                                  </div>
                                                  {location && (
                                                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                      <MapPin className="w-3 h-3" />
                                                      {location.toUpperCase()}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      {(Array.isArray(availableUnidades) ? availableUnidades : [])
                                        .filter(u => !u.paytime_establishment_id)
                                        .filter(u => !vinculatedUnidades.find(v => v.id === u.id))
                                        .filter(u => {
                                          const search = searchUnidade.toLowerCase();
                                          return u.nome?.toLowerCase().includes(search) ||
                                                 u.cidade?.toLowerCase().includes(search) ||
                                                 u.estado?.toLowerCase().includes(search);
                                        }).length === 0 && (
                                          <div className="p-8 text-center">
                                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">
                                              Nenhuma unidade encontrada
                                            </p>
                                          </div>
                                        )}
                                    </div>
                                  )}
                                  
                                  <Button
                                    onClick={vincularUnidade}
                                    disabled={!selectedUnidadeToLink || loadingUnidades}
                                    className="w-full"
                                  >
                                    {loadingUnidades ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Vinculando...
                                      </>
                                    ) : (
                                      <>
                                        <LinkIcon className="w-4 h-4 mr-2" />
                                        Confirmar Vínculo
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
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
