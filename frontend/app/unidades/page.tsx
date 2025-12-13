"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/app/auth/AuthContext";
import {
  listUnidades,
  createUnidade,
  updateUnidade,
  deleteUnidade,
  listFranqueados,
  createEndereco,
  updateEndereco,
  getEndereco,
  getMyFranqueado,
} from "@/lib/peopleApi";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  XCircle,
  MapPin,
  Building2,
  Phone,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import UnidadeForm from "@/components/unidades/UnidadeForm";

type StatusUnidade = "ATIVA" | "INATIVA" | "HOMOLOGACAO";

interface RedesSociais {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
}

interface HorariosFuncionamento {
  seg?: string;
  ter?: string;
  qua?: string;
  qui?: string;
  sex?: string;
  sab?: string;
  dom?: string;
}

interface UnidadeFormData {
  franqueado_id: string;
  nome: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  telefone_fixo?: string;
  telefone_celular: string;
  email: string;
  website?: string;
  redes_sociais?: RedesSociais;
  endereco_id?: string;
  // Campos de endereço
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  pais?: string;
  horarios_funcionamento?: HorariosFuncionamento;
  status: StatusUnidade;
  requer_aprovacao_checkin?: boolean;
  latitude?: number;
  longitude?: number;
}

export default function PageUnidades() {
  const { user } = useAuth();

  // Log temporário para debug
  React.useEffect(() => {}, [user]);

  const hasPerfil = (p: string) => {
    if (!user?.perfis) return false;
    return user.perfis.some(
      (perfil: any) => perfil.nome?.toLowerCase() === p.toLowerCase()
    );
  };
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [debounced, setDebounced] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unidadeToInativar, setUnidadeToInativar] = useState<any>(null);
  const [editingUnidade, setEditingUnidade] = useState<any>(null);
  const [formData, setFormData] = useState<UnidadeFormData>({
    franqueado_id: "",
    nome: "",
    cnpj: "",
    razao_social: "",
    nome_fantasia: "",
    inscricao_estadual: "",
    inscricao_municipal: "",
    telefone_fixo: "",
    telefone_celular: "",
    email: "",
    website: "",
    redes_sociais: {},
    status: "HOMOLOGACAO",
    horarios_funcionamento: {},
  });

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Buscar franqueado do usuário logado (se for franqueado)
  const isFranqueado = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return perfilNome?.toLowerCase() === "franqueado";
  });

  const isSuperAdmin = user?.perfis?.some((perfil: any) => {
    const perfilNome =
      typeof perfil === "string" ? perfil : perfil.nome || perfil.perfil;
    return perfilNome?.toLowerCase() === "super_admin";
  });

  const { data: myFranqueado } = useQuery({
    queryKey: ["franqueado-me", user?.id],
    queryFn: getMyFranqueado,
    enabled: !!user?.id && isFranqueado,
  });

  // Redirecionar se for franqueado inativo
  React.useEffect(() => {
    if (isFranqueado && myFranqueado === null) {
      router.push("/dashboard");
    }
  }, [isFranqueado, myFranqueado, router]);

  const query = useQuery({
    queryKey: ["unidades", debounced, status, myFranqueado?.id, currentPage],
    queryFn: () =>
      listUnidades({
        page: currentPage,
        pageSize: 10,
        search: debounced,
        status: status === "todos" ? undefined : status,
        franqueado_id: myFranqueado?.id,
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [debounced, status]);

  const franqueadosQuery = useQuery({
    queryKey: ["franqueados"],
    queryFn: () => listFranqueados({ pageSize: 100 }),
  });

  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async (data: UnidadeFormData) => {
      return createUnidade(data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["unidades"],
        refetchType: "all",
      });
      await qc.invalidateQueries({
        queryKey: ["unidades-gestao"],
        refetchType: "all",
      });
      await qc.invalidateQueries({
        queryKey: ["unidades-franqueado"],
        refetchType: "all",
      });
      await qc.refetchQueries({ queryKey: ["unidades-gestao"] });
      setShowModal(false);
      resetForm();
      toast.success("Unidade cadastrada com sucesso!", {
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar unidade");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<UnidadeFormData>;
    }) => {
      return updateUnidade(id, data);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["unidades"],
        refetchType: "all",
      });
      await qc.invalidateQueries({
        queryKey: ["unidades-gestao"],
        refetchType: "all",
      });
      await qc.invalidateQueries({
        queryKey: ["unidades-franqueado"],
        refetchType: "all",
      });
      await qc.refetchQueries({ queryKey: ["unidades-gestao"] });
      setEditingUnidade(null);
      setShowModal(false);
      resetForm();
      toast.success("Unidade atualizada com sucesso!", {
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao atualizar unidade");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUnidade,
    onSuccess: async () => {
      await qc.invalidateQueries({
        queryKey: ["unidades"],
        refetchType: "all",
      });
      await qc.invalidateQueries({
        queryKey: ["unidades-gestao"],
        refetchType: "all",
      });
      await qc.invalidateQueries({
        queryKey: ["unidades-franqueado"],
        refetchType: "all",
      });
      await qc.refetchQueries({ queryKey: ["unidades-gestao"] });
      toast.success("Unidade removida com sucesso!", {
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao remover unidade");
    },
  });

  const items = query.data?.items || [];
  const totalItems = query.data?.total || 0;
  const totalPages = Math.ceil(totalItems / 10); // Calcular baseado no total e pageSize

  // DEBUG LOG
  React.useEffect(() => {}, [
    query.data,
    items,
    totalPages,
    totalItems,
    currentPage,
  ]);

  const resetForm = () => {
    setFormData({
      franqueado_id: "",
      nome: "",
      cnpj: "",
      razao_social: "",
      nome_fantasia: "",
      inscricao_estadual: "",
      inscricao_municipal: "",
      telefone_fixo: "",
      telefone_celular: "",
      email: "",
      website: "",
      redes_sociais: {},
      endereco_id: undefined,
      // Campos de endereço
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      status: "HOMOLOGACAO",
      horarios_funcionamento: {},
      requer_aprovacao_checkin: false,
      latitude: undefined,
      longitude: undefined,
    });
  };

  const handleInativar = (unidade: any) => {
    setUnidadeToInativar(unidade);
    setShowConfirmModal(true);
  };

  const confirmInativar = () => {
    if (unidadeToInativar) {
      deleteMutation.mutate(unidadeToInativar.id);
      setShowConfirmModal(false);
      setUnidadeToInativar(null);
    }
  };

  const cancelInativar = () => {
    setShowConfirmModal(false);
    setUnidadeToInativar(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let endereco_id = formData.endereco_id;

      // Criar ou atualizar endereço se há dados de endereço preenchidos
      const hasAddressData =
        formData.cep ||
        formData.logradouro ||
        formData.numero ||
        formData.bairro ||
        formData.cidade;

      if (hasAddressData) {
        const enderecoData = {
          cep: formData.cep?.replace(/\D/g, "") || "",
          logradouro: formData.logradouro || "",
          numero: formData.numero || "",
          complemento: formData.complemento || "",
          bairro: formData.bairro || "",
          cidade: formData.cidade || "",
          estado: formData.estado || "",
          pais: formData.pais || "Brasil",
        };

        if (endereco_id) {
          // Atualizar endereço existente
          await updateEndereco(endereco_id, enderecoData);
        } else {
          // Criar novo endereço
          const novoEndereco = await createEndereco(enderecoData);
          endereco_id = novoEndereco.id;
        }
      }

      // Limpar formatação antes de enviar
      const cleanedData = {
        ...formData,
        cnpj: formData.cnpj?.replace(/\D/g, "") || "",
        telefone_celular: formData.telefone_celular?.replace(/\D/g, "") || "",
        telefone_fixo: formData.telefone_fixo?.replace(/\D/g, "") || "",
        endereco_id,
        // Remover campos de endereço pois são salvos separadamente
        cep: undefined,
        logradouro: undefined,
        numero: undefined,
        complemento: undefined,
        bairro: undefined,
        cidade: undefined,
        estado: undefined,
        pais: undefined,
      };

      if (editingUnidade?.id) {
        updateMutation.mutate({ id: editingUnidade.id, data: cleanedData });
      } else {
        createMutation.mutate(cleanedData);
      }
    } catch (error) {
      console.error(" Erro ao processar endereço:", error);
      // Continuar com o salvamento mesmo se o endereço der erro
      const cleanedData = {
        ...formData,
        cnpj: formData.cnpj?.replace(/\D/g, "") || "",
        telefone_celular: formData.telefone_celular?.replace(/\D/g, "") || "",
        telefone_fixo: formData.telefone_fixo?.replace(/\D/g, "") || "",
      };

      if (editingUnidade?.id) {
        updateMutation.mutate({ id: editingUnidade.id, data: cleanedData });
      } else {
        createMutation.mutate(cleanedData);
      }
    }
  };

  const handleEdit = async (unidade: any) => {
    setEditingUnidade(unidade);
    setShowModal(true);

    const baseFormData = {
      franqueado_id: unidade.franqueado_id || "",
      nome: unidade.nome || "",
      cnpj: unidade.cnpj || "",
      razao_social: unidade.razao_social || "",
      nome_fantasia: unidade.nome_fantasia || "",
      inscricao_estadual: unidade.inscricao_estadual || "",
      inscricao_municipal: unidade.inscricao_municipal || "",
      telefone_fixo: unidade.telefone_fixo || "",
      telefone_celular: unidade.telefone_celular || "",
      email: unidade.email || "",
      website: unidade.website || "",
      redes_sociais: unidade.redes_sociais || {},
      endereco_id: unidade.endereco_id,
      // Campos de endereço vazios por padrão
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      pais: "Brasil",
      status: unidade.status || "HOMOLOGACAO",
      horarios_funcionamento: unidade.horarios_funcionamento || {},
      requer_aprovacao_checkin: unidade.requer_aprovacao_checkin || false,
      latitude: unidade.latitude ?? undefined,
      longitude: unidade.longitude ?? undefined,
    };

    // Buscar dados do endereço se houver endereco_id
    if (unidade.endereco_id) {
      try {
        const endereco = await getEndereco(unidade.endereco_id);
        // Atualizar formData com os dados do endereço
        baseFormData.cep = endereco.cep
          ? `${endereco.cep.slice(0, 5)}-${endereco.cep.slice(5)}`
          : "";
        baseFormData.logradouro = endereco.logradouro || "";
        baseFormData.numero = endereco.numero || "";
        baseFormData.complemento = endereco.complemento || "";
        baseFormData.bairro = endereco.bairro || "";
        baseFormData.cidade = endereco.cidade || "";
        baseFormData.estado = endereco.estado || "";
        baseFormData.pais = endereco.pais || "Brasil";
      } catch (error) {
        console.error("Erro ao carregar endereço da unidade:", error);
      }
    }

    setFormData(baseFormData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ATIVA":
        return "text-green-600 bg-green-100";
      case "INATIVA":
        return "text-red-600 bg-red-100";
      case "HOMOLOGACAO":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ATIVA":
        return <CheckCircle2 className="h-4 w-4" />;
      case "INATIVA":
        return <AlertCircle className="h-4 w-4" />;
      case "HOMOLOGACAO":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-6 space-y-4">
        {/* Header com Voltar e Título */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Unidades
          </h1>
          <button
            onClick={() => router.push("/admin/gestao-unidades")}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Temporário: mostrar para todos os usuários */}
          {!isSuperAdmin && (
            <button
              className="btn btn-primary flex items-center gap-2"
              onClick={() => {
                setEditingUnidade(null);
                resetForm();
                setShowModal(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nova Unidade
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="input input-bordered w-full pl-9"
              placeholder="Buscar por nome, CNPJ ou responsável"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="select select-bordered"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="todos">Todos os Status</option>
            <option value="ATIVA">Ativas</option>
            <option value="HOMOLOGACAO">Em Homologação</option>
            <option value="INATIVA">Inativas</option>
          </select>
          <button
            className="btn btn-outline"
            onClick={() => {
              setSearch("");
              setDebounced("");
              setStatus("todos");
              toast.success("Filtros limpos", { duration: 3000 });
            }}
          >
            Limpar Filtros
          </button>
        </div>

        {/* Lista */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {query.isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Carregando unidades...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>Nenhuma unidade encontrada</p>
            </div>
          ) : (
            <div className="divide-y">
              {items.map((unidade) => (
                <div
                  key={unidade.id}
                  className="px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {unidade.nome}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            unidade.status
                          )}`}
                        >
                          {getStatusIcon(unidade.status)}
                          {unidade.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>CNPJ: {unidade.cnpj}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{unidade.telefone_celular}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {unidade.endereco?.cidade || "Cidade não definida"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {unidade.requer_aprovacao_checkin ? (
                            <>
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                              <span className="text-orange-600 font-medium">
                                Aprovação Manual
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-green-600 font-medium">
                                Aprovação Automática
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(unidade)}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </button>
                      {unidade.status !== "INATIVA" && (
                        <button
                          onClick={() => handleInativar(unidade)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Inativar"
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!query.isLoading && items.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Primeira
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Mostra primeira, última, atual e 2 páginas antes/depois da atual
                  return (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  );
                })
                .map((page, index, array) => {
                  // Adiciona "..." entre páginas não consecutivas
                  const showEllipsis =
                    index > 0 && array[index - 1] !== page - 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && (
                        <span className="px-2 py-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Última
            </button>
          </div>
        )}

        {/* Modal de Cadastro/Edição */}
        {showModal && (
          <UnidadeForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowModal(false);
              setEditingUnidade(null);
              resetForm();
            }}
            isEditing={!!editingUnidade}
            isLoading={
              editingUnidade
                ? updateMutation.isPending
                : createMutation.isPending
            }
            franqueados={franqueadosQuery.data?.items || []}
            myFranqueado={myFranqueado}
          />
        )}

        {/* Modal de Confirmação de Inativação */}
        {showConfirmModal && unidadeToInativar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white bg-opacity-20 p-3 rounded-full">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Inativar Unidade</h3>
                    <p className="text-red-100 text-sm mt-1">
                      Esta ação pode afetar o funcionamento da unidade
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6">
                  <p className="text-gray-700 mb-4">
                    Tem certeza que deseja inativar a unidade{" "}
                    <span className="font-semibold text-gray-900">
                      {unidadeToInativar.nome}
                    </span>
                    ?
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">Atenção:</p>
                        <ul className="list-disc list-inside space-y-1 text-amber-700">
                          <li>
                            Não é possível inativar unidades com professores,
                            alunos, recepcionistas ou gerentes vinculados
                          </li>
                          <li>Remova todos os vínculos primeiro</li>
                          <li>
                            Você pode reativar posteriormente se necessário
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={cancelInativar}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmInativar}
                    disabled={deleteMutation.isPending}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Inativando...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Inativar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
