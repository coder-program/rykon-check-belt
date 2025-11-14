"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listFranqueados,
  createFranqueado,
  updateFranqueado,
  deleteFranqueado,
} from "@/lib/peopleApi";
import { getUsuariosByPerfil, getUsuario, Usuario } from "@/lib/usuariosApi";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  Edit,
  Trash2,
  User,
  X,
  ArrowLeft,
  Filter,
  UserCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ==============================================
// INTERFACES SIMPLIFICADAS
// ==============================================

type SituacaoFranqueado = "ATIVA" | "INATIVA" | "EM_HOMOLOGACAO";

interface ValidationError {
  property: string;
  value: unknown;
  constraints?: Record<string, string>;
  message?: string;
}

interface APIError extends Error {
  errors?: ValidationError[];
}

interface FranqueadoSimplificado {
  id: string;
  usuario_id?: string | null;
  // Dados da Pessoa Física Responsável
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  // Endereço (opcional)
  endereco_id?: string | null;
  // Gestão
  unidades_gerencia: string[];
  total_unidades?: number;
  // Status
  situacao: SituacaoFranqueado;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface FranqueadoFormData {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  usuario_id?: string;
  situacao: SituacaoFranqueado;
  ativo: boolean;
}

// ==============================================
// UTILITÁRIOS
// ==============================================

const formatCPF = (cpf: string): string => {
  if (!cpf) return "";
  const cleaned = cpf.replace(/\D/g, "");
  return cleaned
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .slice(0, 14);
};

const formatPhone = (phone: string): string => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return phone;
};

const getSituacaoBadge = (situacao: SituacaoFranqueado) => {
  switch (situacao) {
    case "ATIVA":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
          <CheckCircle className="h-3 w-3" />
          Ativa
        </span>
      );
    case "INATIVA":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
          <XCircle className="h-3 w-3" />
          Inativa
        </span>
      );
    case "EM_HOMOLOGACAO":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
          <AlertCircle className="h-3 w-3" />
          Em Homologação
        </span>
      );
  }
};

// ==============================================
// COMPONENTE FORMULÁRIO SIMPLIFICADO
// ==============================================

interface UsuarioSimples {
  id: string;
  nome: string;
  email: string;
}

interface FormularioFranqueadoProps {
  franqueado?: FranqueadoSimplificado;
  onClose: () => void;
  onSubmit: (data: FranqueadoFormData) => void;
  isLoading?: boolean;
  usuarios?: UsuarioSimples[];
}

