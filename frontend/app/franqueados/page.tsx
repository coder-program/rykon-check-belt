"use client";

import React from "react";
import { useAuth } from "@/app/auth/AuthContext";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { FixedSizeList as List } from "react-window";
import {
  listFranqueados,
  createFranqueado,
  updateFranqueado,
} from "@/lib/peopleApi";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  FileText,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  User,
  X,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Franqueado {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cnpj: string;
  unidades_gerencia: string[];
  data_contrato: string;
  taxa_franquia: number;
  dados_bancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    titular: string;
    documento: string;
  };
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface FranqueadoFormData {
  nome: string;
  email: string;
  telefone: string;
  cnpj: string;
  data_contrato: string;
  taxa_franquia: number;
  dados_bancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    titular: string;
    documento: string;
  };
  ativo: boolean;
}

export default function PageFranqueados() {
  const { user } = useAuth();
  const hasPerfil = (p: string) =>
    (user?.perfis || [])
      .map((x: string) => x.toLowerCase())
      .includes(p.toLowerCase());
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [showModal, setShowModal] = React.useState(false);
  const [editingFranqueado, setEditingFranqueado] =
    React.useState<Franqueado | null>(null);
  const [formData, setFormData] = React.useState<FranqueadoFormData>({
    nome: "",
    email: "",
    telefone: "",
    cnpj: "",
    data_contrato: new Date().toISOString().split("T")[0],
    taxa_franquia: 0,
    ativo: true,
  });

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ["franqueados", debounced],
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) =>
      listFranqueados({ page: pageParam, pageSize: 15, search: debounced }),
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantém em cache por 10 minutos
  });

  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createFranqueado,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franqueados"] });
      toast.success("Franqueado criado com sucesso!");
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar franqueado");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<FranqueadoFormData>;
    }) => updateFranqueado(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["franqueados"] });
      toast.success("Franqueado atualizado com sucesso!");
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar franqueado");
    },
  });

  const items = (query.data?.pages || []).flatMap((p) => p.items);

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      cnpj: "",
      data_contrato: new Date().toISOString().split("T")[0],
      taxa_franquia: 0,
      ativo: true,
    });
    setEditingFranqueado(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (franqueado: Franqueado) => {
    setEditingFranqueado(franqueado);
    setFormData({
      nome: franqueado.nome,
      email: franqueado.email,
      telefone: franqueado.telefone,
      cnpj: franqueado.cnpj,
      data_contrato:
        franqueado.data_contrato?.split("T")[0] ||
        new Date().toISOString().split("T")[0],
      taxa_franquia: franqueado.taxa_franquia || 0,
      dados_bancarios: franqueado.dados_bancarios,
      ativo: franqueado.ativo,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.cnpj) {
      toast.error("Nome e CNPJ são obrigatórios");
      return;
    }

    if (editingFranqueado) {
      updateMutation.mutate({ id: editingFranqueado.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 18);
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Franqueados</h1>
          </div>
          <p className="text-gray-600">
            Gerencie os franqueados da rede TeamCruz
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Buscar por nome, email ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {hasPerfil("master") && (
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus className="h-4 w-4" />
                Novo Franqueado
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-sm border border-blue-200">
          <div className="p-4 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {query.data?.pages[0]?.total || 0} franqueado(s) encontrado(s)
            </p>
          </div>

          <div className="h-[600px]">
            {items.length > 0 ? (
              <List
                height={600}
                itemCount={items.length + (query.hasNextPage ? 1 : 0)}
                itemSize={120}
                width={"100%"}
                onItemsRendered={({ visibleStopIndex }) => {
                  if (
                    visibleStopIndex >= items.length - 5 &&
                    query.hasNextPage &&
                    !query.isFetchingNextPage
                  )
                    query.fetchNextPage();
                }}
              >
                {({ index, style }) => {
                  const f = items[index];
                  if (!f)
                    return (
                      <div style={style} className="p-4">
                        <div className="animate-pulse bg-gray-200 h-20 rounded-lg" />
                      </div>
                    );
                  return (
                    <div style={style} className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {f.nome}
                            </h3>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-gray-600 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {f.cnpj}
                              </span>
                              {f.email && (
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {f.email}
                                </span>
                              )}
                              {f.telefone && (
                                <span className="text-sm text-gray-600 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {f.telefone}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {Array.isArray(f.unidades_gerencia)
                                  ? f.unidades_gerencia.length
                                  : 0}{" "}
                                unidade(s)
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${
                                  f.ativo
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {f.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasPerfil("master") && (
                            <button
                              onClick={() => openEditModal(f)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar franqueado"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }}
              </List>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum franqueado encontrado</p>
                  <p className="text-sm mt-1">
                    Clique em "Novo Franqueado" para criar o primeiro
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  {editingFranqueado ? "Editar Franqueado" : "Novo Franqueado"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Dados Básicos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-600" />
                    Dados Básicos
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nome}
                        onChange={(e) =>
                          setFormData({ ...formData, nome: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nome do franqueado"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CNPJ *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.cnpj}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cnpj: formatCNPJ(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="00.000.000/0000-00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="email@exemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={formData.telefone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            telefone: formatPhone(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>
                </div>

                {/* Dados do Contrato */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    Dados do Contrato
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data do Contrato
                      </label>
                      <input
                        type="date"
                        value={formData.data_contrato}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            data_contrato: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Taxa de Franquia (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.taxa_franquia}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            taxa_franquia: Number(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formData.ativo}
                      onChange={(e) =>
                        setFormData({ ...formData, ativo: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="ativo"
                      className="ml-2 text-sm font-medium text-gray-700"
                    >
                      Franqueado ativo
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {editingFranqueado ? "Atualizar" : "Criar"} Franqueado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
