"use client";

import React, { useState, useEffect } from "react";
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
  // Remove tudo que não é dígito
  const cleaned = value.replace(/\D/g, "");

  // Limita a 11 dígitos
  const limited = cleaned.slice(0, 11);

  // Formata conforme a quantidade de dígitos
  if (limited.length === 11) {
    return limited.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (limited.length === 10) {
    return limited.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  } else if (limited.length >= 6) {
    return limited.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else if (limited.length >= 2) {
    return limited.replace(/(\d{2})(\d{0,5})/, "($1) $2");
  }

  // Retorna apenas os dígitos se ainda não tem 2 caracteres
  return limited;
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
  foto?: string; // URL ou base64 da foto
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
  perfil_ids?: string;
}

export default function UsuariosManagerNew() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "todos" | "ativo" | "inativo"
  >("todos");
  const [perfilFilter, setPerfilFilter] = useState<string>("todos");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
    foto: "", // Inicializar vazio
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

  // Queries
  const { data: usuarios = [], isLoading: loadingUsuarios } = useQuery({
    queryKey: ["usuarios"],
    queryFn: getUsuarios,
  });

  const { data: perfis = [] } = useQuery({
    queryKey: ["perfis"],
    queryFn: getPerfis,
  });

  // Buscar unidades do franqueado ou gerente logado
  const { data: unidades = [], isLoading: isLoadingUnidades } = useQuery({
    queryKey: ["unidades-franqueado"],
    queryFn: async () => {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
        }/unidades?status=ATIVA`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) {
        console.error(
          "❌ [UsuariosManager] Erro ao buscar unidades:",
          response.status
        );
        throw new Error("Erro ao buscar unidades");
      }
      const data = await response.json();
      // Filtrar apenas unidades ATIVAS
      const items = data.items || [];
      const unidadesAtivas = items.filter(
        (unidade: any) => unidade.status === "ATIVA"
      );
      return unidadesAtivas;
    },
    enabled: !!user && (isFranqueado || isGerenteUnidade), // Busca se for franqueado OU gerente
  });

  // Filtrar perfis disponíveis baseado no perfil do usuário logado (para criação de usuários)
  const perfisDisponiveis = perfis.filter((perfil: any) => {
    const nomePerfil = perfil.nome?.toUpperCase();

    // Se não conseguiu detectar o usuário, NÃO mostrar perfis (segurança)
    if (!user || !user.perfis || user.perfis.length === 0) {
      return false;
    }

    // MASTER pode criar qualquer perfil
    if (isMaster) {
      return true;
    }

    // FRANQUEADO pode criar apenas estes perfis:
    // REMOVIDO: ALUNO e RESPONSAVEL (eles se cadastram pela tela pública)
    if (isFranqueado) {
      const permitido = [
        "GERENTE_UNIDADE",
        "RECEPCIONISTA",
        "INSTRUTOR",
      ].includes(nomePerfil);
      return permitido;
    }

    // GERENTE_UNIDADE pode criar apenas estes perfis:
    // REMOVIDO: ALUNO e RESPONSAVEL (eles se cadastram pela tela pública)
    if (isGerenteUnidade) {
      const permitido = ["RECEPCIONISTA", "INSTRUTOR"].includes(nomePerfil);
      return permitido;
    }

    // Se não for MASTER, FRANQUEADO nem GERENTE_UNIDADE, NÃO pode criar usuários
    return false;
  });

  // Perfis para o filtro de visualização (adiciona ALUNO e INSTRUTOR aos perfis que o usuário pode criar)
  const perfisParaFiltro = perfis.filter((perfil: any) => {
    const nomePerfil = perfil.nome?.toUpperCase();

    // Se for MASTER, mostra todos os perfis
    if (isMaster) {
      return true;
    }

    // Para FRANQUEADO e GERENTE_UNIDADE, mostra os perfis que podem criar + ALUNO + INSTRUTOR
    if (isFranqueado || isGerenteUnidade) {
      const perfisVisiveis = [
        "GERENTE_UNIDADE",
        "RECEPCIONISTA",
        "INSTRUTOR",
        "ALUNO",
        "RESPONSAVEL",
      ];
      return perfisVisiveis.includes(nomePerfil);
    }

    return false;
  });

  // Detectar se perfil FRANQUEADO está selecionado
  const perfilFranqueadoId = perfis.find(
    (p: any) => p.nome?.toUpperCase() === "FRANQUEADO"
  )?.id;
  const isFranqueadoSelecionado = formData.perfil_ids.includes(
    perfilFranqueadoId || ""
  );

  // Detectar GERENTE_UNIDADE selecionado
  const perfilGerenteUnidadeId = perfis.find(
    (p: any) => p.nome?.toUpperCase() === "GERENTE_UNIDADE"
  )?.id;
  const isGerenteUnidadeSelecionado = formData.perfil_ids.includes(
    perfilGerenteUnidadeId || ""
  );

  // Detectar RECEPCIONISTA selecionado
  const perfilRecepcionistaId = perfis.find(
    (p: any) => p.nome?.toUpperCase() === "RECEPCIONISTA"
  )?.id;
  const isRecepcionistaSelecionado = formData.perfil_ids.includes(
    perfilRecepcionistaId || ""
  );

  // Detectar INSTRUTOR selecionado
  const perfilInstrutorId = perfis.find(
    (p: any) => p.nome?.toUpperCase() === "INSTRUTOR"
  )?.id;
  const isInstrutorSelecionado = formData.perfil_ids.includes(
    perfilInstrutorId || ""
  );

  // Verificar se algum perfil que precisa de cadastro completo está selecionado
  const precisaCadastroCompleto =
    isFranqueadoSelecionado ||
    isGerenteUnidadeSelecionado ||
    isRecepcionistaSelecionado ||
    isInstrutorSelecionado;

  // Auto-preencher unidade_id quando gerente está criando usuário
  useEffect(() => {
    if (
      isGerenteUnidade &&
      unidades.length > 0 &&
      !formData.unidade_id &&
      !editingUser
    ) {
      setFormData((prev) => ({ ...prev, unidade_id: unidades[0].id }));
    }
  }, [isGerenteUnidade, unidades, formData.unidade_id, editingUser]);

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

  // Auto-selecionar unidade para GERENTE_UNIDADE ao abrir modal de criação
  React.useEffect(() => {
    // Só aplicar quando modal está aberto E criando novo usuário (não editando)
    if (showModal && !editingUser && isGerenteUnidade) {
      // GERENTE_UNIDADE tem sua unidade disponível no objeto user
      if (user?.unidade?.id) {
        setFormData((prev) => ({
          ...prev,
          unidade_id: user.unidade.id,
        }));
      }
    }
  }, [showModal, editingUser, isGerenteUnidade, user]);

  // Validação em tempo real para CPF
  const validateCPFRealTime = (cpf: string) => {
    const newErrors = { ...validationErrors };

    if (cpf && !isValidCPF(cpf)) {
      newErrors.cpf = "CPF inválido";
    } else {
      delete newErrors.cpf;
    }

    setValidationErrors(newErrors);
  };

  // Validação em tempo real para telefone
  const validatePhoneRealTime = (telefone: string) => {
    const newErrors = { ...validationErrors };

    if (telefone && !isValidPhone(telefone)) {
      newErrors.telefone = "Telefone deve ter 10 ou 11 dígitos";
    } else {
      delete newErrors.telefone;
    }

    setValidationErrors(newErrors);
  };

  // Validação do formulário
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // NOME COMPLETO: apenas letras, espaços, apóstrofos e hífens
    if (!formData.nome.trim()) {
      errors.nome = "Nome é obrigatório";
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(formData.nome)) {
      errors.nome = "Nome deve conter apenas letras";
    }

    // EMAIL: apenas letras, números, underline (_) e ponto (.)
    if (!formData.email.trim()) {
      errors.email = "Email é obrigatório";
    } else if (
      !/^[a-zA-Z0-9_.]+@[a-zA-Z0-9_.]+\.[a-zA-Z]{2,}$/.test(formData.email)
    ) {
      errors.email = "Email inválido. Use apenas letras, números, _ e .";
    }

    // USERNAME: máximo 15 caracteres, letras, números e caracteres especiais
    if (!formData.username.trim()) {
      errors.username = "Username é obrigatório";
    } else if (formData.username.length > 15) {
      errors.username = "Username deve ter no máximo 15 caracteres";
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

    // Validação obrigatória: pelo menos um perfil deve ser selecionado
    if (formData.perfil_ids.length === 0) {
      errors.perfil_ids = "Selecione pelo menos um perfil de acesso";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = (user?: any) => {
    if (user) {
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
        unidade_id: user.unidade?.id || "",
        foto: user.foto || "",
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
        foto: "", // Garantir campo vazio para criação
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
        const updateData: any = {
          email: formData.email,
          nome: formData.nome,
          cpf: formData.cpf.replace(/\D/g, ""),
          telefone: formData.telefone.replace(/\D/g, ""),
          ativo: formData.ativo,
          cadastro_completo: formData.cadastro_completo,
          perfil_ids: formData.perfil_ids,
          foto: formData.foto || null, // Incluir foto
        };

        if (formData.unidade_id) {
          updateData.unidade_id = formData.unidade_id;
        }

        if (formData.password.trim()) {
          updateData.password = formData.password;
        }

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
          foto: formData.foto || null, // ✅ Incluir foto
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
              // Não enviar situacao - backend decide (MASTER cria ATIVA, outros EM_HOMOLOGACAO)
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

    const matchesPerfil =
      perfilFilter === "todos" ||
      usuario.perfis?.some((perfil: any) => perfil.id === perfilFilter);

    return matchesSearch && matchesStatus && matchesPerfil;
  });

  // Paginação
  const totalPages = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const usuariosPaginados = usuariosFiltrados.slice(startIndex, endIndex);

  // Reset para página 1 quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, perfilFilter]);

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
                  <option value="todos">Todos Status</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                </select>

                <select
                  value={perfilFilter}
                  onChange={(e) => setPerfilFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                >
                  <option value="todos">Todos Perfis</option>
                  {perfisParaFiltro.map((perfil: any) => (
                    <option key={perfil.id} value={perfil.id}>
                      {perfil.nome}
                    </option>
                  ))}
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
                    usuariosPaginados.map((usuario: any) => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {/* Foto do Usuário */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                              {usuario.foto ? (
                                <img
                                  src={usuario.foto}
                                  alt={usuario.nome}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                usuario.nome?.charAt(0).toUpperCase() || "?"
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {usuario.nome || "N/A"}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{usuario.username}
                              </div>
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
                              title="Editar usuário"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {/* Não mostrar botão de exclusão para o próprio usuário logado */}
                            {user?.id !== usuario.id && (
                              <button
                                onClick={() =>
                                  handleDelete(usuario.id, usuario.nome)
                                }
                                className="text-red-600 hover:text-red-900"
                                title="Excluir usuário"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <div className="text-sm text-gray-700">
                  Mostrando{" "}
                  <span className="font-medium">{startIndex + 1}</span> a{" "}
                  <span className="font-medium">
                    {Math.min(endIndex, usuariosFiltrados.length)}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium">
                    {usuariosFiltrados.length}
                  </span>{" "}
                  usuários
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        // Mostra primeira, última e páginas próximas à atual
                        return (
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 2 && page <= currentPage + 2)
                        );
                      })
                      .map((page, index, array) => {
                        // Adiciona "..." entre páginas não consecutivas
                        const showEllipsis =
                          index > 0 && page - array[index - 1] > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="px-2 text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-2 text-sm rounded-lg ${
                                currentPage === page
                                  ? "bg-blue-600 text-white"
                                  : "border border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
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
                      onChange={(e) => {
                        // Permitir apenas letras, espaços, apóstrofos e hífens
                        const value = e.target.value.replace(
                          /[^a-zA-ZÀ-ÿ\s'-]/g,
                          ""
                        );
                        setFormData({ ...formData, nome: value });
                      }}
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

                  {/* Foto de Perfil */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto de Perfil
                    </label>
                    <div className="flex items-center gap-4">
                      {/* Preview da Foto */}
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl overflow-hidden flex-shrink-0">
                        {formData.foto ? (
                          <img
                            src={formData.foto}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          formData.nome.charAt(0).toUpperCase() || "?"
                        )}
                      </div>

                      {/* Input de Foto */}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Validar tamanho (máx 2MB)
                              if (file.size > 2 * 1024 * 1024) {
                                alert("A foto deve ter no máximo 2MB");
                                return;
                              }

                              // Converter para base64
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({
                                  ...formData,
                                  foto: reader.result as string,
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="foto-input"
                        />
                        <label
                          htmlFor="foto-input"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors text-sm"
                        >
                          Escolher Foto
                        </label>
                        {formData.foto && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, foto: "" })
                            }
                            className="ml-2 inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-colors text-sm"
                          >
                            Remover
                          </button>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          JPG, PNG ou WEBP. Máximo 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username * (máx. 15 caracteres)
                      {editingUser && (
                        <span className="text-xs text-gray-500 ml-2">
                          (não pode ser alterado)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required={!editingUser}
                      maxLength={15}
                      value={formData.username}
                      onChange={(e) => {
                        if (!editingUser) {
                          // Limitar a 15 caracteres
                          const value = e.target.value.slice(0, 15);
                          setFormData({ ...formData, username: value });
                        }
                      }}
                      disabled={editingUser}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        editingUser
                          ? "bg-gray-100 cursor-not-allowed"
                          : validationErrors.username
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

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => {
                        // Permitir apenas letras, números, _, . e @
                        const value = e.target.value.replace(
                          /[^a-zA-Z0-9_.@]/g,
                          ""
                        );
                        setFormData({ ...formData, email: value });
                      }}
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
                      onChange={(e) => {
                        const newCPF = formatCPF(e.target.value);
                        setFormData({
                          ...formData,
                          cpf: newCPF,
                        });
                        validateCPFRealTime(newCPF);
                      }}
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
                      onChange={(e) => {
                        const newTelefone = formatPhone(e.target.value);
                        setFormData({
                          ...formData,
                          telefone: newTelefone,
                        });
                        validatePhoneRealTime(newTelefone);
                      }}
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
                    Perfis de Acesso <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">
                      (Selecione apenas um perfil)
                    </span>
                  </label>
                  <div className="space-y-2">
                    {perfisDisponiveis.map((perfil: any) => (
                      <label key={perfil.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.perfil_ids.includes(perfil.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Permite apenas UM perfil selecionado
                              setFormData({
                                ...formData,
                                perfil_ids: [perfil.id], // Substitui qualquer perfil anterior
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
                  {validationErrors.perfil_ids && (
                    <p className="text-red-600 text-sm mt-2">
                      {validationErrors.perfil_ids}
                    </p>
                  )}
                  {!validationErrors.perfil_ids &&
                    formData.perfil_ids.length === 0 && (
                      <p className="text-amber-600 text-sm mt-2">
                        ⚠️ Selecione um perfil de acesso
                      </p>
                    )}
                </div>

                {/* Unidade (para GERENTE_UNIDADE, RECEPCIONISTA, INSTRUTOR e TABLET_CHECKIN) */}
                {formData.perfil_ids.some((id) => {
                  const perfil = perfisDisponiveis.find(
                    (p: any) => p.id === id
                  );
                  const nome = perfil?.nome?.toUpperCase();
                  return (
                    nome === "GERENTE_UNIDADE" ||
                    nome === "RECEPCIONISTA" ||
                    nome === "INSTRUTOR" ||
                    nome === "TABLET_CHECKIN"
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
                      disabled={isGerenteUnidade || isLoadingUnidades} // GERENTE só cria para sua unidade
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {isLoadingUnidades ? (
                        <option value="">Carregando unidades...</option>
                      ) : unidades.length === 0 ? (
                        <option value="">Nenhuma unidade disponível</option>
                      ) : (
                        <>
                          <option value="">Selecione uma unidade</option>
                          {unidades.map((unidade: any) => (
                            <option key={unidade.id} value={unidade.id}>
                              {unidade.nome}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                    <p className="text-xs text-amber-700 mt-2">
                      {isLoadingUnidades && (
                        <span className="block mb-1 animate-pulse">
                          ⏳ Carregando unidades disponíveis...
                        </span>
                      )}
                      {isGerenteUnidade && !editingUser && (
                        <span className="block mb-1">
                          🔒 Você só pode criar usuários para sua unidade (
                          {user?.unidade?.nome || "carregando..."})
                        </span>
                      )}
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
                      {formData.perfil_ids.some((id) => {
                        const perfil = perfisDisponiveis.find(
                          (p: any) => p.id === id
                        );
                        return perfil?.nome?.toUpperCase() === "TABLET_CHECKIN";
                      }) &&
                        "📱 O tablet ficará fixo nesta unidade e verá apenas alunos dela."}
                    </p>
                  </div>
                )}

                {/* Campos do Franqueado (condicional) */}
                {isFranqueadoSelecionado && formData.cadastro_completo && (
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
                              telefone_franqueado: formatPhone(e.target.value),
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

                {/* Campos do Gerente de Unidade (condicional) */}
                {isGerenteUnidadeSelecionado && formData.cadastro_completo && (
                  <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg space-y-4">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">
                      Dados do Gerente de Unidade
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nome: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="Nome completo do gerente"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF *
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
                          maxLength={14}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              email: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="email@exemplo.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone *
                        </label>
                        <input
                          type="tel"
                          value={formData.telefone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              telefone: formatPhone(e.target.value),
                            })
                          }
                          maxLength={15}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <div className="bg-green-100 p-3 rounded-lg">
                      <p className="text-sm text-green-800">
                        ℹ️ O gerente será responsável por administrar a unidade
                        selecionada acima.
                      </p>
                    </div>
                  </div>
                )}

                {/* Campos do Recepcionista (condicional) */}
                {isRecepcionistaSelecionado && formData.cadastro_completo && (
                  <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-4">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">
                      Dados do Recepcionista
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nome: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="Nome completo"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF *
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
                          maxLength={14}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone *
                        </label>
                        <input
                          type="tel"
                          value={formData.telefone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              telefone: formatPhone(e.target.value),
                            })
                          }
                          maxLength={15}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <div className="bg-purple-100 p-3 rounded-lg">
                      <p className="text-sm text-purple-800">
                        ℹ️ O recepcionista terá acesso a cadastros básicos e
                        atendimento.
                      </p>
                    </div>
                  </div>
                )}

                {/* Campos do Instrutor (condicional) */}
                {isInstrutorSelecionado && formData.cadastro_completo && (
                  <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg space-y-4">
                    <h3 className="text-lg font-semibold text-orange-900 mb-4">
                      Dados do Instrutor/Professor
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          value={formData.nome}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              nome: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="Nome completo"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          CPF *
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
                          maxLength={14}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefone *
                        </label>
                        <input
                          type="tel"
                          value={formData.telefone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              telefone: formatPhone(e.target.value),
                            })
                          }
                          maxLength={15}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <div className="bg-orange-100 p-3 rounded-lg">
                      <p className="text-sm text-orange-800">
                        ℹ️ O instrutor poderá gerenciar aulas e alunos da
                        unidade.
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