const FormularioFranqueado: React.FC<FormularioFranqueadoProps> = ({
  franqueado,
  onClose,
  onSubmit,
  isLoading = false,
  usuarios = [],
}) => {
  const [formData, setFormData] = useState<FranqueadoFormData>({
    nome: franqueado?.nome || "",
    cpf: franqueado?.cpf || "",
    email: franqueado?.email || "",
    telefone: franqueado?.telefone || "",
    usuario_id: franqueado?.usuario_id || "",
    situacao: franqueado?.situacao || "EM_HOMOLOGACAO",
    ativo: franqueado?.ativo ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dadosPreenchidosAutomaticamente, setDadosPreenchidosAutomaticamente] =
    useState(false);
  const [searchUsuario, setSearchUsuario] = useState("");
  const [showUsuarioDropdown, setShowUsuarioDropdown] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] =
    useState<UsuarioSimples | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUsuarioDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Inicializar campo de pesquisa se já tem um usuário selecionado
  useEffect(() => {
    if (franqueado?.usuario_id && usuarios.length > 0) {
      const usuarioEncontrado = usuarios.find(
        (u) => u.id === franqueado.usuario_id
      );
      if (usuarioEncontrado) {
        setUsuarioSelecionado(usuarioEncontrado);
        setSearchUsuario(
          `${usuarioEncontrado.nome} (${usuarioEncontrado.email})`
        );
      }
    }
  }, [franqueado?.usuario_id, usuarios]);

  // Função auxiliar para classe CSS dos campos preenchidos automaticamente
  const getFieldClassName = (baseClass: string, hasError: boolean = false) => {
    if (hasError) {
      return `${baseClass} border-red-500`;
    }
    if (dadosPreenchidosAutomaticamente && formData.usuario_id) {
      return `${baseClass} border-green-300 bg-green-50`;
    }
    return `${baseClass} border-gray-300`;
  };

  // Função para filtrar usuários baseado na pesquisa
  const usuariosFiltrados = usuarios.filter(
    (usuario) =>
      usuario.nome.toLowerCase().includes(searchUsuario.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchUsuario.toLowerCase())
  );

  // Função para selecionar um usuário da lista
  const handleSelectUsuario = (usuario: UsuarioSimples) => {
    setUsuarioSelecionado(usuario);
    setSearchUsuario(`${usuario.nome} (${usuario.email})`);
    setShowUsuarioDropdown(false);
    handleUsuarioSelect(usuario.id);
  };

  // Função para limpar seleção de usuário
  const handleClearUsuario = () => {
    setUsuarioSelecionado(null);
    setSearchUsuario("");
    setShowUsuarioDropdown(false);
    handleUsuarioSelect("");
  };

  // Função para buscar e preencher dados do usuário
  const handleUsuarioSelect = async (usuarioId: string) => {
    if (!usuarioId) {
      setFormData({
        ...formData,
        usuario_id: undefined,
      });
      setDadosPreenchidosAutomaticamente(false);
      return;
    }

    try {
      // Buscar dados completos do usuário selecionado usando a API existente
      const usuario: Usuario = await getUsuario(usuarioId);

      // Verificar se existem dados para preencher
      const temDados =
        usuario.nome || usuario.email || usuario.cpf || usuario.telefone;

      // Preencher os campos com os dados do usuário
      setFormData((prev) => ({
        ...prev,
        usuario_id: usuarioId,
        nome: usuario.nome || prev.nome,
        email: usuario.email || prev.email,
        cpf: usuario.cpf ? formatCPF(usuario.cpf) : prev.cpf,
        telefone: usuario.telefone
          ? formatPhone(usuario.telefone)
          : prev.telefone,
      }));

      if (temDados) {
        setDadosPreenchidosAutomaticamente(true);
        toast.success("Dados do usuário carregados automaticamente!");
      } else {
        setDadosPreenchidosAutomaticamente(false);
        toast("Usuário selecionado, mas sem dados adicionais para preencher.");
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      toast.error("Erro ao carregar dados do usuário");

      // Manter apenas o ID selecionado
      setFormData({
        ...formData,
        usuario_id: usuarioId,
      });
      setDadosPreenchidosAutomaticamente(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.usuario_id || !formData.usuario_id.trim()) {
      newErrors.usuario_id = "Usuário é obrigatório";
    }

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (formData.cpf.replace(/\D/g, "").length !== 11) {
      newErrors.cpf = "CPF deve ter 11 dígitos";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório";
    } else if (formData.telefone.replace(/\D/g, "").length < 10) {
      newErrors.telefone = "Telefone deve ter pelo menos 10 dígitos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const dataToSubmit = {
        ...formData,
        cpf: formData.cpf.replace(/\D/g, ""),
        telefone: formData.telefone.replace(/\D/g, ""),
        // usuario_id agora é obrigatório
        usuario_id: formData.usuario_id,
      };

      onSubmit(dataToSubmit);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {franqueado ? "Editar Franqueado" : "Novo Franqueado"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo do Responsável *
              {dadosPreenchidosAutomaticamente && formData.usuario_id && (
                <span className="ml-2 text-green-600 text-xs">
                  (Preenchido automaticamente)
                </span>
              )}
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              className={getFieldClassName(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                !!errors.nome
              )}
              placeholder="Digite o nome completo"
            />
            {errors.nome && (
              <p className="text-red-600 text-sm mt-1">{errors.nome}</p>
            )}
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CPF *
            </label>
            <input
              type="text"
              required
              value={formData.cpf}
              onChange={(e) =>
                setFormData({ ...formData, cpf: formatCPF(e.target.value) })
              }
              className={getFieldClassName(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                !!errors.cpf
              )}
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && (
              <p className="text-red-600 text-sm mt-1">{errors.cpf}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
              {dadosPreenchidosAutomaticamente && formData.usuario_id && (
                <span className="ml-2 text-green-600 text-xs">
                  (Preenchido automaticamente)
                </span>
              )}
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={getFieldClassName(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                !!errors.email
              )}
              placeholder="email@exemplo.com"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Telefone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone/WhatsApp *
            </label>
            <input
              type="text"
              required
              value={formData.telefone}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  telefone: formatPhone(e.target.value),
                })
              }
              className={getFieldClassName(
                "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                !!errors.telefone
              )}
              placeholder="(11) 99999-9999"
            />
            {errors.telefone && (
              <p className="text-red-600 text-sm mt-1">{errors.telefone}</p>
            )}
          </div>

          {/* Usuário Vinculado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuário do Sistema *
            </label>
            <div className="space-y-2 relative" ref={dropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={searchUsuario}
                  onChange={(e) => {
                    setSearchUsuario(e.target.value);
                    setShowUsuarioDropdown(true);
                    if (!e.target.value) {
                      handleClearUsuario();
                    }
                  }}
                  onFocus={() => setShowUsuarioDropdown(true)}
                  className={getFieldClassName(
                    "w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    !!errors.usuario_id
                  )}
                  placeholder="Digite para pesquisar usuário..."
                />

                {/* Ícone de pesquisa ou limpar */}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {usuarioSelecionado ? (
                    <button
                      type="button"
                      onClick={handleClearUsuario}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : (
                    <Search className="h-4 w-4 text-gray-400" />
                  )}
                </div>

                {/* Dropdown de usuários */}
                {showUsuarioDropdown &&
                  searchUsuario &&
                  usuariosFiltrados.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {usuariosFiltrados.slice(0, 10).map((usuario) => (
                        <button
                          key={usuario.id}
                          type="button"
                          onClick={() => handleSelectUsuario(usuario)}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {usuario.nome}
                          </div>
                          <div className="text-sm text-gray-600">
                            {usuario.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                {/* Mensagem quando não encontra usuários */}
                {showUsuarioDropdown &&
                  searchUsuario &&
                  usuariosFiltrados.length === 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                      <p className="text-sm text-gray-500 text-center">
                        Nenhum usuário encontrado para &quot;{searchUsuario}
                        &quot;
                      </p>
                    </div>
                  )}
              </div>

              {errors.usuario_id && (
                <p className="text-red-600 text-sm mt-1">{errors.usuario_id}</p>
              )}

              {formData.usuario_id && !errors.usuario_id && (
                <p className="text-sm text-blue-600 flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  {dadosPreenchidosAutomaticamente
                    ? "Dados do usuário preenchidos automaticamente!"
                    : "Usuário selecionado"}
                </p>
              )}
            </div>
          </div>

          {/* Situação e Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Situação
              </label>
              <select
                value={formData.situacao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    situacao: e.target.value as SituacaoFranqueado,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="EM_HOMOLOGACAO">Em Homologação</option>
                <option value="ATIVA">Ativa</option>
                <option value="INATIVA">Inativa</option>
              </select>
            </div>

            <div>
              <label className="flex items-center mt-8">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) =>
                    setFormData({ ...formData, ativo: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Franqueado ativo
                </span>
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Salvando..." : franqueado ? "Atualizar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==============================================
// COMPONENTE PRINCIPAL
// ==============================================

export default function FranqueadosPageSimplificada() {
  // const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [situacaoFilter, setSituacaoFilter] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editingFranqueado, setEditingFranqueado] =
    useState<FranqueadoSimplificado | null>(null);

  // Queries
  const franqueadosQuery = useQuery({
    queryKey: ["franqueados"],
    queryFn: () => listFranqueados({ pageSize: 100 }),
  });

  const usuariosQuery = useQuery({
    queryKey: ["usuarios-franqueados"],
    queryFn: () => getUsuariosByPerfil("FRANQUEADO"),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createFranqueado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franqueados"] });
      toast.success("Franqueado criado com sucesso!");
      handleCloseModal();
    },
    onError: (error: unknown) => {
      console.error("Erro detalhado:", error);
      const apiError = error as APIError;

      // Verificar se é erro de CPF duplicado
      const errorMessage = apiError?.message || "";
      if (
        errorMessage.includes("cpf") ||
        errorMessage.includes("CPF") ||
        errorMessage.includes("duplicate") ||
        errorMessage.includes("duplicado") ||
        errorMessage.includes("already exists") ||
        errorMessage.includes("já existe")
      ) {
        toast.error(
          "❌ CPF já cadastrado! Este CPF já está em uso por outro franqueado.",
          {
            duration: 5000,
          }
        );
        return;
      }

      // Se há erros de validação específicos, mostrar detalhes
      if (apiError?.errors && Array.isArray(apiError.errors)) {
        const validationErrors = apiError.errors
          .map((err: ValidationError) => {
            const constraintMessages = err.constraints
              ? Object.values(err.constraints).join(", ")
              : "";
            return `${err.property}: ${
              constraintMessages || err.message || "Erro de validação"
            }`;
          })
          .join("\n");
        toast.error(`Erro de validação:\n${validationErrors}`, {
          duration: 5000,
        });
      } else {
        toast.error(apiError?.message || "Erro ao criar franqueado");
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FranqueadoFormData }) =>
      updateFranqueado(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franqueados"] });
      toast.success("Franqueado atualizado com sucesso!");
      handleCloseModal();
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message || "Erro ao atualizar franqueado");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFranqueado,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["franqueados"] });
      toast.success("Franqueado excluído com sucesso!");
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message || "Erro ao excluir franqueado");
    },
  });

  // Handlers
  const handleOpenModal = (franqueado?: FranqueadoSimplificado) => {
    setEditingFranqueado(franqueado || null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFranqueado(null);
  };

  const handleSubmit = (data: FranqueadoFormData) => {
    if (editingFranqueado) {
      updateMutation.mutate({ id: editingFranqueado.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (franqueado: FranqueadoSimplificado) => {
    if (confirm(`Tem certeza que deseja excluir ${franqueado.nome}?`)) {
      deleteMutation.mutate(franqueado.id);
    }
  };

  // Filtrar dados
  const franqueados = franqueadosQuery.data?.items || [];
  const franqueadosFiltrados = franqueados.filter(
    (franqueado: FranqueadoSimplificado) => {
      const matchesSearch =
        franqueado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        franqueado.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        franqueado.cpf.includes(searchTerm);

      const matchesSituacao =
        !situacaoFilter || franqueado.situacao === situacaoFilter;

      return matchesSearch && matchesSituacao;
    }
  );

  const stats = {
    total: franqueados.length,
    ativos: franqueados.filter(
      (f: FranqueadoSimplificado) => f.situacao === "ATIVA"
    ).length,
    inativos: franqueados.filter(
      (f: FranqueadoSimplificado) => f.situacao === "INATIVA"
    ).length,
    homologacao: franqueados.filter(
      (f: FranqueadoSimplificado) => f.situacao === "EM_HOMOLOGACAO"
    ).length,
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Toaster position="top-right" />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </button>
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <h1 className="text-3xl font-bold text-gray-900">
                    Franqueados
                  </h1>
                </div>
                <p className="text-gray-600">
                  Gerencie os responsáveis pelas franquias
                </p>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Novo Franqueado
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ativos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.ativos}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Em Homologação
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.homologacao}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inativos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.inativos}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={situacaoFilter}
                  onChange={(e) => setSituacaoFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Todas as situações</option>
                  <option value="ATIVA">Ativa</option>
                  <option value="INATIVA">Inativa</option>
                  <option value="EM_HOMOLOGACAO">Em Homologação</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lista de Franqueados */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Lista de Franqueados ({franqueadosFiltrados.length})
              </h2>
            </div>

            {franqueadosQuery.isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando franqueados...</p>
              </div>
            ) : franqueadosFiltrados.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum franqueado encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {franqueadosFiltrados.map(
                  (franqueado: FranqueadoSimplificado) => (
                    <div
                      key={franqueado.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="h-6 w-6 text-blue-600" />
                          </div>

                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">
                                {franqueado.nome}
                              </h3>
                              {getSituacaoBadge(franqueado.situacao)}
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {franqueado.email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {formatPhone(franqueado.telefone)}
                                </span>
                              </div>

                              <div className="text-sm text-gray-500">
                                CPF: {formatCPF(franqueado.cpf)} •
                                {franqueado.total_unidades || 0} unidade(s)
                                {franqueado.usuario_id && (
                                  <span className="ml-2 inline-flex items-center gap-1">
                                    <UserCheck className="h-3 w-3 text-green-600" />
                                    <span className="text-green-600">
                                      Usuário vinculado
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(franqueado)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar franqueado"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(franqueado)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir franqueado"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Modal do Formulário */}
          {showModal && (
            <FormularioFranqueado
              franqueado={editingFranqueado || undefined}
              onClose={handleCloseModal}
              onSubmit={handleSubmit}
              isLoading={createMutation.isPending || updateMutation.isPending}
              usuarios={usuariosQuery.data || []}
            />
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
