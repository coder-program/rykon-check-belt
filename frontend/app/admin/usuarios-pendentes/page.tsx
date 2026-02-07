"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  User,
  Check,
  X,
  Clock,
  Mail,
  Phone,
  Calendar,
  Shield,
  AlertCircle,
  Search,
  Filter,
  Edit,
  Save,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";

interface PendingUser {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  data_nascimento?: string;
  perfis: string[];
  ativo: boolean;
  created_at: string;
  unidade?: {
    id: string;
    nome: string;
    status: string;
  };
}

function AprovacaoUsuariosPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pendentes"); // pendentes, todos, aprovados
  const [editingUser, setEditingUser] = useState<{ id: number; nome: string; email: string; cpf?: string; telefone?: string; status: string } | null>(null);
  const [editingPerson, setEditingPerson] = useState<{ id: number; nome: string; email: string; cpf?: string; telefone?: string } | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "approve" as "approve" | "reject",
    userId: "",
  });
  const [editUserForm, setEditUserForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    status: "PENDENTE",
  });
  const [editPersonForm, setEditPersonForm] = useState({
    cpf: "",
    genero: "",
    unidade_id: "",
    // Professor específico
    faixa_ministrante: "",
    data_inicio_docencia: "",
    registro_profissional: "",
    // Aluno específico
    faixa_atual: "",
    grau_atual: 0,
    data_matricula: "",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_telefone: "",
  });
  const queryClient = useQueryClient();

  // Query separada para estatísticas (busca todos os usuários visíveis para o perfil)
  const { data: allUsersForStats = [], isLoading: isLoadingStats } = useQuery({
    queryKey: ["todos-usuarios-stats"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        console.error("[STATS] Erro na resposta:", response.status);
        throw new Error("Erro ao carregar estatísticas");
      }

      const data = await response.json();
      const stats = data.map((user: { id: number; ativo: boolean }) => ({
        id: user.id,
        ativo: user.ativo,
      }));

      return stats;
    },
  });

  // Query para buscar unidades
  const { data: unidadesData } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/unidades`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao carregar unidades");
      }

      const data = await response.json();
      // A API retorna um objeto com items ou um array direto
      return data;
    },
  });

  // Extrair o array de unidades do objeto retornado
  const unidades = Array.isArray(unidadesData)
    ? unidadesData
    : unidadesData?.items || [];

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["usuarios-pendentes", search, filter],
    queryFn: async () => {
      console.log('\n🔥🔥🔥 [FRONTEND] CARREGANDO USUÁRIOS PENDENTES 🔥🔥🔥');
      console.log('🔍 [FRONTEND] Filtros:', { search, filter });
      
      // Buscar todos os usuários se o filtro for "todos" ou "aprovados"
      const endpoint =
        filter === "pendentes" ? "/usuarios/pendentes/list" : "/usuarios";

      console.log('🌐 [FRONTEND] Endpoint:', endpoint);

      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");
      
      if (userData) {
        const user = JSON.parse(userData);
        console.log('👤 [FRONTEND] Usuário logado:', {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfis: user.perfis
        });
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.error('❌ [FRONTEND] Erro na resposta:', response.status, response.statusText);
        throw new Error("Erro ao carregar usuários");
      }

      const data = await response.json();
      
      console.log('📥 [FRONTEND] Dados recebidos do backend:', {
        total: data.length,
        usuarios: data.map((user: any) => ({
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfis: user.perfis?.map((p: any) => (typeof p === 'string' ? p : p.nome)),
          unidade: user.unidade,
          ativo: user.ativo
        }))
      });

      // Transformar dados para o formato esperado
      const allUsers = data.map((user: {
        id: number;
        nome: string;
        email: string;
        telefone?: string;
        data_nascimento?: string;
        perfis?: Array<{ nome: string } | string>;
        ativo: boolean;
        created_at: string;
        unidade?: any;
      }) => ({
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        data_nascimento: user.data_nascimento,
        perfis: user.perfis?.map((p: { nome: string } | string) => (typeof p === 'string' ? p : p.nome)) || [],
        ativo: user.ativo,
        created_at: user.created_at,
        unidade: user.unidade, // Incluir dados da unidade
      }));

      console.log('🔄 [FRONTEND] Dados transformados:', {
        total: allUsers.length,
        usuarios: allUsers.map(u => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          perfis: u.perfis,
          unidade: u.unidade,
          ativo: u.ativo
        }))
      });

      // Filtrar baseado no estado
      let filtered = allUsers;
      if (filter === "pendentes") {
        filtered = allUsers.filter((u: { ativo: boolean }) => {
          return !u.ativo;
        });
      } else if (filter === "aprovados") {
        filtered = allUsers.filter((u: { ativo: boolean }) => u.ativo);
      }
      // Se filter === "todos", não filtra por status

      console.log('🎯 [FRONTEND] Após filtro por status:', {
        filtro: filter,
        total: filtered.length,
        usuarios: filtered.map(u => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          ativo: u.ativo,
          unidade: u.unidade
        }))
      });

      // Filtrar por busca
      if (search) {
        filtered = filtered.filter(
          (u: { nome: string; email: string }) =>
            u.nome.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        );
        
        console.log('🔎 [FRONTEND] Após filtro por busca:', {
          busca: search,
          total: filtered.length
        });
      }

      console.log('✅ [FRONTEND] Dados finais retornados:', {
        total: filtered.length,
        usuarios: filtered.map(u => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          perfis: u.perfis,
          unidade: u.unidade,
          ativo: u.ativo
        }))
      });

      return filtered;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${userId}/aprovar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao aprovar usuário");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Usuário aprovado com sucesso!", {
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
    },
    onError: () => {
      toast.error("Erro ao aprovar usuário");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${userId}/rejeitar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao rejeitar usuário");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Usuário rejeitado", {
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["usuarios-pendentes"] });
    },
    onError: () => {
      toast.error("Erro ao rejeitar usuário");
    },
  });

  const handleApprove = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Aprovar Usuário",
      message:
        "Tem certeza que deseja aprovar este usuário? Ele terá acesso ao sistema.",
      type: "approve",
      userId,
    });
  };

  const handleReject = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Rejeitar Usuário",
      message:
        "Tem certeza que deseja rejeitar este usuário? Esta ação não pode ser desfeita.",
      type: "reject",
      userId,
    });
  };

  const confirmAction = () => {
    if (confirmModal.type === "approve") {
      approveMutation.mutate(confirmModal.userId);
    } else {
      rejectMutation.mutate(confirmModal.userId);
    }
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  const handleEditUser = async (userId: string) => {
    try {
      // Buscar dados do usuário
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!userResponse.ok) {
        throw new Error("Erro ao carregar dados do usuário");
      }

      const userData = await userResponse.json();

      // Preencher formulário de usuário
      setEditUserForm({
        nome: userData.nome || "",
        email: userData.email || "",
        telefone: userData.telefone || "",
        status: userData.ativo ? "ATIVO" : "PENDENTE",
      });

      setEditingUser(userData);
      setIsUserModalOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar dados do usuário");
      console.error(error);
    }
  };

  const handleEditPersonalData = async (userId: string) => {
    try {
      let personData = null;
      let tipoEncontrado = "";

      // 1. Tentar buscar como aluno
      try {
        const alunoResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/alunos/usuario/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (alunoResponse.ok) {
          personData = await alunoResponse.json();
          tipoEncontrado = "ALUNO";
        }
      } catch (error) {}

      // 2. Se não encontrou como aluno, tentar como professor
      if (!personData) {
        try {
          const professorResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/professores/usuario/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          if (professorResponse.ok) {
            personData = await professorResponse.json();
            tipoEncontrado = "PROFESSOR";
          }
        } catch (error) {}
      }

      // 3. Se não encontrou como professor, tentar como franqueado
      if (!personData) {
        try {
          const franqueadoResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/franqueados/usuario/${userId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          if (franqueadoResponse.ok) {
            personData = await franqueadoResponse.json();
            tipoEncontrado = "FRANQUEADO";
          }
        } catch (error) {}
      }

      // 4. Se ainda não encontrou, verificar se é apenas usuário básico
      if (!personData) {
        // Buscar dados básicos do usuário
        const userResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/usuarios/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (userResponse.ok) {
          const userData = await userResponse.json();
          personData = {
            id: userData.id,
            nome_completo: userData.nome,
            email: userData.email,
            cpf: userData.cpf,
            telefone: userData.telefone,
            data_nascimento: userData.data_nascimento,
            perfis: userData.perfis,
          };
          tipoEncontrado = "USUARIO_BASICO";
        } else {
          throw new Error("Usuário não encontrado no sistema");
        }
      }

      // Adicionar o tipo encontrado
      personData.tipo_cadastro = tipoEncontrado;

      // Preencher formulário de dados pessoais
      setEditPersonForm({
        cpf: personData.cpf || "",
        genero: personData.genero || "",
        unidade_id: personData.unidade_id || "",
        // Professor
        faixa_ministrante: personData.faixa_ministrante || "",
        data_inicio_docencia: personData.data_inicio_docencia || "",
        registro_profissional: personData.registro_profissional || "",
        // Aluno
        faixa_atual: personData.faixa_atual || "",
        grau_atual: personData.grau_atual || 0,
        data_matricula: personData.data_matricula || "",
        responsavel_nome: personData.responsavel_nome || "",
        responsavel_cpf: personData.responsavel_cpf || "",
        responsavel_telefone: personData.responsavel_telefone || "",
      });

      setEditingPerson(personData);
      setIsPersonModalOpen(true);
    } catch (error) {
      toast.error("Erro ao carregar dados pessoais do usuário");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Aprovação de Usuários
          </h1>
          <p className="text-gray-600">
            Gerencie as solicitações de cadastro de novos usuários
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {["pendentes", "todos", "aprovados"].map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                    className="capitalize"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {f}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {(() => {
                  const pendentes = allUsersForStats.filter(
                    (u) => !u.ativo
                  ).length;
                  return pendentes;
                })()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(() => {
                  const aprovados = allUsersForStats.filter(
                    (u) => u.ativo
                  ).length;
                  return aprovados;
                })()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {(() => {
                  return allUsersForStats.length;
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de usuários */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando usuários...</p>
            </div>
          ) : users.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum usuário encontrado
                  </h3>
                  <p className="text-gray-600">
                    {filter === "pendentes"
                      ? "Não há usuários aguardando aprovação no momento."
                      : "Nenhum usuário corresponde aos filtros aplicados."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            users.map((userItem) => (
              <Card
                key={userItem.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          userItem.ativo ? "bg-green-100" : "bg-yellow-100"
                        }`}
                      >
                        <User
                          className={`h-6 w-6 ${
                            userItem.ativo
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {userItem.nome}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              userItem.ativo
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {userItem.ativo ? "Aprovado" : "Pendente"}
                          </span>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {userItem.email}
                          </div>
                          {userItem.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {userItem.telefone}
                            </div>
                          )}
                          {userItem.data_nascimento && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {userItem.data_nascimento.includes("T")
                                ? new Date(
                                    userItem.data_nascimento
                                  ).toLocaleDateString("pt-BR")
                                : new Date(
                                    userItem.data_nascimento + "T00:00:00"
                                  ).toLocaleDateString("pt-BR")}
                            </div>
                          )}
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <Shield className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-500">Perfis:</span>
                            {userItem.perfis && userItem.perfis.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {userItem.perfis.map((perfil: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                  >
                                    {perfil}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-red-500 font-medium">⚠️ Sem perfil</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">📍 Unidade:</span>
                            {userItem.unidade ? (
                              <span className="text-amber-600 font-medium">
                                {userItem.unidade.nome}
                              </span>
                            ) : (
                              <span className="text-red-500 font-medium">⚠️ SEM UNIDADE</span>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            Cadastrado em{" "}
                            {new Date(userItem.created_at).toLocaleDateString(
                              "pt-BR"
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(userItem.id)}
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <User className="h-4 w-4 mr-1" />
                        Usuário
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPersonalData(userItem.id)}
                        className="text-purple-600 border-purple-600 hover:bg-purple-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Dados Pessoais
                      </Button>

                      {!userItem.ativo && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(userItem.id)}
                            disabled={rejectMutation.isPending}
                            className="text-red-600 border-red-600 hover:bg-red-50"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(userItem.id)}
                            disabled={approveMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal de Edição de Usuário */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Consultar Dados do Usuário
              </h2>
              <Button
                variant="outline"
                onClick={() => setIsUserModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Dados apenas para visualização */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-600 mb-3">
                  Dados do Usuário (somente leitura)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Nome Completo
                    </label>
                    <p className="text-sm text-gray-800">{editUserForm.nome}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-800">
                      {editUserForm.email}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Telefone
                    </label>
                    <p className="text-sm text-gray-800">
                      {editUserForm.telefone || "Não informado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campo editável: Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Status do Usuário
                </label>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    editUserForm.status === "ATIVO"
                      ? "bg-green-100 text-green-800"
                      : editUserForm.status === "PENDENTE"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {editUserForm.status === "ATIVO"
                    ? "Ativo"
                    : editUserForm.status === "PENDENTE"
                    ? "Pendente"
                    : "Inativo"}
                </span>
              </div>

              {/* Botão de Ação */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() => setIsUserModalOpen(false)}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Dados Pessoais */}
      {isPersonModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Consultar Dados Pessoais
              </h2>
              <Button
                variant="outline"
                onClick={() => setIsPersonModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Informações Pessoais Básicas - somente leitura */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-800 mb-3">
                  Informações Pessoais (somente leitura)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Nome Completo
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.nome_completo || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      CPF
                    </label>
                    <p className="text-sm text-gray-800">
                      {editPersonForm.cpf || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Data de Nascimento
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.data_nascimento
                        ? editingPerson.data_nascimento.includes("T")
                          ? new Date(
                              editingPerson.data_nascimento
                            ).toLocaleDateString("pt-BR")
                          : new Date(
                              editingPerson.data_nascimento + "T00:00:00"
                            ).toLocaleDateString("pt-BR")
                        : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Gênero
                    </label>
                    <p className="text-sm text-gray-800">
                      {editPersonForm.genero === "MASCULINO"
                        ? "Masculino"
                        : editPersonForm.genero === "FEMININO"
                        ? "Feminino"
                        : editPersonForm.genero === "OUTRO"
                        ? "Outro"
                        : "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.email || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Telefone
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.telefone || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Status do Aluno
                    </label>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        editingPerson?.status === "ATIVO"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {editingPerson?.status || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Número de Matrícula
                    </label>
                    <p className="text-sm text-gray-800">
                      {editingPerson?.numero_matricula || "Não gerado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campos específicos por tipo - desabilitados */}
              {editingPerson?.tipo_cadastro === "PROFESSOR" && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-3">
                    Dados do Professor (somente leitura)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Início Docência
                      </label>
                      <Input
                        type="date"
                        value={editPersonForm.data_inicio_docencia || ""}
                        disabled
                        className="bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Registro Profissional
                      </label>
                      <Input
                        value={editPersonForm.registro_profissional || ""}
                        disabled
                        className="bg-gray-100 text-gray-600"
                        placeholder="Número do registro"
                      />
                    </div>
                  </div>
                </div>
              )}

              {editingPerson?.tipo_cadastro === "ALUNO" && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800 mb-3">
                    Dados do Aluno (somente leitura)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Faixa Atual
                      </label>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          editPersonForm.faixa_atual
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {editPersonForm.faixa_atual || "Não informado"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Graus
                      </label>
                      <p className="text-sm text-gray-800">
                        {editPersonForm.grau_atual || "0"} graus
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Data Matrícula
                      </label>
                      <p className="text-sm text-gray-800">
                        {editPersonForm.data_matricula
                          ? new Date(
                              editPersonForm.data_matricula
                            ).toLocaleDateString("pt-BR")
                          : "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Última Graduação
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.data_ultima_graduacao
                          ? new Date(
                              editingPerson.data_ultima_graduacao
                            ).toLocaleDateString("pt-BR")
                          : "Nunca graduou"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Telefone de Emergência
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.telefone_emergencia || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Contato de Emergência
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.nome_contato_emergencia ||
                          "Não informado"}
                      </p>
                    </div>
                  </div>

                  {(editPersonForm.responsavel_nome ||
                    editPersonForm.responsavel_cpf ||
                    editPersonForm.responsavel_telefone) && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <h4 className="text-xs font-medium text-green-700 mb-2">
                        Dados do Responsável (Menor de Idade)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Nome do Responsável
                          </label>
                          <p className="text-sm text-gray-800">
                            {editPersonForm.responsavel_nome || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            CPF do Responsável
                          </label>
                          <p className="text-sm text-gray-800">
                            {editPersonForm.responsavel_cpf || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Telefone do Responsável
                          </label>
                          <p className="text-sm text-gray-800">
                            {editPersonForm.responsavel_telefone ||
                              "Não informado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {editingPerson?.tipo_cadastro === "FRANQUEADO" && (
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-800 mb-3">
                    Dados do Franqueado (somente leitura)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Nome da Franquia
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.nome || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Nome Fantasia
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.nome_fantasia || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Situação
                      </label>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          editingPerson?.situacao === "ATIVA"
                            ? "bg-green-100 text-green-800"
                            : editingPerson?.situacao === "EM_HOMOLOGACAO"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {editingPerson?.situacao || "Não informado"}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        CNPJ
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.cnpj || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Telefone Comercial
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.telefone_comercial || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Data do Contrato
                      </label>
                      <p className="text-sm text-gray-800">
                        {editingPerson?.data_contrato
                          ? new Date(
                              editingPerson.data_contrato
                            ).toLocaleDateString("pt-BR")
                          : "Não informado"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {editingPerson?.tipo_cadastro === "USUARIO_BASICO" && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-800 mb-3">
                    Usuário Básico (sem dados pessoais específicos)
                  </h3>
                  <div className="text-center py-4">
                    <p className="text-gray-600">
                      Este usuário foi cadastrado apenas com dados básicos.
                      <br />
                      Para adicionar mais informações, promova-o para um perfil
                      específico (Aluno, Professor ou Franqueado).
                    </p>
                  </div>
                </div>
              )}

              {/* Informações Adicionais (somente leitura) */}
              {(editingPerson?.tipo_cadastro === "ALUNO" ||
                editingPerson?.tipo_cadastro === "PROFESSOR" ||
                editingPerson?.tipo_cadastro === "USUARIO_BASICO") && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-3">
                    Informações Adicionais (somente leitura)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Campo Unidade (somente leitura para alunos e professores) */}
                    {(editingPerson?.tipo_cadastro === "ALUNO" ||
                      editingPerson?.tipo_cadastro === "PROFESSOR") && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Unidade
                        </label>
                        <p className="text-sm text-gray-800">
                          {(() => {
                            const unidade = Array.isArray(unidades)
                              ? unidades.find(
                                  (u: { id: number; nome: string }) => u.id === editingPerson?.unidade_id
                                )
                              : null;
                            return (
                              unidade?.nome ||
                              editingPerson?.unidade?.nome ||
                              "Não informado"
                            );
                          })()}
                        </p>
                      </div>
                    )}

                    {/* Campo Faixa - condicional baseado no tipo */}
                    {editingPerson?.tipo_cadastro === "ALUNO" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Faixa Atual
                        </label>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            editingPerson?.faixa_atual
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {editingPerson?.faixa_atual || "Não informado"}
                        </span>
                      </div>
                    )}

                    {editingPerson?.tipo_cadastro === "PROFESSOR" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Faixa Ministrante
                        </label>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            editingPerson?.faixa_ministrante
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {editingPerson?.faixa_ministrante || "Não informado"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botão de Ação */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={() => setIsPersonModalOpen(false)}
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Moderno */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all">
            <div className="text-center">
              {/* Ícone baseado no tipo */}
              <div
                className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 ${
                  confirmModal.type === "approve"
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                {confirmModal.type === "approve" ? (
                  <svg
                    className="h-8 w-8 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>

              {/* Título */}
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {confirmModal.title}
              </h3>

              {/* Mensagem */}
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                {confirmModal.message}
              </p>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={closeConfirmModal}
                  className="px-6 py-3 text-gray-700 border-gray-300 hover:bg-gray-50 rounded-xl font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmAction}
                  className={`px-6 py-3 rounded-xl font-medium text-white transition-colors ${
                    confirmModal.type === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {confirmModal.type === "approve" ? "Aprovar" : "Rejeitar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtectedAprovacaoUsuariosPage() {
  return (
    <ProtectedRoute
      requiredPerfis={[
        "master",
        "franqueado",
        "gerente_unidade",
        "recepcionista",
      ]}
    >
      <AprovacaoUsuariosPage />
    </ProtectedRoute>
  );
}
