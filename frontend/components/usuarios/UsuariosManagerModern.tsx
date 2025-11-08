"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import {
  getUsuarios,
  getPerfis,
  getPermissoes,
  updateUsuario,
  deleteUsuario,
  createUsuario,
  type UpdateUsuarioDto,
} from "@/lib/usuariosApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  Mail,
  Phone,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

// Função para validar CPF
const isValidCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;

  return cpf[9] == digit1.toString() && cpf[10] == digit2.toString();
};

// Função para validar telefone
const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 11;
};

// Função para formatar CPF
const formatCPF = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  return cleaned
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .slice(0, 14);
};

// Função para formatar telefone
const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return value;
};

interface FormData {
  username: string;
  email: string;
  password: string;
  nome: string;
  cpf: string;
  telefone: string;
  ativo: boolean;
  cadastro_completo: boolean;
  perfil_ids: string[];
  unidade_id?: string; // Unidade para GERENTE_UNIDADE
  // Campos do franqueado (opcionais)
  nome_franqueado?: string;
  email_franqueado?: string;
  telefone_franqueado?: string;
  cpf_franqueado?: string;
}

interface ValidationErrors {
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  password?: string;
  username?: string;
}

export default function UsuariosManagerNew() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    nome: "",
    cpf: "",
    telefone: "",
    ativo: true,
    cadastro_completo: false,
    perfil_ids: [],
    unidade_id: "", // Inicializar vazio
    nome_franqueado: "",
    email_franqueado: "",
    telefone_franqueado: "",
    cpf_franqueado: "",
  });

  // Verificar se o usuário logado é MASTER
  // user.perfis é array de strings: ['FRANQUEADO'] ou ['MASTER']
  const userPerfisArray = user?.perfis || [];

  const isMaster = userPerfisArray.some((perfil: any) =>
    typeof perfil === "string"
      ? ["MASTER", "SUPER_ADMIN", "ADMIN_SISTEMA"].includes(
          perfil.toUpperCase()
        )
      : perfil.nome?.toUpperCase() === "MASTER" ||
        perfil.nome?.toUpperCase() === "SUPER_ADMIN" ||
        perfil.nome?.toUpperCase() === "ADMIN_SISTEMA"
  );

  const isFranqueado = userPerfisArray.some((perfil: any) =>
    typeof perfil === "string"
      ? perfil.toUpperCase() === "FRANQUEADO"
      : perfil.nome?.toUpperCase() === "FRANQUEADO"
  );

  const isGerenteUnidade = userPerfisArray.some((perfil: any) =>
    typeof perfil === "string"
      ? perfil.toUpperCase() === "GERENTE_UNIDADE"
      : perfil.nome?.toUpperCase() === "GERENTE_UNIDADE"
  );

  console.log("🔍 DEBUG PERFIS:", {
    userPerfisArray,
    isMaster,
    isFranqueado,
    isGerenteUnidade,
  });

  // Queries
  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ["usuarios"],
    queryFn: getUsuarios,
  });

  // Log para debug dos usuários retornados
  console.log(
    "👥 [FRONTEND] Usuários recebidos da API:",
    usuarios.map((u: any) => ({
      nome: u.nome,
      perfis: u.perfis?.map((p: any) => p.nome),
      unidade: u.unidade,
    }))
  );

  const { data: perfis = [] } = useQuery({
    queryKey: ["perfis"],
    queryFn: getPerfis,
  });

  // Buscar unidades do franqueado ou gerente logado
  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades-franqueado"],
    queryFn: async () => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
        }/unidades`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Erro ao buscar unidades");
      const data = await response.json();
      return data.items || [];
    },
    enabled: !!user && (isFranqueado || isGerenteUnidade), // Busca se for franqueado OU gerente
  });

  console.log("🏢 Unidades disponíveis:", unidades);

  console.log(
    "📋 Todos os perfis retornados:",
    perfis.map((p: any) => p.nome)
  );

  // Filtrar perfis disponíveis baseado no perfil do usuário logado
  const perfisDisponiveis = perfis.filter((perfil: any) => {
    const nomePerfil = perfil.nome?.toUpperCase();

    // Se não conseguiu detectar o usuário, NÃO mostrar perfis (segurança)
    if (!user || !user.perfis || user.perfis.length === 0) {
      console.log("❌ Usuário não detectado - bloqueando todos os perfis");
      return false;
    }

    // MASTER pode criar qualquer perfil
    if (isMaster) {
      console.log(`✅ MASTER pode criar: ${nomePerfil}`);
      return true;
    }

    // FRANQUEADO pode criar apenas estes perfis:
    if (isFranqueado) {
      const permitido = [
        "GERENTE_UNIDADE",
        "RECEPCIONISTA",
        "ALUNO",
        "RESPONSAVEL",
        "INSTRUTOR",
      ].includes(nomePerfil);
      console.log(
        `${permitido ? "✅" : "❌"} FRANQUEADO - ${nomePerfil}: ${permitido}`
      );
      return permitido;
    }

    // GERENTE_UNIDADE pode criar apenas estes perfis:
    if (isGerenteUnidade) {
      const permitido = [
        "RECEPCIONISTA",
        "ALUNO",
        "RESPONSAVEL",
        "INSTRUTOR",
      ].includes(nomePerfil);
      console.log(
        `${
          permitido ? "✅" : "❌"
        } GERENTE_UNIDADE - ${nomePerfil}: ${permitido}`
      );
      return permitido;
    }

    // Se não for MASTER, FRANQUEADO nem GERENTE_UNIDADE, NÃO pode criar usuários
    console.log(`❌ Sem permissão para: ${nomePerfil}`);
    return false;
  });

  console.log(
    "📋 Perfis disponíveis FINAL:",
    perfisDisponiveis.map((p: any) => p.nome)
  );

  // Detectar se perfil FRANQUEADO está selecionado
  const perfilFranqueadoId = perfis.find(
    (p: any) => p.nome?.toUpperCase() === "FRANQUEADO"
  )?.id;
  const isFranqueadoSelecionado = formData.perfil_ids.includes(
    perfilFranqueadoId || ""
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário criado com sucesso!");
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao criar usuário");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUsuarioDto }) =>
      updateUsuario(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário atualizado com sucesso!");
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao atualizar usuário");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao excluir usuário");
    },
  });

  // Validação do formulário
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.nome.trim()) {
      errors.nome = "Nome é obrigatório";
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.nome)) {
      errors.nome = "Nome deve conter apenas letras";
    }

    if (!formData.email.trim()) {
      errors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email inválido";
    }

    if (!formData.username.trim()) {
      errors.username = "Username é obrigatório";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      errors.username = "Username deve conter apenas letras, números, _ ou -";
    }

    if (!editingUser && !formData.password.trim()) {
      errors.password = "Senha é obrigatória";
    } else if (formData.password && formData.password.length < 6) {
      errors.password = "Senha deve ter pelo menos 6 caracteres";
    }

    if (formData.cpf && !isValidCPF(formData.cpf)) {
      errors.cpf = "CPF inválido";
    }

    if (formData.telefone && !isValidPhone(formData.telefone)) {
      errors.telefone = "Telefone deve ter 10 ou 11 dígitos";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (user?: any) => {
    if (user) {
      console.log("🔧 [MODAL] Abrindo modal para editar usuário:", {
        nome: user.nome,
        perfis: user.perfis?.map((p: any) => p.nome),
        unidade: user.unidade,
        unidade_id: user.unidade?.id,
      });

      setEditingUser(user);
      setFormData({
        username: user.username || "",
        email: user.email || "",
        password: "",
        nome: user.nome || "",
        cpf: user.cpf || "",
        telefone: user.telefone || "",
        ativo: user.ativo ?? true,
        cadastro_completo: user.cadastro_completo ?? false,
        perfil_ids: user.perfis?.map((p: any) => p.id) || [],
        unidade_id: user.unidade?.id || "", // ✅ CARREGAR unidade_id
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        email: "",
        password: "",
        nome: "",
        cpf: "",
        telefone: "",
        ativo: true,
        cadastro_completo: false,
        perfil_ids: [],
        unidade_id: "", // Garantir campo vazio para criação
      });
    }
    setValidationErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setValidationErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    try {
      if (editingUser) {
        console.log("💾 [UPDATE] Preparando dados para atualização:", {
          userId: editingUser.id,
          nome: formData.nome,
          perfil_ids: formData.perfil_ids,
          unidade_id: formData.unidade_id,
        });

        const updateData: any = {
          email: formData.email,
          nome: formData.nome,
          cpf: formData.cpf.replace(/\D/g, ""),
          telefone: formData.telefone.replace(/\D/g, ""),
          ativo: formData.ativo,
          cadastro_completo: formData.cadastro_completo,
          perfil_ids: formData.perfil_ids,
        };

        // ✅ ADICIONAR unidade_id no UPDATE
        if (formData.unidade_id) {
          updateData.unidade_id = formData.unidade_id;
          console.log(
            "🏢 [UPDATE] Incluindo unidade_id no payload:",
            formData.unidade_id
          );
        }

        if (formData.password.trim()) {
          updateData.password = formData.password;
        }

        console.log("📤 [UPDATE] Payload final:", updateData);

        await updateMutation.mutateAsync({
          id: editingUser.id,
          data: updateData,
        });
      } else {
        // Criar usuário
        const createPayload: any = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          nome: formData.nome,
          cpf: formData.cpf.replace(/\D/g, ""),
          telefone: formData.telefone.replace(/\D/g, ""),
          ativo: formData.ativo,
          cadastro_completo: formData.cadastro_completo,
          perfil_ids: formData.perfil_ids,
        };

        // Se for GERENTE_UNIDADE, RECEPCIONISTA ou INSTRUTOR, adicionar unidade_id
        const isGerenteSelected = formData.perfil_ids.some((id) => {
          const perfil = perfisDisponiveis.find((p: any) => p.id === id);
          return perfil?.nome?.toUpperCase() === "GERENTE_UNIDADE";
        });

        const isRecepcionistaSelected = formData.perfil_ids.some((id) => {
          const perfil = perfisDisponiveis.find((p: any) => p.id === id);
          return perfil?.nome?.toUpperCase() === "RECEPCIONISTA";
        });

        const isInstrutorSelected = formData.perfil_ids.some((id) => {
          const perfil = perfisDisponiveis.find((p: any) => p.id === id);
          return perfil?.nome?.toUpperCase() === "INSTRUTOR";
        });

        if (
          (isGerenteSelected ||
            isRecepcionistaSelected ||
            isInstrutorSelected) &&
          formData.unidade_id
        ) {
          createPayload.unidade_id = formData.unidade_id;
          console.log(
            "🔗 [UNIDADE] Enviando unidade_id:",
            formData.unidade_id,
            {
              isGerente: isGerenteSelected,
              isRecepcionista: isRecepcionistaSelected,
              isInstrutor: isInstrutorSelected,
            }
          );
        }

        const novoUsuario = await createMutation.mutateAsync(createPayload);

        // Se tem perfil FRANQUEADO e marcou cadastro completo, criar registro na tabela franqueados
        if (isFranqueadoSelecionado && formData.cadastro_completo) {
          try {
            const token = localStorage.getItem("token");
            const franqueadoData = {
              nome: formData.nome_franqueado || formData.nome,
              email: formData.email_franqueado || formData.email,
              telefone:
                formData.telefone_franqueado?.replace(/\D/g, "") ||
                formData.telefone.replace(/\D/g, ""),
              cpf:
                formData.cpf_franqueado?.replace(/\D/g, "") ||
                formData.cpf.replace(/\D/g, ""),
              usuario_id: novoUsuario.id,
              situacao: "ATIVA",
              ativo: true,
            };

            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/franqueados`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(franqueadoData),
            });

            toast.success("Usuário e Franqueado criados com sucesso!");
          } catch (error) {
            console.error("Erro ao criar franqueado:", error);
            toast.error(
              "Usuário criado, mas houve erro ao criar registro de franqueado"
            );
          }
        }
      }
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${nome}"?`)) {
      return;
    }
    await deleteMutation.mutateAsync(id);
  };

  // Filtrar usuários
  const usuariosFiltrados = usuarios.filter((usuario: any) => {
    const matchesSearch =
      usuario.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.cpf?.includes(searchTerm);

    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "ativo" && usuario.ativo) ||
      (statusFilter === "inativo" && !usuario.ativo);

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: usuarios.length,
    ativos: usuarios.filter((u: any) => u.ativo).length,
    inativos: usuarios.filter((u: any) => !u.ativo).length,
  };

  if (loadingUsuarios) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando usuários...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-3 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciamento de Usuários
            </h1>
          </div>
          <p className="text-gray-600">
            Gerencie usuários, perfis e permissões do sistema
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Usuários
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usuários Ativos
              </CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.ativos}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usuários Inativos
              </CardTitle>
              <X className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.inativos}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Ações */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Usuários</CardTitle>
                <CardDescription>
                  Lista de todos os usuários do sistema
                </CardDescription>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Novo Usuário
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="todos">Todos</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                </select>
              </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Perfis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    usuariosFiltrados.map((usuario: any) => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {usuario.nome || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{usuario.username}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="h-3 w-3 mr-1" />
                              {usuario.email || "N/A"}
                            </div>
                            {usuario.telefone && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Phone className="h-3 w-3 mr-1" />
                                {formatPhone(usuario.telefone)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {usuario.perfis?.length > 0 ? (
                              usuario.perfis.map((perfil: any) => (
                                <span
                                  key={perfil.id}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  <Shield className="h-3 w-3 mr-1" />
                                  {perfil.nome}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">
                                Sem perfil
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {usuario.unidade ? (
                            <div className="text-sm text-amber-600 font-medium">
                              📍 {usuario.unidade.nome}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              usuario.ativo
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {usuario.ativo ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            {usuario.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(usuario)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(usuario.id, usuario.nome)
                              }
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Criação/Edição */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingUser ? "Editar Usuário" : "Novo Usuário"}
                </h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) =>
                        setFormData({ ...formData, nome: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.nome
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Digite o nome completo"
                    />
                    {validationErrors.nome && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.nome}
                      </p>
                    )}
                  </div>

                  {/* Username */}
                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({ ...formData, username: e.target.value })
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors.username
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Digite o username"
                      />
                      {validationErrors.username && (
                        <p className="text-red-600 text-sm mt-1">
                          {validationErrors.username}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.email
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="email@exemplo.com"
                    />
                    {validationErrors.email && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.email}
                      </p>
                    )}
                  </div>

                  {/* Senha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingUser
                        ? "Nova Senha (deixe vazio para manter)"
                        : "Senha *"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required={!editingUser}
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          validationErrors.password
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="Digite a senha"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {validationErrors.password && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.password}
                      </p>
                    )}
                  </div>

                  {/* CPF */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={formData.cpf}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cpf: formatCPF(e.target.value),
                        })
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.cpf
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                    {validationErrors.cpf && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.cpf}
                      </p>
                    )}
                  </div>

                  {/* Telefone */}
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
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.telefone
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      placeholder="(11) 99999-9999"
                    />
                    {validationErrors.telefone && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.telefone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Perfis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Perfis de Acesso
                  </label>
                  <div className="space-y-2">
                    {perfisDisponiveis.map((perfil: any) => (
                      <label key={perfil.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.perfil_ids.includes(perfil.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                perfil_ids: [...formData.perfil_ids, perfil.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                perfil_ids: formData.perfil_ids.filter(
                                  (id) => id !== perfil.id
                                ),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {perfil.nome}
                        </span>
                        {perfil.descricao && (
                          <span className="ml-2 text-xs text-gray-500">
                            - {perfil.descricao}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Unidade (para GERENTE_UNIDADE, RECEPCIONISTA e INSTRUTOR) */}
                {formData.perfil_ids.some((id) => {
                  const perfil = perfisDisponiveis.find(
                    (p: any) => p.id === id
                  );
                  const nome = perfil?.nome?.toUpperCase();
                  return (
                    nome === "GERENTE_UNIDADE" ||
                    nome === "RECEPCIONISTA" ||
                    nome === "INSTRUTOR"
                  );
                }) && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidade de Trabalho *
                    </label>
                    <select
                      value={formData.unidade_id || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, unidade_id: e.target.value })
                      }
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma unidade</option>
                      {unidades.map((unidade: any) => (
                        <option key={unidade.id} value={unidade.id}>
                          {unidade.nome} - {unidade.status}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-amber-700 mt-2">
                      {formData.perfil_ids.some((id) => {
                        const perfil = perfisDisponiveis.find(
                          (p: any) => p.id === id
                        );
                        return (
                          perfil?.nome?.toUpperCase() === "GERENTE_UNIDADE"
                        );
                      }) &&
                        "ℹ️ O gerente será vinculado a esta unidade e só poderá gerenciá-la."}
                      {formData.perfil_ids.some((id) => {
                        const perfil = perfisDisponiveis.find(
                          (p: any) => p.id === id
                        );
                        return perfil?.nome?.toUpperCase() === "RECEPCIONISTA";
                      }) && "ℹ️ O recepcionista trabalhará nesta unidade."}
                      {formData.perfil_ids.some((id) => {
                        const perfil = perfisDisponiveis.find(
                          (p: any) => p.id === id
                        );
                        return perfil?.nome?.toUpperCase() === "INSTRUTOR";
                      }) &&
                        "ℹ️ O instrutor/professor trabalhará nesta unidade."}
                    </p>
                  </div>
                )}

                {/* Campos do Franqueado (condicional) */}
                {isFranqueadoSelecionado &&
                  !editingUser &&
                  formData.cadastro_completo && (
                    <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-4">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">
                        Dados do Franqueado
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome da Franquia *
                          </label>
                          <input
                            type="text"
                            value={formData.nome_franqueado || formData.nome}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nome_franqueado: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Nome completo"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            CPF do Franqueado *
                          </label>
                          <input
                            type="text"
                            value={formData.cpf_franqueado || formData.cpf}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                cpf_franqueado: formatCPF(e.target.value),
                              })
                            }
                            maxLength={14}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="000.000.000-00"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email da Franquia *
                          </label>
                          <input
                            type="email"
                            value={formData.email_franqueado || formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email_franqueado: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="email@exemplo.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone da Franquia *
                          </label>
                          <input
                            type="tel"
                            value={
                              formData.telefone_franqueado || formData.telefone
                            }
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                telefone_franqueado: formatPhone(
                                  e.target.value
                                ),
                              })
                            }
                            maxLength={15}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-100 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          ℹ️ Ao marcar "Cadastro Completo" abaixo, será criado
                          automaticamente um registro de franqueado vinculado a
                          este usuário.
                        </p>
                      </div>
                    </div>
                  )}

                {/* Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.ativo}
                        onChange={(e) =>
                          setFormData({ ...formData, ativo: e.target.checked })
                        }
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Usuário ativo
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.cadastro_completo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cadastro_completo: e.target.checked,
                          })
                        }
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Cadastro completo
                      </span>
                    </label>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Salvando..."
                      : editingUser
                      ? "Atualizar"
                      : "Criar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
